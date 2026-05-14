import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";

const DIRECT_URL =
  "postgresql://postgres.bsplfuzefathlfcxsteb:ThirdSpace@123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

async function applyMigration() {
  const sqlPath = join(
    process.cwd(),
    "supabase",
    "migrations",
    "0003_onboarding_profiles.sql",
  );
  const sql = readFileSync(sqlPath, "utf-8");

  const client = new Client({
    connectionString: DIRECT_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to Supabase (direct).");

    // Step 1: Add columns to profiles
    await client.query(`
      ALTER TABLE public.profiles
        ADD COLUMN IF NOT EXISTS phone text,
        ADD COLUMN IF NOT EXISTS age int,
        ADD COLUMN IF NOT EXISTS gender text,
        ADD COLUMN IF NOT EXISTS college_email text,
        ADD COLUMN IF NOT EXISTS college_email_verified boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS college_name text,
        ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;
    `);
    console.log("Profiles columns added.");

    // Step 2: Create verifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.college_email_verifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        college_email text NOT NULL,
        otp text NOT NULL,
        verified boolean DEFAULT false,
        expires_at timestamptz NOT NULL,
        created_at timestamptz DEFAULT now()
      );
    `);
    console.log("Verifications table created.");

    // Step 3: RLS
    await client.query(`
      ALTER TABLE public.college_email_verifications ENABLE ROW LEVEL SECURITY;
    `);
    console.log("RLS enabled.");

    await client.query(`
      DROP POLICY IF EXISTS "users can manage their own verifications" ON public.college_email_verifications;
    `);

    await client.query(`
      CREATE POLICY "users can manage their own verifications"
        ON public.college_email_verifications FOR ALL
        TO authenticated
        USING (user_id = auth.uid());
    `);
    console.log("RLS policy created.");

    await client.query(`
      CREATE INDEX IF NOT EXISTS college_email_verifications_user_idx
        ON public.college_email_verifications (user_id);
    `);
    console.log("Index created.");

    // Step 4: Storage bucket
    await client.query(`
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('avatars', 'avatars', true)
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log("Storage bucket created.");

    await client.query(`
      DROP POLICY IF EXISTS "anyone can view avatars" ON storage.objects;
      CREATE POLICY "anyone can view avatars"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'avatars');
    `);

    await client.query(`
      DROP POLICY IF EXISTS "authenticated can upload avatars" ON storage.objects;
      CREATE POLICY "authenticated can upload avatars"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'avatars');
    `);

    await client.query(`
      DROP POLICY IF EXISTS "users can update own avatars" ON storage.objects;
      CREATE POLICY "users can update own avatars"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
    `);

    await client.query(`
      DROP POLICY IF EXISTS "users can delete own avatars" ON storage.objects;
      CREATE POLICY "users can delete own avatars"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
    `);
    console.log("Storage policies created.");

    console.log("Migration 0003 applied successfully.");
  } catch (error) {
    console.error("Failed to apply migration:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();