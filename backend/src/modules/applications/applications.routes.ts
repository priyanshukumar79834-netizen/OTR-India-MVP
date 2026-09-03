import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getApplications, postApplication } from './applications.controller';

export const applicationsRouter = Router();

applicationsRouter.use(requireAuth);
applicationsRouter.get('/', asyncHandler(getApplications));
applicationsRouter.post('/', asyncHandler(postApplication));
