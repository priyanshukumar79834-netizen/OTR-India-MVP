import request from 'supertest';
import { eq, like } from 'drizzle-orm';
import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { users, accessRequests, governmentClients } from '../src/db/schema';
import { seedGovernmentClients } from '../src/modules/government-clients/governmentClients.service';
import { consumeAuthorizationRequest } from '../src/modules/government-clients/governmentClientRequests.service';
import { hashPassword } from '../src/utils/password';

const app = createApp();
let citizenToken: string;

const SSC_SECRET = 'test_ssc_secret_phase2';
const SCHOLARSHIP_SECRET = 'test_scholarship_secret_phase2';
const SSC_REDIRECT = 'http://localhost:5174/callback';
const SCHOLARSHIP_REDIRECT = 'http://localhost:5175/callback';

function basicAuthHeader(clientId: string, secret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`;
}

beforeAll(async () => {
  // seedGovernmentClients() is intentionally idempotent and never rotates
  // an already-set secret (Phase 1 guarantee) — so if an earlier test
  // suite already seeded these rows with a different secret, calling it
  // again here would silently no-op. Set deterministic, known-to-this-suite
  // credentials directly so this suite's expectations don't depend on
  // Jest's file execution order.
  await seedGovernmentClients();
  await db
    .update(governmentClients)
    .set({ clientSecretHash: hashPassword(SSC_SECRET), redirectUris: [SSC_REDIRECT] })
    .where(eq(governmentClients.clientId, 'SSC_EXAM_PORTAL'));
  await db
    .update(governmentClients)
    .set({ clientSecretHash: hashPassword(SCHOLARSHIP_SECRET), redirectUris: [SCHOLARSHIP_REDIRECT] })
    .where(eq(governmentClients.clientId, 'SCHOLARSHIP_PORTAL'));

  const res = await request(app).post('/api/auth/register').send({
    email: 'priya@phase2-test.example',
    password: 'demoPassword123',
    fullName: 'Priya Citizen',
  });
  citizenToken = res.body.data.token;
});

afterAll(async () => {
  await db.delete(users).where(like(users.email, '%@phase2-test.example'));
  await pool.end();
});

describe('POST /api/government-clients/requests', () => {
  it('lets an authenticated, registered client create a valid request', async () => {
    const res = await request(app)
      .post('/api/government-clients/requests')
      .set('Authorization', basicAuthHeader('SSC_EXAM_PORTAL', SSC_SECRET))
      .send({
        redirectUri: SSC_REDIRECT,
        purpose: 'Junior Engineer Recruitment 2026 application',
        requestedFields: ['identity.fullName', 'identity.dateOfBirth'],
      });

    expect(res.status).toBe(201);
    expect(typeof res.body.data.requestId).toBe('string');
    expect(res.body.data.requestId.length).toBeGreaterThan(10);
    expect(res.body.data.expiresAt).toBeDefined();
    // Internal DB id must never be exposed alongside the opaque request_id.
    expect(res.body.data.id).toBeUndefined();
  });

  it('rejects an unauthenticated request (no credentials)', async () => {
    const res = await request(app).post('/api/government-clients/requests').send({
      redirectUri: SSC_REDIRECT,
      requestedFields: ['identity.fullName'],
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_CLIENT_CREDENTIALS');
  });

  it('rejects an unknown client', async () => {
    const res = await request(app)
      .post('/api/government-clients/requests')
      .set('Authorization', basicAuthHeader('NOT_A_REAL_CLIENT', 'whatever'))
      .send({ redirectUri: SSC_REDIRECT, requestedFields: ['identity.fullName'] });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CLIENT_CREDENTIALS');
  });

  it('rejects a redirect_uri that is not on this client\'s allowlist', async () => {
    const res = await request(app)
      .post('/api/government-clients/requests')
      .set('Authorization', basicAuthHeader('SSC_EXAM_PORTAL', SSC_SECRET))
      .send({
        redirectUri: 'https://attacker.example/steal',
        requestedFields: ['identity.fullName'],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('REDIRECT_URI_NOT_ALLOWED');
  });

  it('rejects a redirect_uri that belongs to a DIFFERENT registered client', async () => {
    // SCHOLARSHIP_REDIRECT is valid for SCHOLARSHIP_PORTAL, not SSC_EXAM_PORTAL.
    const res = await request(app)
      .post('/api/government-clients/requests')
      .set('Authorization', basicAuthHeader('SSC_EXAM_PORTAL', SSC_SECRET))
      .send({
        redirectUri: SCHOLARSHIP_REDIRECT,
        requestedFields: ['identity.fullName'],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('REDIRECT_URI_NOT_ALLOWED');
  });

  it('rejects a requested field outside the client\'s registered scope ceiling', async () => {
    const res = await request(app)
      .post('/api/government-clients/requests')
      .set('Authorization', basicAuthHeader('SSC_EXAM_PORTAL', SSC_SECRET))
      .send({
        redirectUri: SSC_REDIRECT,
        // contact.email is not in SSC_EXAM_PORTAL's allowedScopes
        requestedFields: ['identity.fullName', 'contact.email'],
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SCOPE_NOT_ALLOWED');
  });
});

describe('GET /api/government-clients/requests/:requestId', () => {
  async function createValidRequest() {
    const res = await request(app)
      .post('/api/government-clients/requests')
      .set('Authorization', basicAuthHeader('SSC_EXAM_PORTAL', SSC_SECRET))
      .send({
        redirectUri: SSC_REDIRECT,
        purpose: 'Test resolve path',
        requestedFields: ['identity.fullName'],
      });
    return res.body.data.requestId as string;
  }

  it('resolves a PENDING, unexpired request for a logged-in citizen', async () => {
    const requestId = await createValidRequest();

    const res = await request(app)
      .get(`/api/government-clients/requests/${requestId}`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.requestId).toBe(requestId);
    expect(res.body.data.client.clientId).toBe('SSC_EXAM_PORTAL');
    expect(res.body.data.requestedFields).toEqual(['identity.fullName']);
  });

  it('returns a generic not-found for an unknown request_id', async () => {
    const res = await request(app)
      .get('/api/government-clients/requests/otr_req_does_not_exist')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('REQUEST_NOT_FOUND');
  });

  it('rejects resolving an expired request', async () => {
    const requestId = await createValidRequest();
    // Force expiry directly, rather than waiting 10 real minutes.
    await db
      .update(accessRequests)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(accessRequests.requestId, requestId));

    const res = await request(app)
      .get(`/api/government-clients/requests/${requestId}`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('REQUEST_NOT_FOUND');
  });

  it('prevents replay of an already-consumed request', async () => {
    const requestId = await createValidRequest();

    // Consumption itself is Phase 3's job to trigger via the consent
    // flow; Phase 2 only guarantees the service function exists and is
    // safe to call. Exercised directly here.
    const [userRow] = await db.select().from(users).limit(1);
    await consumeAuthorizationRequest(requestId, userRow.id);

    const res = await request(app)
      .get(`/api/government-clients/requests/${requestId}`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('REQUEST_NOT_FOUND');

    // A second consume attempt must also fail (anti-replay), not silently succeed.
    await expect(consumeAuthorizationRequest(requestId, userRow.id)).rejects.toThrow();
  });
});
