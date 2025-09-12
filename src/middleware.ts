import { clerkMiddleware } from "@clerk/nextjs/server";

// Export the middleware
export default clerkMiddleware();

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api/health (health check endpoint)
     */
    "/((?!_next/static|_next/image|favicon.ico|public/|api/health).*)",
  ],
};
