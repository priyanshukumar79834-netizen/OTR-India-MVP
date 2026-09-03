import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getMyTokens, postAccessData, postRevokeToken } from './access.controller';

export const accessRouter = Router();

// Portal-facing: authenticated by the opaque token in the body, not a JWT.
accessRouter.post('/data', asyncHandler(postAccessData));

// Citizen-facing: their own view/control over tokens they've authorized.
accessRouter.get('/tokens', requireAuth, asyncHandler(getMyTokens));
accessRouter.post('/tokens/:id/revoke', requireAuth, asyncHandler(postRevokeToken));
