import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const {
    display_name,
    age,
    gender,
    phone,
    avatar_url,
  } = body as {
    display_name?: string;
    age?: number | null;
    gender?: string;
    phone?: string;
    avatar_url?: string | null;
  };

  if (!display_name || display_name.trim().length < 1) {
    return NextResponse.json(
      { error: "Name is required." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: display_name.trim(),
      age: age ?? null,
      gender: gender ?? null,
      phone: phone?.trim() || null,
      avatar_url: avatar_url ?? null,
      onboarding_complete: true,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Profile updated." });
}