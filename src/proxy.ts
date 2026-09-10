import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const path = req.nextUrl.pathname;
    const role = req.nextauth.token?.role as string | undefined;

    if (path.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/employee", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ req, token }) {
        const path = req.nextUrl.pathname;
        if (path.startsWith("/admin") || path.startsWith("/employee")) {
          return !!token;
        }
        return true;
      },
    },
    secret: process.env.NEXTAUTH_SECRET,
  }
);

export const config = {
  matcher: ["/admin/:path*", "/employee/:path*"],
};
