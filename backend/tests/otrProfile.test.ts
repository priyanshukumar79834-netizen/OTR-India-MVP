import request from 'supertest';
import { like } from 'drizzle-orm';
import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { users } from '../src/db/schema';

const app = createApp();
let token: string;

beforeAll(async () => {
  const res = await request(app).post('/api/auth/register').send({
    email: 'dave@profile-test.example',
    password: 'demoPassword123',
    fullName: 'Dave Demo',
  });
  token = res.body.data.token;
});

afterAll(async () => {
  // FK cascade (users -> profiles -> addresses/education) cleans up the rest.
  await db.delete(users).where(like(users.email, '%@profile-test.example'));
  await pool.end();
});

describe('GET /api/otr/profile', () => {
  it('returns the canonical profile for the authenticated user', async () => {
    const res = await request(app).get('/api/otr/profile').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.identity.fullName).toBe('Dave Demo');
    expect(res.body.data.otrId).toMatch(/^OTR-IND-/);
    expect(Array.isArray(res.body.data.education)).toBe(true);
  });

  it('rejects a request with no token (security)', async () => {
    const res = await request(app).get('/api/otr/profile');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a request with an invalid token (security)', async () => {
    const res = await request(app)
      .get('/api/otr/profile')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});

describe('PATCH /api/otr/profile', () => {
  it('updates reusable profile fields and persists them', async () => {
    const res = await request(app)
      .patch('/api/otr/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        mobile: '9000000000',
        address: {
          addressLine: '221B Demo Lane',
          city: 'Ghaziabad',
          state: 'Uttar Pradesh',
          pincode: '201001',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.contact.mobile).toBe('9000000000');
    expect(res.body.data.address?.city).toBe('Ghaziabad');

    const verify = await request(app)
      .get('/api/otr/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(verify.body.data.address?.pincode).toBe('201001');
  });

  it('rejects an invalid payload (e.g. malformed date)', async () => {
    const res = await request(app)
      .patch('/api/otr/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ dateOfBirth: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
