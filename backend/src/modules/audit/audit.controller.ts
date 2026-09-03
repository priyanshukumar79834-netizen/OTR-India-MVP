import { Response } from 'express';
import { AuthedRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { ok } from '../../utils/apiResponse';
import { listAuditLogsQuerySchema } from './audit.validation';
import { listAuditEventsForUser } from './audit.service';

export async function getMyAuditLog(req: AuthedRequest, res: Response) {
  if (!req.userId) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing authenticated user');
  }

  const { limit } = listAuditLogsQuerySchema.parse(req.query);
  const entries = await listAuditEventsForUser(req.userId, limit);
  return ok(res, { entries });
}
