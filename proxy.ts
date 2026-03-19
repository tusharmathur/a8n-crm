export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    "/((?!login|api/auth|accounts/[^/]+$|_next/static|_next/image|favicon.ico).*)",
  ],
};
