import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware refreshes the session.
          }
        },
      },
    },
  );
}

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
} | null;

/**
 * Fast, request-scoped auth lookup for server components.
 *
 * - Uses `supabase.auth.getClaims()` which decodes the JWT locally and
 *   verifies the signature via the cached JWKS (when the project uses
 *   asymmetric JWT signing keys). On legacy HMAC projects this falls
 *   back to an Auth API call — same as `getUser()`, no regression.
 * - Wrapped in React's `cache()` so multiple server components in the
 *   same request (e.g. NavBar + page body) share a single resolution.
 * - The middleware (`proxy.ts`) is what actually validates and refreshes
 *   the session cookies; pages just consume the result.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  const c = data.claims as Record<string, unknown>;
  const meta = (c.user_metadata as Record<string, unknown> | undefined) ?? {};
  return {
    id: c.sub as string,
    email: (c.email as string) ?? "",
    name:
      (meta.full_name as string | undefined) ??
      (meta.name as string | undefined) ??
      null,
    avatarUrl: (meta.avatar_url as string | undefined) ?? null,
  };
});
