import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { governmentClients } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';

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
  },
];

/** Idempotent — safe to call on every server start. */
export async function seedGovernmentClients(): Promise<void> {
  for (const client of SEED_GOVERNMENT_CLIENTS) {
    const existing = await db.query.governmentClients.findFirst({
      where: eq(governmentClients.clientId, client.clientId),
    });
    if (!existing) {
      await db.insert(governmentClients).values({
        clientId: client.clientId,
        name: client.name,
        organisation: client.organisation,
        allowedScopes: client.allowedScopes,
      });
    }
  }
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
