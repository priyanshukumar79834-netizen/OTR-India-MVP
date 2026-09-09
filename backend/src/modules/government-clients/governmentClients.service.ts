import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { governmentClients } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { hashPassword, verifyPassword } from '../../utils/password';
import { generateClientSecret } from '../../utils/idGenerator';
import { logger } from '../../utils/logger';

/**
 * A registered government portal/client (Part 15 of the MVP brief).
 *
 * This exists so the server never trusts an arbitrary frontend-supplied
 * "requestingApp" string as authorization — a consent/token request must
 * name a known clientId, and the server (not the caller) decides the
 * ceiling of what that client is allowed to ever request via
 * `allowedScopes`. Individual consent grants can be a subset of this,
 * never a superset.
 *
 * Kept intentionally simple for the hackathon: a fixed seed list,
 * upserted idempotently at startup. A real production system would have
 * an onboarding/admin flow (§25 Admin role) — explicitly out of scope here.
 */
export interface SeedGovernmentClient {
  clientId: string;
  name: string;
  organisation: string;
  allowedScopes: string[];
  /**
   * Optional env var name holding this client's plaintext secret for local
   * dev/demo (e.g. so restarting the backend doesn't invalidate whatever
   * secret the mock SSC portal has configured). If unset/empty, a random
   * secret is generated at first seed and printed ONCE to the server log —
   * never persisted in plaintext anywhere, never returned by any API.
   */
  secretEnvVar?: string;
}

export const SEED_GOVERNMENT_CLIENTS: SeedGovernmentClient[] = [
  {
    clientId: 'SSC_EXAM_PORTAL',
    name: 'GovRecruit-A',
    organisation: 'Staff Selection Commission (mock)',
    allowedScopes: [
      'identity.fullName',
      'identity.dateOfBirth',
      'identity.guardianName',
      'contact.mobile',
      'address',
      'education.secondary',
      'education.seniorSecondary',
    ],
    secretEnvVar: 'SSC_OTR_CLIENT_SECRET',
  },
  {
    clientId: 'SCHOLARSHIP_PORTAL',
    name: 'GovRecruit-B',
    organisation: 'Railway Recruitment Board (mock)',
    allowedScopes: [
      'identity.fullName',
      'identity.dateOfBirth',
      'contact.email',
      'education.graduation',
    ],
    secretEnvVar: 'SCHOLARSHIP_OTR_CLIENT_SECRET',
  },
];

/**
 * Idempotent — safe to call on every server start.
 *
 * Phase 1: also ensures every seeded client has a `clientSecretHash`. This
 * never overwrites an existing hash (so a running deployment's secret
 * survives restarts) and never logs/returns a secret that already existed
 * — only a freshly-generated one, exactly once, so it can be copied into
 * the consuming portal's own env config.
 */
export async function seedGovernmentClients(): Promise<void> {
  for (const client of SEED_GOVERNMENT_CLIENTS) {
    const existing = await db.query.governmentClients.findFirst({
      where: eq(governmentClients.clientId, client.clientId),
    });

    if (!existing) {
      const plainSecret = (client.secretEnvVar && process.env[client.secretEnvVar]) || generateClientSecret();
      await db.insert(governmentClients).values({
        clientId: client.clientId,
        name: client.name,
        organisation: client.organisation,
        allowedScopes: client.allowedScopes,
        clientSecretHash: hashPassword(plainSecret),
      });
      logger.info(`Seeded government client ${client.clientId}`, {
        clientId: client.clientId,
        // Deliberately the ONLY place this ever appears in plaintext.
        secretForLocalDevOnly: plainSecret,
      });
      continue;
    }

    if (!existing.clientSecretHash) {
      const plainSecret = (client.secretEnvVar && process.env[client.secretEnvVar]) || generateClientSecret();
      await db
        .update(governmentClients)
        .set({ clientSecretHash: hashPassword(plainSecret) })
        .where(eq(governmentClients.clientId, client.clientId));
      logger.info(`Backfilled client secret for existing government client ${client.clientId}`, {
        clientId: client.clientId,
        secretForLocalDevOnly: plainSecret,
      });
    }
  }
}

/**
 * Phase 1 core check: does this client_id/secret pair authenticate?
 * Deliberately returns the same generic failure for "unknown client",
 * "inactive client", and "wrong secret" so a caller can't use error
 * differences to enumerate valid client IDs.
 */
export async function verifyGovClientCredentials(clientId: string, secret: string): Promise<boolean> {
  const client = await db.query.governmentClients.findFirst({
    where: eq(governmentClients.clientId, clientId),
  });
  if (!client || client.active !== 'true' || !client.clientSecretHash) {
    return false;
  }
  return verifyPassword(secret, client.clientSecretHash);
}

export async function getActiveClient(clientId: string) {
  const client = await db.query.governmentClients.findFirst({
    where: eq(governmentClients.clientId, clientId),
  });
  if (!client || client.active !== 'true') {
    throw new AppError(404, 'UNKNOWN_CLIENT', 'This requesting portal is not a registered government client');
  }
  return client;
}

/** Throws if any requested field is outside what this client is ever allowed to ask for. */
export function assertFieldsWithinAllowedScopes(allowedScopes: string[], requestedFields: string[]) {
  const disallowed = requestedFields.filter((f) => !allowedScopes.includes(f));
  if (disallowed.length > 0) {
    throw new AppError(
      403,
      'SCOPE_NOT_ALLOWED',
      'This portal is not registered to request one or more of the fields in this request',
      { disallowed }
    );
  }
}
