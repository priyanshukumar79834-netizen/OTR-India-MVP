import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getApplications, postApplication, postApplicationViaToken } from './applications.controller';

export const applicationsRouter = Router();

// Portal-facing — registered BEFORE requireAuth so it is NOT gated behind
// a citizen JWT. The standalone Mock SSC site authenticates this call
// with the opaque access token in the body instead (see access.routes.ts
// for the same pattern on /api/access/data).
applicationsRouter.post('/via-token', asyncHandler(postApplicationViaToken));

applicationsRouter.use(requireAuth);
applicationsRouter.get('/', asyncHandler(getApplications));
applicationsRouter.post('/', asyncHandler(postApplication));
