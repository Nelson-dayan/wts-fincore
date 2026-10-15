import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models";
import { verifyPassword } from "@/lib/auth/password";
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

        await connectDB();
        const user = await UserModel.findOne({ email }).select("+password");
        if (!user || !user.isActive) return null;

        // Check account lockout status (5 consecutive failed attempts = 15 minute lock)
        if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
          const remainingMinutes = Math.max(
            1,
            Math.ceil(
              (new Date(user.lockoutUntil).getTime() - Date.now()) / (60 * 1000)
            )
          );
          throw new Error(
            `AccountLocked: Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute${
              remainingMinutes > 1 ? "s" : ""
            }.`
          );
        }

        const valid = await verifyPassword(password, user.password);
        if (!valid) {
          const attempts = (user.failedLoginAttempts || 0) + 1;
          const MAX_FAILED_ATTEMPTS = 5;
          const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

          if (attempts >= MAX_FAILED_ATTEMPTS) {
            const lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
            await UserModel.updateOne(
              { _id: user._id },
              { $set: { failedLoginAttempts: attempts, lockoutUntil } }
            );
            throw new Error(
              "AccountLocked: Account is temporarily locked due to multiple failed login attempts. Please try again in 15 minutes."
            );
          } else {
            await UserModel.updateOne(
              { _id: user._id },
              { $set: { failedLoginAttempts: attempts } }
            );
            return null;
          }
        }

        // Reset failed login tracking on successful authentication
        if ((user.failedLoginAttempts ?? 0) > 0 || user.lockoutUntil) {
          await UserModel.updateOne(
            { _id: user._id },
            { $set: { failedLoginAttempts: 0, lockoutUntil: null } }
          );
        }

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
