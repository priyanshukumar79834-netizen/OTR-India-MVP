import { and, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { accessTokens, applications } from '../../db/schema';
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
 * Re-validates a bare opaque token (status + expiry) and returns the
 * backing row. This is THE authentication mechanism for anything the
 * portal side calls directly — not a citizen JWT, since the caller here
 * is a government portal's own server/browser, not the citizen's OTR
 * session (e.g. an admit-card generation job days later, or the portal
 * recording an application it just collected). Shared by
 * retrieveDataForToken and applications.service's via-token submission
 * path so there is exactly one place that decides "is this token good."
 */
export async function validateAccessToken(token: string) {
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
  const row = await validateAccessToken(token);

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
  const [tokens, apps] = await Promise.all([
    db
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
      .where(eq(accessTokens.userId, userId)),
    db
      .select({ accessTokenId: applications.accessTokenId, applicationRefId: applications.applicationRefId })
      .from(applications)
      .where(eq(applications.userId, userId)),
  ]);

  // Batch 8 lifecycle rule: a token backing a submitted application is
  // "linked" and must not be presented as freely revocable — see
  // revokeToken below for the server-side enforcement of the same rule.
  const linkedRefByTokenId = new Map(
    apps.filter((a) => a.accessTokenId).map((a) => [a.accessTokenId as string, a.applicationRefId])
  );

  return tokens.map((t) => ({
    ...t,
    linkedApplicationRefId: linkedRefByTokenId.get(t.id) ?? null,
  }));
}

/**
 * Batch 8 — application lifecycle rule: once a token has been used to
 * submit a government application, it must not be revocable in a way
 * that would break that application's ability to have its authorized
 * data retrieved again later (e.g. admit-card generation). Normal
 * status/expiry validation elsewhere is untouched; this only blocks the
 * citizen-initiated revoke action for tokens with a submitted
 * application attached. A token with no submitted application still
 * revokes normally.
 */
export async function revokeToken(userId: string, tokenId: string) {
  const linkedApplication = await db.query.applications.findFirst({
    where: eq(applications.accessTokenId, tokenId),
  });

  if (linkedApplication) {
    throw new AppError(
      409,
      'TOKEN_LINKED_TO_APPLICATION',
      `This authorization is attached to submitted application ${linkedApplication.applicationRefId} and can't be revoked from here. Revoking it would break that application's ability to retrieve its authorized information later.`
    );
  }

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
