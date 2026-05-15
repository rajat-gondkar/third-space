import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { resolveProfileId } from "@/lib/auth-identity";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  const { postId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const canonicalId = await resolveProfileId(supabase, user.id);

  const { error } = await supabase
    .from("thread_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", canonicalId);

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Could not delete post." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
