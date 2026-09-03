import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { getMyProfile, updateMyProfile } from './otrProfile.controller';
import { asyncHandler } from '../../utils/asyncHandler';

export const otrProfileRouter = Router();

otrProfileRouter.use(requireAuth);
otrProfileRouter.get('/', asyncHandler(getMyProfile));
otrProfileRouter.patch('/', asyncHandler(updateMyProfile));
