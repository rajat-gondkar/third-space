"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SignInButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    try {
      const supabase = createClient();
      const params = next ? `?next=${encodeURIComponent(next)}` : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback${params}`,
        },
      });
      if (error) throw error;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start sign-in.";
      toast.error(message);
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={signIn}
      disabled={loading}
      size="lg"
      className="w-full max-w-xs"
    >
      {loading ? "Redirecting…" : "Continue with Google"}
    </Button>
  );
}
