import { Response, Request } from 'express';
import { z } from 'zod';
import { AuthedRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { ok } from '../../utils/apiResponse';
import { listTokensForUser, retrieveDataForToken, revokeToken } from './access.service';

function requireUserId(req: AuthedRequest): string {
  if (!req.userId) throw new AppError(401, 'UNAUTHENTICATED', 'Missing authenticated user');
  return req.userId;
}

const dataRequestSchema = z.object({ token: z.string().min(10) });

/**
 * Portal-facing endpoint. Deliberately NOT behind `requireAuth` — the
 * caller here is a government portal (possibly hours or weeks after the
 * citizen's own session ended, e.g. generating an admit card), not the
 * citizen's browser. The opaque token itself IS the credential; see
 * access.service.retrieveDataForToken for the actual validation.
 */
export async function postAccessData(req: Request, res: Response) {
  const { token } = dataRequestSchema.parse(req.body);
  const result = await retrieveDataForToken(token);
  return ok(res, result);
}

export async function getMyTokens(req: AuthedRequest, res: Response) {
  const userId = requireUserId(req);
  const tokens = await listTokensForUser(userId);
  // listTokensForUser's select() already omits the raw token column — it's
  // a bearer credential and should only ever surface once, at grant time.
  return ok(res, { entries: tokens });
}

export async function postRevokeToken(req: AuthedRequest, res: Response) {
  const userId = requireUserId(req);
  const tokenRow = await revokeToken(userId, req.params.id);
  return ok(res, { id: tokenRow.id, status: tokenRow.status });
}
