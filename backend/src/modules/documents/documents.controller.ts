import { Response } from 'express';
import { AuthedRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { created, ok } from '../../utils/apiResponse';
import { uploadDocumentSchema } from './documents.validation';
import { listDocumentsForUser, uploadDocument } from './documents.service';

function requireUserId(req: AuthedRequest): string {
  if (!req.userId) throw new AppError(401, 'UNAUTHENTICATED', 'Missing authenticated user');
  return req.userId;
}

export async function postDocument(req: AuthedRequest, res: Response) {
  const userId = requireUserId(req);
  const input = uploadDocumentSchema.parse(req.body);
  const doc = await uploadDocument(userId, input);
  return created(res, doc);
}

export async function getDocuments(req: AuthedRequest, res: Response) {
  const userId = requireUserId(req);
  const docs = await listDocumentsForUser(userId);
  return ok(res, { entries: docs });
}
