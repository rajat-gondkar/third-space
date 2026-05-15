import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: thread, error } = await supabase
    .from("threads")
    .select("*, thread_posts(count)")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Thread not found." },
      { status: 404 },
    );
  }

  const postCount = Array.isArray(
    (thread as Record<string, unknown>)["thread_posts"],
  )
    ? ((thread as Record<string, unknown>)["thread_posts"] as { count: number }[])[0]
        ?.count ?? 0
    : 0;

  return NextResponse.json({
    thread: { ...thread, post_count: postCount },
  });
}
