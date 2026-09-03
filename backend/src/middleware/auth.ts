import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errorHandler';

/**
 * Demo authentication boundary (MASTER_SPECIFICATION.md §15).
 *
 * This is intentionally simple for the hackathon: email/password + JWT.
 * It is NOT identity verification and must never be presented as
 * Aadhaar/biometric/government-grade auth. Authorization (what an
 * authenticated user can access) is layered on top by each module —
 * e.g. Anchal's consent checks, not this middleware.
 */

export interface AuthedRequest extends Request {
  userId?: string;
}

interface JwtPayload {
  sub: string; // userId
}

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid Authorization header');
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.userId = payload.sub;
    next();
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Session expired or token invalid');
  }
}

export function signAuthToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}
