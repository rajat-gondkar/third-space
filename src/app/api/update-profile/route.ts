import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s+/g, "");
  return /^(\+91)?[6-9]\d{9}$/.test(cleaned);
}

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

  if (!age || typeof age !== "number" || age < 13 || age > 120) {
    return NextResponse.json(
      { error: "Please enter a valid age (13–120)." },
      { status: 400 },
    );
  }

  if (!gender || gender.trim().length < 1) {
    return NextResponse.json(
      { error: "Gender is required." },
      { status: 400 },
    );
  }

  const trimmedPhone = phone?.trim() ?? "";
  if (!trimmedPhone) {
    return NextResponse.json(
      { error: "Phone number is required." },
      { status: 400 },
    );
  }

  if (!isValidPhone(trimmedPhone)) {
    return NextResponse.json(
      { error: "Please enter a valid Indian phone number (10 digits, starting with 6–9)." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: display_name.trim(),
      age,
      gender: gender.trim(),
      phone: trimmedPhone,
      avatar_url: avatar_url ?? null,
      onboarding_complete: true,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Profile updated." });
}
