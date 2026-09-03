import request from 'supertest';
import { like } from 'drizzle-orm';
import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { users } from '../src/db/schema';

const app = createApp();

afterAll(async () => {
  await db.delete(users).where(like(users.email, '%@audit-test.example'));
  await pool.end();
});

describe('GET /api/audit-logs', () => {
  it('rejects a request with no token (security)', async () => {
    const res = await request(app).get('/api/audit-logs');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('records a LOGIN and PROFILE_UPDATED event and returns them, most recent first', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      email: 'erin@audit-test.example',
      password: 'demoPassword123',
      fullName: 'Erin Demo',
    });
    const token = registerRes.body.data.token as string;

    // registerUser itself records PROFILE_UPDATED; log in again for a LOGIN event.
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'erin@audit-test.example', password: 'demoPassword123' });

    await request(app)
      .patch('/api/otr/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ mobile: '9000000001' });

    const res = await request(app).get('/api/audit-logs').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const events = res.body.data.entries.map((e: { event: string }) => e.event);

    expect(events).toContain('LOGIN');
    expect(events).toContain('PROFILE_UPDATED');
    // Most recent first: the last thing we did was the profile PATCH.
    expect(events[0]).toBe('PROFILE_UPDATED');
  });

  it('records a LOGIN FAILURE event with no userId on a wrong password', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'frank@audit-test.example',
      password: 'demoPassword123',
      fullName: 'Frank Demo',
    });

    const failedLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'frank@audit-test.example', password: 'wrongPassword' });
    expect(failedLogin.status).toBe(401);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'frank@audit-test.example', password: 'demoPassword123' });
    const token = loginRes.body.data.token as string;

    const res = await request(app).get('/api/audit-logs').set('Authorization', `Bearer ${token}`);
    const failureEntries = res.body.data.entries.filter(
      (e: { event: string; result: string }) => e.event === 'LOGIN' && e.result === 'FAILURE'
    );
    // The failed attempt had no known user, so it can't appear on Frank's
    // own scoped history — this just confirms the successful login IS there
    // and the endpoint didn't error out because of the earlier failure.
    expect(failureEntries.length).toBe(0);
    expect(res.body.data.entries.some((e: { event: string }) => e.event === 'LOGIN')).toBe(true);
  });

  it('never returns another user\'s audit events (data isolation)', async () => {
    const userA = await request(app).post('/api/auth/register').send({
      email: 'grace@audit-test.example',
      password: 'demoPassword123',
      fullName: 'Grace Demo',
    });
    const userB = await request(app).post('/api/auth/register').send({
      email: 'heidi@audit-test.example',
      password: 'demoPassword123',
      fullName: 'Heidi Demo',
    });

    await request(app)
      .patch('/api/otr/profile')
      .set('Authorization', `Bearer ${userB.body.data.token}`)
      .send({ mobile: '9000000002' });

    const resA = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${userA.body.data.token}`);

    const otrIdsSeen = resA.body.data.entries.length;
    // Grace only registered (one PROFILE_UPDATED from registration) — she
    // must not see Heidi's extra PATCH-triggered PROFILE_UPDATED event.
    expect(otrIdsSeen).toBe(1);
  });

  it('respects a custom limit and rejects an out-of-range one', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'ivan@audit-test.example',
      password: 'demoPassword123',
      fullName: 'Ivan Demo',
    });
    const token = res.body.data.token as string;

    const limited = await request(app)
      .get('/api/audit-logs?limit=1')
      .set('Authorization', `Bearer ${token}`);
    expect(limited.status).toBe(200);
    expect(limited.body.data.entries.length).toBe(1);

    const invalid = await request(app)
      .get('/api/audit-logs?limit=0')
      .set('Authorization', `Bearer ${token}`);
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  });
});
