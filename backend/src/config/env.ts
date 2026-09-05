import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. Copy backend/.env.example to backend/.env and fill it in.`
    );
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  // Comma-separated list — OTR now has its own frontend AND a genuinely
  // separate Mock SSC frontend that calls this backend cross-origin
  // (POST /api/access/data, POST /api/applications/via-token, etc.).
  // Both must be explicitly allow-listed; see docs/ARCHITECTURE_DECISIONS.md.
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  // Most hosted Postgres providers (Render, Neon, Railway, Supabase)
  // require SSL and reject plain connections outright. Local Postgres
  // (this sandbox, most laptops) has no SSL configured at all, so this
  // must default OFF locally and ON in production rather than being
  // inferred from the connection string. Override with DATABASE_SSL=true
  // if a specific local setup needs it, or DATABASE_SSL=false if a
  // production host's connection string already encodes sslmode itself.
  databaseSsl:
    process.env.DATABASE_SSL !== undefined
      ? process.env.DATABASE_SSL === 'true'
      : process.env.NODE_ENV === 'production',
};
