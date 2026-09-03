import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getMyAuditLog } from './audit.controller';

export const auditRouter = Router();

auditRouter.use(requireAuth);
auditRouter.get('/', asyncHandler(getMyAuditLog));
