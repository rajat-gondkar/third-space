import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveProfileId } from "@/lib/auth-identity";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File must be under 2 MB." },
      { status: 400 },
    );
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const canonicalId = await resolveProfileId(supabase, user.id);
  const path = `${canonicalId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}
