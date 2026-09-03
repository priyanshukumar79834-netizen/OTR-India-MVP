import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { ok, fail } from '../../utils/apiResponse';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    return ok(res, { status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    return fail(res, 503, 'DB_UNAVAILABLE', 'Database connection failed');
  }
});
