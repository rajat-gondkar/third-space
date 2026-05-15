import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { resolveProfileId } from "@/lib/auth-identity";

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

  const { data: posts, error } = await supabase
    .from("thread_posts")
    .select(
      "*, profile:profiles(id, display_name, avatar_url)",
    )
    .eq("thread_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Could not load posts." },
      { status: 500 },
    );
  }

  return NextResponse.json({ posts });
}

export async function POST(
  request: NextRequest,
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

  const canonicalId = await resolveProfileId(supabase, user.id);

  const body = (await request.json()) as {
    content: string;
    image_urls?: string[];
  };

  const content = body.content?.trim() ?? "";
  if (!content || content.length === 0) {
    return NextResponse.json(
      { error: "Post content is required." },
      { status: 400 },
    );
  }

  const { data: post, error } = await supabase
    .from("thread_posts")
    .insert({
      thread_id: id,
      user_id: canonicalId,
      content,
      image_urls: body.image_urls ?? [],
    })
    .select(
      "*, profile:profiles(id, display_name, avatar_url)",
    )
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Could not create post." },
      { status: 500 },
    );
  }

  return NextResponse.json({ post });
}
