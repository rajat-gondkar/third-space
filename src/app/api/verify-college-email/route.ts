import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isCollegeEmail, getCollegeName } from "@/lib/college-domains";
import { sendOtpEmail } from "@/lib/email";
import { resolveProfileId } from "@/lib/auth-identity";

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const isDev = !process.env.RESEND_API_KEY;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawEmail = body.college_email;
  if (!rawEmail || typeof rawEmail !== "string") {
    return NextResponse.json(
      { error: "college_email is required" },
      { status: 400 },
    );
  }

  const collegeEmail = rawEmail.trim().toLowerCase();

  if (!isCollegeEmail(collegeEmail)) {
    return NextResponse.json(
      { error: "Not a recognised Indian college email domain." },
      { status: 400 },
    );
  }

  const collegeName = getCollegeName(collegeEmail);

  // Check if this college email is already claimed by a different user
  const canonicalId = await resolveProfileId(supabase, user.id);

  const { data: existing, error: existingErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("college_email", collegeEmail)
    .neq("id", canonicalId)
    .maybeSingle();

  if (existingErr) {
    console.error("[verify-college-email] profiles lookup error:", existingErr);
    return NextResponse.json(
      { error: "Database error. Please try again." },
      { status: 500 },
    );
  }

  if (existing) {
    return NextResponse.json(
      { error: "This college email is already linked to another account." },
      { status: 409 },
    );
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Invalidate any previous unverified OTPs for this user
  const { error: delErr } = await supabase
    .from("college_email_verifications")
    .delete()
    .eq("user_id", user.id)
    .eq("verified", false);

  if (delErr) {
    console.error("[verify-college-email] delete old OTPs error:", delErr);
  }

  const { error: insertErr } = await supabase
    .from("college_email_verifications")
    .insert({
      user_id: user.id,
      college_email: collegeEmail,
      otp,
      verified: false,
      expires_at: expiresAt,
    });

  if (insertErr) {
    console.error("[verify-college-email] insert OTP error:", insertErr);
    return NextResponse.json(
      { error: `Could not store verification code: ${insertErr.message}` },
      { status: 500 },
    );
  }

  const emailResult = await sendOtpEmail(collegeEmail, otp);
  const devFallback = emailResult.dev === true;

  return NextResponse.json({
    message: devFallback
      ? "OTP generated (email not sent — shown below for dev)."
      : "OTP sent to your college email.",
    college_name: collegeName,
    ...(devFallback || isDev ? { otp } : {}),
  });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawEmail = body.college_email;
  const rawOtp = body.otp;

  if (!rawEmail || !rawOtp) {
    return NextResponse.json(
      { error: "college_email and otp are required" },
      { status: 400 },
    );
  }

  const collegeEmail = String(rawEmail).trim().toLowerCase();
  const otp = String(rawOtp).trim();

  const { data: record, error: fetchError } = await supabase
    .from("college_email_verifications")
    .select("id, expires_at, verified")
    .eq("user_id", user.id)
    .eq("college_email", collegeEmail)
    .eq("otp", otp)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    console.error("[verify-college-email] lookup OTP error:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!record) {
    return NextResponse.json({ error: "Invalid OTP." }, { status: 400 });
  }

  if (record.verified) {
    return NextResponse.json(
      { error: "Already verified." },
      { status: 400 },
    );
  }

  if (new Date(record.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "OTP expired. Please request a new one." },
      { status: 400 },
    );
  }

  const collegeName = getCollegeName(collegeEmail);

  // Mark OTP as verified
  await supabase
    .from("college_email_verifications")
    .update({ verified: true })
    .eq("id", record.id);

  // Resolve canonical profile id before updating
  const canonicalId = await resolveProfileId(supabase, user.id);

  // If no profile exists for this canonical id but one exists with the same
  // college_email, link the current auth user to it (self-healing for
  // accounts that were broken by the old 0004 migration).
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", canonicalId)
    .maybeSingle();

  if (!targetProfile) {
    // Try to find an existing profile with this college email
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("college_email", collegeEmail)
      .eq("college_email_verified", true)
      .maybeSingle();

    if (existingProfile) {
      // Link the current auth user to the existing profile
      await supabase
        .from("profiles")
        .update({ linked_user_id: user.id })
        .eq("id", existingProfile.id);

      return NextResponse.json({
        message: "College email verified. Account linked.",
        college_email: collegeEmail,
        college_name: collegeName,
      });
    }
  }

  // Update profile
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      college_email: collegeEmail,
      college_email_verified: true,
      college_name: collegeName,
    })
    .eq("id", canonicalId);

  if (profileError) {
    console.error("[verify-college-email] profile update error:", profileError);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "College email verified.",
    college_email: collegeEmail,
    college_name: collegeName,
  });
}
