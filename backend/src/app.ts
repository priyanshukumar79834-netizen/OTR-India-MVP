import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { healthRouter } from './modules/health/health.routes';
import { authRouter } from './modules/auth/auth.routes';
import { otrProfileRouter } from './modules/otr-profile/otrProfile.routes';
import { auditRouter } from './modules/audit/audit.routes';
import { consentRouter } from './modules/consent/consent.routes';
import { accessRouter } from './modules/access/access.routes';
import { documentsRouter } from './modules/documents/documents.routes';
import { applicationsRouter } from './modules/applications/applications.routes';
import { governmentClientsRouter } from './modules/government-clients/governmentClients.routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      // OTR's own frontend AND the standalone Mock SSC frontend both call
      // this backend directly from the browser (SSC never proxies through
      // OTR's server) — both origins must be explicitly allowed.
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
    })
  );
  app.use(express.json());

  // --- Foundation routes ---
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/otr/profile', otrProfileRouter);
  app.use('/api/audit-logs', auditRouter);

  // --- Trust layer (single-owner MVP consolidation, Sept 2026) ---
  // See docs/ARCHITECTURE_DECISIONS.md §8 for why this replaced the
  // reserved-per-developer mount points below.
  app.use('/api/government-clients', governmentClientsRouter);
  app.use('/api/consent', consentRouter);
  app.use('/api/access', accessRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/applications', applicationsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
