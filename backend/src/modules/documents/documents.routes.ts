import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getDocuments, postDocument } from './documents.controller';

export const documentsRouter = Router();

documentsRouter.use(requireAuth);
documentsRouter.get('/', asyncHandler(getDocuments));
documentsRouter.post('/', asyncHandler(postDocument));
