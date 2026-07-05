import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Single shared pg Pool — used by both Drizzle (app queries)
// and Better Auth (users/sessions). One connection pool, one
// source of truth.
declare global {
  // eslint-disable-next-line no-var
  var globalPgPool: Pool | undefined;
}

export const pool =
  globalThis.globalPgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 10000,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.globalPgPool = pool;
}

export const db = drizzle(pool, { schema });
