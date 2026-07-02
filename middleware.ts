import NextAuth from "next-auth";
import authConfig from "./auth.config";

// Route constants are inlined here (rather than imported from "@/routes") so the
// Edge middleware bundle has no external module references, which Vercel's Edge
// Runtime bundler flags as "unsupported modules".
const DEFAULT_LOGIN_REDIRECT = "/";
const apiAuthPrefix = "/api/auth";
const publicRoutes: string[] = ["/"];
const authRoutes: string[] = ["/auth/sign-in"];

const { auth } = NextAuth(authConfig);

// @ts-ignore
export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);

  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);

  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  if (isApiAuthRoute) {
    return null;
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
    }
    return null;
  }

  if(!isLoggedIn && !isPublicRoute){
    return Response.redirect(new URL("/auth/sign-in" , nextUrl))
  }

  return null
});

export const config = {
  // copied from clerk
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
