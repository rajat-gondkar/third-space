import { Pool } from "pg";

export function createVenuesPool() {
  const connectionString = process.env.VENUES_DATABASE_URL;

  if (!connectionString) {
    throw new Error("VENUES_DATABASE_URL is required to query venues.");
  }

  return new Pool({
    connectionString,
    ssl:
      process.env.VENUES_DATABASE_SSL === "false"
        ? false
        : { rejectUnauthorized: false },
  });
}
