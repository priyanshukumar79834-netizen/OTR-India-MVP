import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { postConsentDecision, getConsentHistory } from './consent.controller';

export const consentRouter = Router();

consentRouter.use(requireAuth);
consentRouter.post('/decisions', asyncHandler(postConsentDecision));
consentRouter.get('/history', asyncHandler(getConsentHistory));
