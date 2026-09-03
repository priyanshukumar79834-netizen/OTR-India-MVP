import request from 'supertest';
import { like } from 'drizzle-orm';
import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { users } from '../src/db/schema';

const app = createApp();

afterAll(async () => {
  await db.delete(users).where(like(users.email, '%@auth-test.example'));
  await pool.end();
});

describe('POST /api/auth/register', () => {
  it('registers a new user and returns a token + OTR ID', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'alice@auth-test.example',
      password: 'demoPassword123',
      fullName: 'Alice Demo',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.otrId).toMatch(/^OTR-IND-/);
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'bob@auth-test.example',
      password: 'demoPassword123',
      fullName: 'Bob Demo',
    });

    const res = await request(app).post('/api/auth/register').send({
      email: 'bob@auth-test.example',
      password: 'anotherPassword123',
      fullName: 'Bob Demo Duplicate',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('rejects a short password with a validation error', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'short@auth-test.example',
      password: '123',
      fullName: 'Short Pw',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login', () => {
  const credentials = {
    email: 'carol@auth-test.example',
    password: 'demoPassword123',
    fullName: 'Carol Demo',
  };

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send(credentials);
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
  });

  it('rejects an invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'wrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects a non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@auth-test.example', password: 'whatever123' });

    expect(res.status).toBe(401);
  });
});
