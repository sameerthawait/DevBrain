import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '../config/env';
import { logger } from '../logger';

// Singleton database connection management for serverless context
declare global {
  var globalPgClient: postgres.Sql | undefined;
}

/**
 * Configure database connections.
 * - Max connections per container: 10 (controls connection pool limits)
 * - connect_timeout: 10 seconds (abort connection attempts that hang)
 * - statement_timeout: 10000ms (abort single queries taking > 10s to prevent locks)
 * - idle_in_transaction_session_timeout: 5000ms (kills transactions hanging idle > 5s)
 * - prepare: false (disable prepared statements for transaction-mode connection poolers)
 */
export const client = globalThis.globalPgClient ?? postgres(env.DATABASE_URL, {
  prepare: false,
  max: 10,
  connect_timeout: 10,
  connection: {
    statement_timeout: 5000,
    idle_in_transaction_session_timeout: 30000,
  },
  debug: (connection, query, parameters) => {
    // Log queries during execution
    logger.trace({ query, parameters }, "Database query dispatched");
  }
});

if (process.env.NODE_ENV !== "production") {
  globalThis.globalPgClient = client;
}

export const db = drizzle(client, { schema });
