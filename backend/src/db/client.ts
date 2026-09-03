import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '../config/env';
import * as schema from './schema';

// A single shared pool/client. Do not instantiate a second Pool elsewhere —
// importing this module keeps one connection pool for the whole process.
declare global {
  // eslint-disable-next-line no-var
  var __otrPgPool: Pool | undefined;
}

export const pool =
  global.__otrPgPool ??
  new Pool({
    connectionString: env.databaseUrl,
  });

if (!env.isProduction) {
  global.__otrPgPool = pool;
}

export const db = drizzle(pool, { schema });
