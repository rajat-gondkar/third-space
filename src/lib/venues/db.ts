import "server-only";

import { Pool } from "pg";

import { createVenuesPool } from "@/lib/venues/pool";

declare global {
  var venuesPool: Pool | undefined;
}

export function getVenuesPool() {
  const pool = globalThis.venuesPool ?? createVenuesPool();

  if (process.env.NODE_ENV !== "production") {
    globalThis.venuesPool = pool;
  }

  return pool;
}

export default getVenuesPool;
