import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";

const DIRECT_URL =
  "postgresql://postgres.bsplfuzefathlfcxsteb:ThirdSpace@123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

async function applySchema() {
  const sqlPath = join(process.cwd(), "db", "venues", "schema.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  const client = new Client({
    connectionString: DIRECT_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to venues database (direct).");
    await client.query(sql);
    console.log("Schema applied successfully.");
  } catch (error) {
    console.error("Failed to apply schema:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applySchema();
