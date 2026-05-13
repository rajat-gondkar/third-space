import { redirect } from "next/navigation";

import { NavBar } from "@/components/NavBar";
import { SpacesShell } from "@/components/spaces/SpacesShell";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

export default async function SpacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/spaces");

  const navUser = {
    email: user.email ?? "",
    name:
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
    avatarUrl:
      (user.user_metadata?.avatar_url as string | undefined) ?? null,
  };

  return (
    <div className="flex min-h-dvh flex-col md:h-dvh">
      <NavBar user={navUser} />
      <SpacesShell defaultCenter={DEFAULT_CENTER} />
    </div>
  );
}
