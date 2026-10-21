import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";
import { verifyPassword } from "@/lib/auth/password";
import { isLoginLocked, recordFailedLogin, clearFailedLogin } from "@/lib/rate-limit/memory";
import {
  checkUserLockout,
  recordFailedLoginPersistent,
  clearFailedLoginPersistent,
} from "@/lib/auth/persistent-lockout";
import GoogleProvider from "next-auth/providers/google";

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const hasGoogleAuth = Boolean(googleClientId && googleClientSecret);

export const authOptions: NextAuthOptions = {
  providers: [
    ...(hasGoogleAuth
      ? [
          GoogleProvider({
            clientId: googleClientId as string,
            clientSecret: googleClientSecret as string,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        // Disallow identical or containing email as password (Finding #06)
        const cleanPass = password.trim().toLowerCase();
        if (cleanPass === email || cleanPass.includes(email)) {
          throw new Error("Default weak credentials disallowed. Please reset your password.");
        }

        await connectDB();

        // 1. Check persistent lockout first (concurrency & multi-instance safe)
        const persistentStatus = await checkUserLockout(email);
        if (persistentStatus.locked) {
          const minutesLeft = Math.ceil(persistentStatus.retryAfterMs / 60000);
          throw new Error(
            `AccountLocked: Account is temporarily locked due to multiple failed login attempts. Try again in ${minutesLeft} minute(s).`
          );
        }

        // 2. In-memory check fallback
        const lockKey = `login:${email}`;
        const memStatus = isLoginLocked(lockKey);
        if (memStatus.locked) {
          const minutesLeft = Math.ceil(memStatus.retryAfterMs / 60000);
          throw new Error(
            `AccountLocked: Account is temporarily locked due to multiple failed login attempts. Try again in ${minutesLeft} minute(s).`
          );
        }

        const user = await UserModel.findOne({ email }).select("+password +failedLoginAttempts +lockoutUntil");
        if (!user || !user.isActive) {
          await recordFailedLoginPersistent(email);
          recordFailedLogin(lockKey);
          return null;
        }

        // Check user model lockout field as additional guard
        if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
          const remainingMinutes = Math.max(
            1,
            Math.ceil((new Date(user.lockoutUntil).getTime() - Date.now()) / (60 * 1000))
          );
          throw new Error(
            `AccountLocked: Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute${
              remainingMinutes > 1 ? "s" : ""
            }.`
          );
        }

        const valid = await verifyPassword(password, user.password);
        if (!valid) {
          const result = await recordFailedLoginPersistent(email);
          recordFailedLogin(lockKey);
          if (result.locked) {
            throw new Error(
              "AccountLocked: Account is temporarily locked due to multiple failed login attempts. Please try again in 15 minutes."
            );
          }
          return null;
        }

        // Reset failed login attempts upon successful authentication
        await clearFailedLoginPersistent(email);
        clearFailedLogin(lockKey);

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && hasGoogleAuth) {
        await connectDB();
        const existingUser = await UserModel.findOne({ email: user.email?.trim().toLowerCase() });
        if (!existingUser || !existingUser.isActive) {
          return "/login?error=AccessDenied";
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && hasGoogleAuth) {
        await connectDB();
        const dbUser = await UserModel.findOne({ email: user.email?.trim().toLowerCase() });
        if (dbUser) {
          token.role = dbUser.role as string;
          token.sub = dbUser._id.toString();
        }
      } else if (user && "role" in user) {
        token.role = user.role as string;
        token.sub = user.id;
      } else if (token.sub) {
        try {
          await connectDB();
          const dbUser = await UserModel.findById(token.sub).select("role").lean();
          if (dbUser && dbUser.role) {
            token.role = dbUser.role as string;
          }
        } catch {
          // Keep existing token.role if DB check encounters transient error
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as string) ?? "employee";
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
};
