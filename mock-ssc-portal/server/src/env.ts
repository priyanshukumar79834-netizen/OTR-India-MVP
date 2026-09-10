import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. Copy mock-ssc-portal/server/.env.example to .env and fill it in — see server/README.md for where the value comes from.`
    );
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4174),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isTest: process.env.NODE_ENV === 'test',

  // Where OTR-India's backend lives — this server talks to it directly,
  // server-to-server, the same way any two independent government
  // systems integrating with OTR would.
  otrApiUrl: process.env.OTR_API_URL ?? 'http://localhost:4000',

  // This client's own identity + secret. THE SECRET NEVER LEAVES THIS
  // PROCESS — it is never sent to, logged for, or readable by the
  // mock-ssc-portal browser bundle. Required (no default) so a missing
  // .env fails loudly at startup rather than silently running unauthenticated.
  sscClientId: process.env.SSC_OTR_CLIENT_ID ?? 'SSC_EXAM_PORTAL',
  sscClientSecret: required('SSC_OTR_CLIENT_SECRET'),

  // Must be an EXACT match for one of the entries in this client's
  // registered redirectUris on OTR's backend (see
  // backend/src/modules/government-clients/governmentClients.service.ts,
  // SEED_GOVERNMENT_CLIENTS['SSC_EXAM_PORTAL'].redirectUris) — OTR
  // rejects a request-creation call with any other value. Fixed here,
  // server-side; the mock-ssc-portal browser never supplies this.
  sscRedirectUri: process.env.SSC_REDIRECT_URI ?? 'http://localhost:5174/callback',

  // Only this app's own frontend origin may call this bridge.
  sscAppOrigin: process.env.SSC_APP_ORIGIN ?? 'http://localhost:5174',
};
