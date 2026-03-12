export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    "/casual/:path*",
    "/debate-practice/:path*",
    "/tongue-twisters/:path*",
    "/session/:path*",
  ],
};
