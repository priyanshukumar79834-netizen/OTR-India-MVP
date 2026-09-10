import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { env } from './env';
import { createAuthorizationRequest, OtrRequestError } from './otrClient';

/**
 * Phase 3 bridge — this is the ONLY server-side component this portal
 * has. It exists solely so a client secret never has to live in browser
 * JS (mock-ssc-portal's Vite bundle). It deliberately does not become a
 * second full backend for GovRecruit-A: application records, tokens, and
 * everything else the portal needs continue to be handled the way they
 * already were (via OTR's own APIs directly from the browser, or
 * client-side storage — see docs/ARCHITECTURE_DECISIONS.md §8). This
 * process's only job is: authenticate to OTR, create one authorization
 * request, hand back the opaque requestId.
 */
export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.sscAppOrigin,
    })
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' } });
  });

  /**
   * POST /api/ssc/authorize-requests
   * Body: { purpose?: string } — the ONLY thing the browser gets to
   * influence. clientId, redirectUri, and requestedFields are always
   * this server's own fixed configuration (env.ts / requestedFields.ts),
   * never read from req.body — that's the actual security property this
   * route exists to enforce.
   */
  app.post('/api/ssc/authorize-requests', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const purpose = typeof req.body?.purpose === 'string' ? req.body.purpose : undefined;
      const result = await createAuthorizationRequest(purpose);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof OtrRequestError) {
      // Forward OTR's own status/code/message as-is — it's already
      // sanitized (see backend/src/middleware/govClientAuth.ts,
      // governmentClientRequests.service.ts), never a raw stack trace.
      res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
    });
  });

  return app;
}
