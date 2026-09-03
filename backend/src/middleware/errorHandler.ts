import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { fail } from '../utils/apiResponse';
import { logger } from '../utils/logger';

/** Throw this from services/controllers for expected, user-facing failures. */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFoundHandler(req: Request, res: Response) {
  return fail(res, 404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return fail(res, err.status, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Request failed validation', err.flatten());
  }

  // MASTER_SPECIFICATION.md §24: never expose raw internal errors to users.
  logger.error('Unhandled error', {
    message: err instanceof Error ? err.message : String(err),
    path: req.path,
    method: req.method,
  });

  return fail(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
}
