import { and, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { accessTokens } from '../../db/schema';
import { generateAccessToken } from '../../utils/idGenerator';
import { AppError } from '../../middleware/errorHandler';
import { recordAuditEvent } from '../audit/audit.service';
import { getProfileForUser } from '../otr-profile/otrProfile.service';
import { mapCanonicalToPortal } from '../interop/interop.service';

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days — demo-appropriate, not a real policy decision

export interface IssueAccessTokenInput {
  userId: string;
  clientId: string;
  consentId: string;
  scopes: string[];
  purpose: string;
}

/**
 * Issues an opaque access token after a GRANTED consent. Called only from
 * consent.service — never expose a route that issues a token without a
 * backing consent row, or the token stops meaning anything.
 */
export async function issueAccessToken(input: IssueAccessTokenInput) {
  const [row] = await db
    .insert(accessTokens)
    .values({
      token: generateAccessToken(),
      userId: input.userId,
      clientId: input.clientId,
      consentId: input.consentId,
      scopes: input.scopes,
      purpose: input.purpose,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    })
    .returning();

  await recordAuditEvent({
    event: 'ACCESS_TOKEN_ISSUED',
    userId: input.userId,
    requestingSystem: input.clientId,
    result: 'SUCCESS',
  });

  return row;
}

/**
 * The core data-minimization enforcement point (§11). A portal presents a
 * bare token string — not a citizen JWT, since in the real flow the
 * portal, not the citizen's browser session, is the caller here (e.g. an
 * admit-card generation job days later). We re-validate status + expiry
 * on every call rather than trusting that "it was valid once."
 */
export async function retrieveDataForToken(token: string) {
  const row = await db.query.accessTokens.findFirst({ where: eq(accessTokens.token, token) });

  if (!row) {
    throw new AppError(401, 'INVALID_TOKEN', 'This access token is not recognized');
  }
  if (row.status === 'REVOKED') {
    throw new AppError(403, 'TOKEN_REVOKED', 'This access token has been revoked');
  }
  if (row.status === 'EXPIRED' || row.expiresAt.getTime() < Date.now()) {
    throw new AppError(403, 'TOKEN_EXPIRED', 'This access token has expired');
  }

  const scopes = row.scopes as string[];
  const profile = await getProfileForUser(row.userId);
  const mapped = mapCanonicalToPortal(row.clientId, profile, scopes);

  await recordAuditEvent({
    event: 'DATA_ACCESSED',
    userId: row.userId,
    requestingSystem: row.clientId,
    result: 'SUCCESS',
  });

  return { data: mapped, scopes, clientId: row.clientId, purpose: row.purpose };
}

export async function listTokensForUser(userId: string) {
  return db
    .select({
      id: accessTokens.id,
      clientId: accessTokens.clientId,
      scopes: accessTokens.scopes,
      purpose: accessTokens.purpose,
      status: accessTokens.status,
      expiresAt: accessTokens.expiresAt,
      createdAt: accessTokens.createdAt,
    })
    .from(accessTokens)
    .where(eq(accessTokens.userId, userId));
}

export async function revokeToken(userId: string, tokenId: string) {
  const [row] = await db
    .update(accessTokens)
    .set({ status: 'REVOKED' })
    .where(and(eq(accessTokens.id, tokenId), eq(accessTokens.userId, userId)))
    .returning();

  if (!row) {
    throw new AppError(404, 'TOKEN_NOT_FOUND', 'No such access token for this user');
  }

  await recordAuditEvent({
    event: 'ACCESS_TOKEN_REVOKED',
    userId,
    requestingSystem: row.clientId,
    result: 'SUCCESS',
  });

  return row;
}
