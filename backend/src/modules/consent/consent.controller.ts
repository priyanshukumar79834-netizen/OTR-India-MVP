import { Response } from 'express';
import { AuthedRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { ok, created } from '../../utils/apiResponse';
import { decideConsentSchema } from './consent.validation';
import { decideConsent, listConsentHistoryForUser } from './consent.service';

function requireUserId(req: AuthedRequest): string {
  if (!req.userId) throw new AppError(401, 'UNAUTHENTICATED', 'Missing authenticated user');
  return req.userId;
}

export async function postConsentDecision(req: AuthedRequest, res: Response) {
  const userId = requireUserId(req);
  const input = decideConsentSchema.parse(req.body);
  const result = await decideConsent(userId, input);
  return created(res, result);
}

export async function getConsentHistory(req: AuthedRequest, res: Response) {
  const userId = requireUserId(req);
  const history = await listConsentHistoryForUser(userId);
  return ok(res, { entries: history });
}
