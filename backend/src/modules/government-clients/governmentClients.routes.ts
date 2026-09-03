import { Router } from 'express';
import { Response } from 'express';
import { db } from '../../db/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/apiResponse';

export const governmentClientsRouter = Router();

governmentClientsRouter.get(
  '/',
  asyncHandler(async (_req, res: Response) => {
    const clients = await db.query.governmentClients.findMany();
    // Public listing (no auth) — this is what a citizen sees on the OTR
    // side before choosing "Use OTR" on a portal; nothing sensitive here.
    const entries = clients
      .filter((c) => c.active === 'true')
      .map((c) => ({
        clientId: c.clientId,
        name: c.name,
        organisation: c.organisation,
        allowedScopes: c.allowedScopes,
      }));
    return ok(res, { entries });
  })
);
