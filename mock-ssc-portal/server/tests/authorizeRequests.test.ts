import request from 'supertest';
import { createApp } from '../src/app';

/**
 * These tests mock `fetch` rather than talking to a real OTR backend —
 * this package's whole job is "construct the right authenticated call to
 * OTR and relay the result," so that's exactly the boundary to test.
 * The real integration (this bridge -> a live OTR backend -> a real
 * access_requests row) is covered end-to-end separately, by actually
 * running both processes.
 */

const app = createApp();

function mockFetchOnce(status: number, body: unknown) {
  return jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /api/ssc/authorize-requests', () => {
  it('authenticates to OTR with this client\'s own Basic credentials and its own fixed redirectUri/requestedFields — never anything from the request body', async () => {
    const fetchSpy = mockFetchOnce(201, {
      success: true,
      data: { requestId: 'otr_req_abc123', expiresAt: '2026-09-10T12:10:00.000Z' },
    });

    const res = await request(app)
      .post('/api/ssc/authorize-requests')
      .send({
        purpose: 'Junior Engineer Recruitment 2026 application',
        // An attempt to smuggle a different redirectUri/requestedFields/
        // clientId through the body — must be silently ignored.
        redirectUri: 'https://attacker.example/steal',
        requestedFields: ['identity.fullName', 'contact.mobile', 'address', 'credentials.caste'],
        clientId: 'SOME_OTHER_CLIENT',
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      data: { requestId: 'otr_req_abc123', expiresAt: '2026-09-10T12:10:00.000Z' },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('http://otr.test.invalid/api/government-clients/requests');

    const headers = init?.headers as Record<string, string>;
    const expectedAuth = `Basic ${Buffer.from('SSC_EXAM_PORTAL:test_only_secret_do_not_reuse').toString('base64')}`;
    expect(headers.Authorization).toBe(expectedAuth);

    const sentBody = JSON.parse(init?.body as string);
    expect(sentBody.redirectUri).toBe('http://localhost:5174/callback');
    expect(sentBody.purpose).toBe('Junior Engineer Recruitment 2026 application');
    expect(sentBody.requestedFields).toEqual([
      'identity.fullName',
      'identity.dateOfBirth',
      'identity.guardianName',
      'contact.mobile',
      'address',
      'education.secondary',
      'education.seniorSecondary',
    ]);
    // The attacker-supplied overrides must never appear in the outbound call.
    expect(sentBody.clientId).toBeUndefined();
  });

  it('works with no body at all (purpose is optional)', async () => {
    mockFetchOnce(201, { success: true, data: { requestId: 'otr_req_xyz', expiresAt: '2026-09-10T12:10:00.000Z' } });

    const res = await request(app).post('/api/ssc/authorize-requests').send({});
    expect(res.status).toBe(201);
    expect(res.body.data.requestId).toBe('otr_req_xyz');
  });

  it('forwards OTR\'s rejection status/code/message unchanged, never a raw stack trace', async () => {
    mockFetchOnce(400, {
      success: false,
      error: { code: 'SCOPE_NOT_ALLOWED', message: 'One or more requested fields are outside this client\'s allowed scope.' },
    });

    const res = await request(app).post('/api/ssc/authorize-requests').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'SCOPE_NOT_ALLOWED', message: "One or more requested fields are outside this client's allowed scope." },
    });
  });

  it('returns a clean 502 if OTR is unreachable, not an unhandled exception', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const res = await request(app).post('/api/ssc/authorize-requests').send({});
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('OTR_UNREACHABLE');
  });
});

describe('GET /health', () => {
  it('responds without needing to reach OTR at all', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });
});
