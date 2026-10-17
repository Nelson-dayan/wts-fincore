import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";
import { verifyPassword } from "@/lib/auth/password";
import { isLoginLocked, recordFailedLogin, clearFailedLogin } from "@/lib/rate-limit/memory";
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

        // Disallow identical email as password (Finding #06)
        if (password.trim().toLowerCase() === email) {
          throw new Error("Default weak credentials disallowed. Please reset your password.");
        }

        const lockKey = `login:${email}`;
        const lockStatus = isLoginLocked(lockKey);
        if (lockStatus.locked) {
          const minutesLeft = Math.ceil(lockStatus.retryAfterMs / 60000);
          throw new Error(`Account temporarily locked due to multiple failed login attempts. Try again in ${minutesLeft} minute(s).`);
        }

        await connectDB();
        const user = await UserModel.findOne({ email }).select("+password");
        if (!user?.isActive) {
          recordFailedLogin(lockKey);
          return null;
        }

        const valid = await verifyPassword(password, user.password);
        if (!valid) {
          recordFailedLogin(lockKey);
          return null;
        }

        // Reset failed login attempts upon successful authentication
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
