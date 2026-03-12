export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    "/spar/:path*",
    "/impromptu/:path*",
    "/casual/:path*",
    "/debate-practice/:path*",
    "/tongue-twisters/:path*",
    "/session/:path*",
  ],
};
