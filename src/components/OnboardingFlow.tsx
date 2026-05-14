"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isCollegeEmail as checkCollegeDomain } from "@/lib/college-domains";
import { createClient } from "@/lib/supabase/client";

type Step = "college-email" | "otp" | "profile";

type OnboardingFlowProps = {
  userEmail: string;
  isCollegeEmail: boolean;
  collegeNameFromEmail: string | null;
  collegeEmailVerified: boolean;
  initialDisplayName: string;
  initialAvatarUrl: string | null;
};

export function OnboardingFlow({
  userEmail,
  isCollegeEmail: isCollegeEmailProp,
  collegeNameFromEmail,
  collegeEmailVerified: collegeEmailVerifiedProp,
  initialDisplayName,
  initialAvatarUrl,
}: OnboardingFlowProps) {
  const router = useRouter();

  const [step, setStep] = useState<Step>(
    isCollegeEmailProp ? "profile" : "college-email",
  );
  const [collegeEmailInput, setCollegeEmailInput] = useState("");
  const [collegeName, setCollegeName] = useState(
    collegeNameFromEmail ?? "",
  );
  const [collegeEmailVerified, setCollegeEmailVerified] = useState(
    collegeEmailVerifiedProp,
  );
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Profile fields
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    initialAvatarUrl,
  );
  const [uploading, setUploading] = useState(false);

  // --- Step 1: College email ---
  async function handleCollegeEmailSubmit() {
    const email = collegeEmailInput.trim().toLowerCase();
    if (!email) {
      toast.error("Please enter your college email.");
      return;
    }
    if (!checkCollegeDomain(email)) {
      toast.error("Not a recognised Indian college email domain.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/verify-college-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ college_email: email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Something went wrong.");
        return;
      }
      setCollegeName(data.college_name ?? "");
      setGeneratedOtp(data.otp ?? null);
      setStep("otp");
      if (data.otp) {
        toast.success("OTP generated — check your email or see it below.");
      } else {
        toast.success("OTP sent! Check your college email inbox.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // --- Step 2: OTP verification ---
  async function handleOtpVerify() {
    if (!otp.trim()) {
      toast.error("Please enter the OTP.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/verify-college-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          college_email: collegeEmailInput.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Verification failed.");
        return;
      }
      setCollegeEmailVerified(true);
      toast.success("College email verified!");
      setStep("profile");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // --- Step 3: Profile form ---
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be under 2 MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Upload failed.");
        return;
      }
      setAvatarUrl(data.url);
      toast.success("Photo uploaded!");
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleProfileSubmit() {
    if (!displayName.trim()) {
      toast.error("Name is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim(),
          age: age ? Number(age) : null,
          gender: gender || null,
          phone: phone.trim() || null,
          avatar_url: avatarUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save profile.");
        return;
      }
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: { onboarding_complete: true },
      });
      toast.success("Profile saved!");
      router.push("/map");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ---------- Step: College Email ---------- */}
      {step === "college-email" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 text-sm">
            <p className="font-medium">
              Signed in as <span className="text-primary">{userEmail}</span>
            </p>
            <p className="mt-1 text-muted-foreground">
              This email isn{"\u2019"}t from a recognised Indian college. Enter
              your college email to verify you{"\u2019"}re a student.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="college-email">College email address</Label>
            <Input
              id="college-email"
              type="email"
              placeholder="you@college.ac.in"
              value={collegeEmailInput}
              onChange={(e) => setCollegeEmailInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCollegeEmailSubmit();
              }}
            />
          </div>
          <Button
            onClick={handleCollegeEmailSubmit}
            disabled={loading || !collegeEmailInput.trim()}
            className="w-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md ring-1 ring-white/20"
          >
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Mail className="mr-2 size-4" />
            )}
            Send verification code
          </Button>
        </div>
      )}

      {/* ---------- Step: OTP ---------- */}
      {step === "otp" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 text-sm">
            <p className="font-medium">
              Verify <span className="text-primary">{collegeEmailInput.trim().toLowerCase()}</span>
            </p>
            <p className="mt-1 text-muted-foreground">
              Enter the 6-digit code that was sent to your college email.
            </p>
            {generatedOtp && (
              <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-amber-900 dark:bg-amber-950/30 dark:border-amber-700/40 dark:text-amber-200">
                <p className="text-xs font-medium">Dev mode — OTP shown below:</p>
                <p className="mt-0.5 font-mono text-lg font-bold tracking-widest">{generatedOtp}</p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="otp">6-digit code</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp((e.target as HTMLInputElement).value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleOtpVerify();
              }}
            />
          </div>
          <Button
            onClick={handleOtpVerify}
            disabled={loading || otp.length !== 6}
            className="w-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md ring-1 ring-white/20"
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Verify code
          </Button>
          <button
            type="button"
            onClick={handleCollegeEmailSubmit}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Resend code
          </button>
        </div>
      )}

      {/* ---------- Step: Profile ---------- */}
      {step === "profile" && (
        <div className="space-y-4">
          {collegeEmailVerified && collegeName && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-700/40 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>
                Verified: <strong>{collegeName}</strong>
              </span>
            </div>
          )}

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-2xl text-muted-foreground">
                  {displayName.trim().charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>
            <label className="cursor-pointer">
              <Input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                asChild
              >
                <span>
                  <Upload className="mr-1.5 size-3.5" />
                  {uploading ? "Uploading…" : "Upload photo"}
                </span>
              </Button>
            </label>
          </div>

          {/* Display name */}
          <div className="space-y-1.5">
            <Label htmlFor="display-name">Name *</Label>
            <Input
              id="display-name"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {/* Age + Gender row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                min={13}
                max={120}
                placeholder="Age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Button
            onClick={handleProfileSubmit}
            disabled={loading || !displayName.trim()}
            className="w-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md ring-1 ring-white/20"
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Complete setup
          </Button>
        </div>
      )}
    </div>
  );
}