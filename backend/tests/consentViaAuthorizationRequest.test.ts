import request from 'supertest';
import { eq, like } from 'drizzle-orm';
import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { users, governmentClients } from '../src/db/schema';
import { seedGovernmentClients } from '../src/modules/government-clients/governmentClients.service';
import { hashPassword } from '../src/utils/password';

/**
 * Phase 3 — proves the browser-facing consent flow is now actually driven
 * by a server-created `access_requests` row (Phase 2), not by whatever a
 * browser puts in the request body. This is the missing link the
 * architecture review flagged: Phase 2 built the authenticated
 * request-creation endpoint but consent.service.ts still only knew how to
 * read clientId/requestedFields straight off the citizen's own POST body.
 *
 * Deterministic client credentials are set directly (same pattern as
 * governmentClientRequests.test.ts) rather than relying on
 * seedGovernmentClients()'s "never overwrite an existing hash" behavior,
 * which is order-dependent across test files sharing one DB.
 */

const app = createApp();
let citizenToken: string;

const SSC_SECRET = 'test_ssc_secret_phase3';
const SSC_REDIRECT = 'http://localhost:5174/callback';

function basicAuthHeader(clientId: string, secret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`;
}

async function createValidRequest(fields = ['identity.fullName', 'identity.dateOfBirth']) {
  const res = await request(app)
    .post('/api/government-clients/requests')
    .set('Authorization', basicAuthHeader('SSC_EXAM_PORTAL', SSC_SECRET))
    .send({
      redirectUri: SSC_REDIRECT,
      purpose: 'Junior Engineer Recruitment 2026 application',
      requestedFields: fields,
    });
  expect(res.status).toBe(201);
  return res.body.data.requestId as string;
}

beforeAll(async () => {
  await seedGovernmentClients();
  await db
    .update(governmentClients)
    .set({ clientSecretHash: hashPassword(SSC_SECRET), redirectUris: [SSC_REDIRECT] })
    .where(eq(governmentClients.clientId, 'SSC_EXAM_PORTAL'));

  const res = await request(app).post('/api/auth/register').send({
    email: 'priya@phase3-test.example',
    password: 'demoPassword123',
    fullName: 'Priya Citizen',
  });
  citizenToken = res.body.data.token;

  await request(app).patch('/api/otr/profile').set('Authorization', `Bearer ${citizenToken}`).send({
    mobile: '9000000002',
    address: { addressLine: '2 Demo Road', city: 'Delhi', state: 'Delhi', pincode: '110001' },
  });
});

afterAll(async () => {
  await db.delete(users).where(like(users.email, '%@phase3-test.example'));
  await pool.end();
});

describe('GET /api/government-clients/requests/:requestId — exposes redirectUri', () => {
  it('includes the registered redirectUri so the browser can complete the round trip', async () => {
    const requestId = await createValidRequest();

    const res = await request(app)
      .get(`/api/government-clients/requests/${requestId}`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.redirectUri).toBe(SSC_REDIRECT);
  });
});

describe('POST /api/consent/decisions — requestId path', () => {
  it('GRANTED: issues a token scoped to exactly the server-resolved requestedFields, ignoring any client-sent override', async () => {
    const requestId = await createValidRequest(['identity.fullName', 'identity.dateOfBirth']);

    const res = await request(app)
      .post('/api/consent/decisions')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        requestId,
        decision: 'GRANTED',
        // An attacker-controlled browser trying to widen scope by also
        // sending clientId/requestedFields alongside requestId — these
        // MUST be ignored entirely once requestId is present.
        clientId: 'SSC_EXAM_PORTAL',
        requestedFields: ['identity.fullName', 'identity.dateOfBirth', 'contact.mobile', 'address'],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken.token).toMatch(/^otr_at_/);
    expect(res.body.data.consent.requestedFields).toEqual(['identity.fullName', 'identity.dateOfBirth']);

    const dataRes = await request(app).post('/api/access/data').send({ token: res.body.data.accessToken.token });
    expect(dataRes.status).toBe(200);
    expect(dataRes.body.data.data).toHaveProperty('candidate_name', 'Priya Citizen');
    // contact.mobile / address were never part of the server-resolved
    // request, despite being in the (ignored) browser-sent override above.
    expect(dataRes.body.data.data).not.toHaveProperty('mobile_no');
    expect(dataRes.body.data.data).not.toHaveProperty('postal_address');
  });

  it('DENIED: records the decision and issues no token', async () => {
    const requestId = await createValidRequest(['identity.fullName']);

    const res = await request(app)
      .post('/api/consent/decisions')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ requestId, decision: 'DENIED' });

    expect(res.status).toBe(201);
    expect(res.body.data.consent.decision).toBe('DENIED');
    expect(res.body.data.accessToken).toBeNull();
  });

  it('a GRANTED request can never be redeemed twice (anti-replay)', async () => {
    const requestId = await createValidRequest(['identity.fullName']);

    const first = await request(app)
      .post('/api/consent/decisions')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ requestId, decision: 'GRANTED' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/consent/decisions')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ requestId, decision: 'GRANTED' });
    expect(second.status).toBe(404);
    expect(second.body.error.code).toBe('REQUEST_NOT_FOUND');
  });

  it('a DENIED request cannot later be replayed as GRANTED', async () => {
    const requestId = await createValidRequest(['identity.fullName']);

    const deny = await request(app)
      .post('/api/consent/decisions')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ requestId, decision: 'DENIED' });
    expect(deny.status).toBe(201);

    const grant = await request(app)
      .post('/api/consent/decisions')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ requestId, decision: 'GRANTED' });
    expect(grant.status).toBe(404);
    expect(grant.body.error.code).toBe('REQUEST_NOT_FOUND');
  });

  it('an unknown/garbage requestId is rejected before any consent row is created', async () => {
    const res = await request(app)
      .post('/api/consent/decisions')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ requestId: 'otr_req_does_not_exist', decision: 'GRANTED' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('REQUEST_NOT_FOUND');
  });

  it('rejects a body with neither requestId nor clientId+requestedFields', async () => {
    const res = await request(app)
      .post('/api/consent/decisions')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ decision: 'GRANTED' });

    expect(res.status).toBe(400);
  });

  it('legacy direct path (no requestId) still works unchanged', async () => {
    const res = await request(app)
      .post('/api/consent/decisions')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ clientId: 'SSC_EXAM_PORTAL', requestedFields: ['identity.fullName'], decision: 'GRANTED' });

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken.token).toMatch(/^otr_at_/);
  });
});
