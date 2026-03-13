import { NextResponse } from "next/server";

// No auth gating - all pages are publicly accessible
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
