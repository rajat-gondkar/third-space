import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

// Only run the (expensive) auth-refresh proxy on routes that actually need it.
// Public routes ('/', '/auth/callback', static assets, OG image, etc.) skip
// the proxy entirely, which removes ~500ms of Supabase Auth round-trip from
// every navigation that doesn't need it.
export const config = {
  matcher: [
    "/map/:path*",
    "/post/:path*",
    "/activity/:path*",
    "/login",
  ],
};
