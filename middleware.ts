export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    /*
     * Protect all routes except:
     * - /api/auth/* (NextAuth endpoints)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /public assets
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
