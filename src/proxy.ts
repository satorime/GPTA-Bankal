import { NextRequest, NextResponse } from "next/server";

const appInstance = process.env.NEXT_PUBLIC_APP_INSTANCE ?? "student";

export const config = {
  matcher: ["/((?!_next/|static/|.*\\..*).*)"],
};

export default function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (appInstance === "student" && path.startsWith("/admin")) {
    return NextResponse.rewrite(new URL("/not-found", request.url));
  }

  if (appInstance === "admin" && path.startsWith("/student")) {
    return NextResponse.rewrite(new URL("/not-found", request.url));
  }

  return NextResponse.next();
}


