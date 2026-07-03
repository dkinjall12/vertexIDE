import { NextRequest, NextResponse } from "next/server";

// Route constants are inlined here so the Edge middleware bundle has no external
// module references.
const DEFAULT_LOGIN_REDIRECT = "/";
const apiAuthPrefix = "/api/auth";
const publicRoutes: string[] = ["/"];
const authRoutes: string[] = ["/auth/sign-in"];

// Auth.js (next-auth v5) session cookie names for the JWT strategy. Large JWTs
// are split into ".0", ".1" chunks, so we match by prefix as well.
const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

// NOTE: We intentionally do NOT import `next-auth` here. Running NextAuth() in
// the Edge middleware pulls Node-only code (referencing `__dirname`) into the
// Edge bundle, which crashes on Vercel (MIDDLEWARE_INVOCATION_FAILED). Instead
// we do a lightweight cookie-presence check; full session verification still
// happens server-side via auth() in server components and actions.
function hasSessionCookie(req: NextRequest): boolean {
  return req.cookies.getAll().some((cookie) =>
    SESSION_COOKIE_NAMES.some(
      (name) => cookie.name === name || cookie.name.startsWith(`${name}.`)
    )
  );
}

export default function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const isLoggedIn = hasSessionCookie(req);

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth/sign-in", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
