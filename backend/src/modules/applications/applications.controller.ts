import { Response } from 'express';
import { AuthedRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { created, ok } from '../../utils/apiResponse';
import { submitApplicationSchema } from './applications.validation';
import { listApplicationsForUser, submitApplication } from './applications.service';

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

export async function getApplications(req: AuthedRequest, res: Response) {
  const userId = requireUserId(req);
  const applications = await listApplicationsForUser(userId);
  return ok(res, { entries: applications });
}
