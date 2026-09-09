import express from 'express';
import request from 'supertest';
import { pool } from '../src/db/client';
import { seedGovernmentClients } from '../src/modules/government-clients/governmentClients.service';
import { requireGovClientAuth, GovClientAuthedRequest } from '../src/middleware/govClientAuth';
import { errorHandler } from '../src/middleware/errorHandler';

// Phase 1 test-only harness: a tiny app with one protected route, so this
// suite exercises the real middleware end-to-end (real DB lookup + real
// scrypt verification) without depending on any Phase 2+ route that
// doesn't exist yet.
function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.get('/protected', requireGovClientAuth, (req: GovClientAuthedRequest, res) => {
    res.json({ success: true, data: { govClientId: req.govClientId } });
  });
  app.use(errorHandler);
  return app;
}

const app = buildTestApp();

function basicAuthHeader(clientId: string, secret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`;
}

beforeAll(async () => {
  process.env.SSC_OTR_CLIENT_SECRET = 'test_ssc_secret_fixed_for_this_suite';
  await seedGovernmentClients();
});

afterAll(async () => {
  await pool.end();
});

describe('requireGovClientAuth', () => {
  it('accepts valid client_id + correct secret', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', basicAuthHeader('SSC_EXAM_PORTAL', 'test_ssc_secret_fixed_for_this_suite'));

    expect(res.status).toBe(200);
    expect(res.body.data.govClientId).toBe('SSC_EXAM_PORTAL');
  });

  it('rejects a valid client_id with the wrong secret', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', basicAuthHeader('SSC_EXAM_PORTAL', 'totally_wrong_secret'));

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CLIENT_CREDENTIALS');
  });

  it('rejects a request with no Authorization header', async () => {
    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_CLIENT_CREDENTIALS');
  });

  it('rejects an unknown/unregistered client_id with the same generic error as a wrong secret', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', basicAuthHeader('NOT_A_REAL_CLIENT', 'anything'));

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CLIENT_CREDENTIALS');
  });

  it('rejects a malformed Authorization header', async () => {
    const res = await request(app).get('/protected').set('Authorization', 'Bearer not-basic-auth');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_CLIENT_CREDENTIALS');
  });
});

// Sanity check that seeding is idempotent and doesn't rotate an existing
// client's secret on repeated server starts (would otherwise silently
// break a deployed portal's stored credential on every redeploy).
describe('seedGovernmentClients secret stability', () => {
  it('does not change an already-hashed client secret on a second seed call', async () => {
    await seedGovernmentClients();

    const res = await request(app)
      .get('/protected')
      .set('Authorization', basicAuthHeader('SSC_EXAM_PORTAL', 'test_ssc_secret_fixed_for_this_suite'));

    expect(res.status).toBe(200);
  });
});
