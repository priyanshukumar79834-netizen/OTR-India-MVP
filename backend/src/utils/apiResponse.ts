import { Response } from 'express';

/**
 * Standard API response envelope for the whole project (MASTER_SPECIFICATION.md §23).
 * Every endpoint — regardless of which developer/module owns it — should
 * respond using these helpers so Adi's frontend can rely on one shape.
 */
export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function created<T>(res: Response, data: T) {
  return ok(res, data, 201);
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function fail(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown
) {
  const body: ApiErrorBody = { success: false, error: { code, message, details } };
  return res.status(status).json(body);
}
