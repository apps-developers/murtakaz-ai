import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["en", "ar"];
const defaultLocale = "ar";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if there is any supported locale in the pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  const locale = pathnameHasLocale ? pathname.split("/").filter(Boolean)[0] : defaultLocale;

  if (!pathnameHasLocale) {
    request.nextUrl.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  const canonicalPath = pathname.replace(new RegExp(`^/${locale}`), "") || "/";
  
  // Allow API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  
  // Allow auth routes
  if (canonicalPath.startsWith("/auth/")) {
    return NextResponse.next();
  }
  
  // Allow public routes
  if (canonicalPath === "/") {
    return NextResponse.next();
  }
  
  const publicPaths = [
    "/pricing",
    "/faq",
    "/about",
    "/contact",
    "/careers",
    "/privacy",
    "/terms"
  ];
  
  if (publicPaths.includes(canonicalPath)) {
    return NextResponse.next();
  }

  // Check for session token
  const possibleCookieNames = [
    "better-auth.session_token",
    "__Secure-better-auth.session_token",
    "__Host-better-auth.session_token",
  ];
  const sessionToken = possibleCookieNames
    .map((name) => request.cookies.get(name)?.value)
    .find(Boolean);

  if (!sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/auth/login`;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip all internal paths (_next, api, assets)
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
