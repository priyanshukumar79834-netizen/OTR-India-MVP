import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/db/client';

afterAll(async () => {
  await pool.end();
});

describe('GET /api/health', () => {
  it('returns healthy status with a live DB connection', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.database).toBe('connected');
  });
});
