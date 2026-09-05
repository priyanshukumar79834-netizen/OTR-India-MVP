/**
 * Thin fetch wrapper. All real backend calls go through this — no screen
 * should call `fetch` directly (Master Spec §23 / ADI_DEVELOPER_INSTRUCTIONS §9).
 * Understands the shared `{ success, data }` / `{ success: false, error }`
 * envelope from backend/src/utils/apiResponse.ts.
 *
 * Base URL: defaults to the relative `/api` path, which only resolves
 * correctly in local dev because of the Vite dev-server proxy in
 * vite.config.ts (`/api` -> http://localhost:4000). That proxy does not
 * exist once this app is built and deployed as a static site, so
 * production deployments MUST set VITE_OTR_API_URL to the deployed
 * backend's origin (e.g. https://api.otr-india.example.com) — see
 * frontend/.env.example.
 */
const API_BASE = (import.meta.env.VITE_OTR_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const TOKEN_KEY = 'otr_india_token';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.');
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON response (e.g. proxy failure) — fall through to status-based error below.
  }

  if (!res.ok || !body || !body.success) {
    const code = body?.error?.code ?? `HTTP_${res.status}`;
    const message = body?.error?.message ?? 'Something went wrong. Please try again.';
    throw new ApiError(res.status, code, message);
  }

  return body.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
};
