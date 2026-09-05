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
    // See config/env.ts's databaseSsl comment: most hosted Postgres
    // providers require SSL; `rejectUnauthorized: false` accepts the
    // provider's own (often self-signed-from-Node's-perspective) cert
    // chain, which is the standard pragmatic setting for this class of
    // hosted DB and appropriate for a hackathon prototype, not a
    // production-grade compliance deployment.
    ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
  });

if (!env.isProduction) {
  global.__otrPgPool = pool;
}

export const db = drizzle(pool, { schema });
