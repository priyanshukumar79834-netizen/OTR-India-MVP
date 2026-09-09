import { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from './errorHandler';
import { verifyGovClientCredentials } from '../modules/government-clients/governmentClients.service';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Phase 1 — government-client authentication boundary.
 *
 * This is a SEPARATE trust boundary from `requireAuth` (middleware/auth.ts).
 * `requireAuth` proves "this is an authenticated citizen's browser session."
 * `requireGovClientAuth` proves "this call genuinely originates from a
 * registered government portal's own backend" — the piece that was
 * previously missing entirely (a public `client_id` string was trusted on
 * its own). Nothing calls this middleware yet in Phase 1; it exists as
 * reusable infrastructure for Phase 2/4 to attach to the new/changed
 * routes without touching the currently-working, unauthenticated ones.
 *
 * Mechanism: standard HTTP Basic auth, `Authorization: Basic base64(client_id:secret)`.
 * The secret is verified against a scrypt hash (utils/password.ts) — the
 * exact same primitive already used for citizen passwords, reused rather
 * than reinvented. This is a hackathon-appropriate mechanism; see
 * docs/ARCHITECTURE_DECISIONS.md for the documented production upgrade
 * path (OAuth2 client-credentials, private-key JWT, or mTLS).
 */
export interface GovClientAuthedRequest extends Request {
  govClientId?: string;
}

function parseBasicAuth(header: string | undefined): { clientId: string; secret: string } | null {
  if (!header || !header.startsWith('Basic ')) return null;
  const encoded = header.slice('Basic '.length).trim();
  let decoded: string;
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    return null;
  }
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) return null;
  const clientId = decoded.slice(0, separatorIndex);
  const secret = decoded.slice(separatorIndex + 1);
  if (!clientId || !secret) return null;
  return { clientId, secret };
}

/**
 * Wrapped in asyncHandler (like every other async Express handler in this
 * codebase — see the modules/**​/*.routes.ts files) so a thrown AppError actually
 * reaches errorHandler instead of becoming an unhandled promise rejection.
 * Express 4 does not automatically catch rejected promises from
 * middleware; without this wrapper, an invalid request would hang instead
 * of returning 401.
 */
export const requireGovClientAuth: RequestHandler = asyncHandler(
  async (req: GovClientAuthedRequest, _res: Response, next: NextFunction) => {
    const credentials = parseBasicAuth(req.headers.authorization);

    if (!credentials) {
      throw new AppError(
        401,
        'MISSING_CLIENT_CREDENTIALS',
        'This endpoint requires government-client authentication (HTTP Basic: client_id:secret).'
      );
    }

    const isValid = await verifyGovClientCredentials(credentials.clientId, credentials.secret);

    if (!isValid) {
      // Deliberately the SAME code/message whether the client_id is unknown,
      // inactive, or the secret is simply wrong — never let this endpoint be
      // used to enumerate which client IDs are registered.
      throw new AppError(401, 'INVALID_CLIENT_CREDENTIALS', 'Government-client authentication failed.');
    }

    req.govClientId = credentials.clientId;
    next();
  }
);
