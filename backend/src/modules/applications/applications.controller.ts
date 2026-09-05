import { Request, Response } from 'express';
import { AuthedRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { created, ok } from '../../utils/apiResponse';
import { submitApplicationSchema, submitApplicationViaTokenSchema } from './applications.validation';
import { listApplicationsForUser, submitApplication, submitApplicationViaToken } from './applications.service';

function requireUserId(req: AuthedRequest): string {
  if (!req.userId) throw new AppError(401, 'UNAUTHENTICATED', 'Missing authenticated user');
  return req.userId;
}

export async function postApplication(req: AuthedRequest, res: Response) {
  const userId = requireUserId(req);
  const input = submitApplicationSchema.parse(req.body);
  const application = await submitApplication(userId, input);
  return created(res, application);
}

/**
 * Portal-facing: the standalone Mock SSC site calls this directly with
 * the opaque access token it holds — deliberately not behind requireAuth,
 * same reasoning as postAccessData.
 */
export async function postApplicationViaToken(req: Request, res: Response) {
  const input = submitApplicationViaTokenSchema.parse(req.body);
  const application = await submitApplicationViaToken(input);
  return created(res, application);
}

export async function getApplications(req: AuthedRequest, res: Response) {
  const userId = requireUserId(req);
  const applications = await listApplicationsForUser(userId);
  return ok(res, { entries: applications });
}
