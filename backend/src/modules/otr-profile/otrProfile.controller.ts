import { Response } from 'express';
import { AuthedRequest } from '../../middleware/auth';
import { updateProfileSchema } from './otrProfile.validation';
import { getProfileForUser, updateProfileForUser } from './otrProfile.service';
import { ok } from '../../utils/apiResponse';
import { AppError } from '../../middleware/errorHandler';

function requireUserId(req: AuthedRequest): string {
  if (!req.userId) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing authenticated user');
  }
  return req.userId;
}

export async function getMyProfile(req: AuthedRequest, res: Response) {
  const userId = requireUserId(req);
  const profile = await getProfileForUser(userId);
  return ok(res, profile);
}

export async function updateMyProfile(req: AuthedRequest, res: Response) {
  const userId = requireUserId(req);
  const input = updateProfileSchema.parse(req.body);
  const profile = await updateProfileForUser(userId, input);
  return ok(res, profile);
}
