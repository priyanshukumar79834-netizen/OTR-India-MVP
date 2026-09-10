import { Response } from 'express';
import { created, ok } from '../../utils/apiResponse';
import { AppError } from '../../middleware/errorHandler';
import { GovClientAuthedRequest } from '../../middleware/govClientAuth';
import { AuthedRequest } from '../../middleware/auth';
import { createAuthorizationRequestSchema } from './governmentClientRequests.validation';
import { createAuthorizationRequest, resolveAuthorizationRequest } from './governmentClientRequests.service';

/**
 * POST /api/government-clients/requests
 * Auth: requireGovClientAuth (HTTP Basic client_id:secret)
 *
 * Body: { redirectUri, purpose?, requestedFields }
 * Response: { requestId, expiresAt } ONLY — deliberately no internal
 * `id`, and deliberately no echo of the full request contents back to
 * the caller beyond what it just sent itself.
 */
export async function createRequestHandler(req: GovClientAuthedRequest, res: Response) {
  if (!req.govClientId) {
    // Defensive only — requireGovClientAuth always sets this before next().
    throw new AppError(401, 'MISSING_CLIENT_CREDENTIALS', 'Government-client authentication is required.');
  }

  const input = createAuthorizationRequestSchema.parse(req.body);
  const summary = await createAuthorizationRequest(req.govClientId, input);

  return created(res, {
    requestId: summary.requestId,
    expiresAt: summary.expiresAt,
  });
}

/**
 * GET /api/government-clients/requests/:requestId
 * Auth: requireAuth (citizen JWT) — Phase 2 engineering decision: a
 * pending authorization request is only ever meaningful to a citizen who
 * is about to view a consent screen, so this is gated the same way the
 * rest of the citizen-facing API is, rather than left public. Phase 3
 * (OTR's actual /authorize page) decides what to do if the citizen isn't
 * logged in yet (redirect to login, preserving ?request_id=...) — that
 * UX flow is explicitly out of scope here.
 */
export async function getRequestHandler(req: AuthedRequest, res: Response) {
  const { requestId } = req.params;
  const summary = await resolveAuthorizationRequest(requestId);

  return ok(res, {
    requestId: summary.requestId,
    client: {
      clientId: summary.clientId,
      name: summary.clientName,
      organisation: summary.organisation,
    },
    purpose: summary.purpose,
    requestedFields: summary.requestedFields,
    // Needed so the citizen's browser can complete the round-trip after a
    // decision (AuthorizePage.tsx never re-reads a browser-supplied
    // redirect_uri — see Phase 3 notes there). Not sensitive: it's the
    // client's own registered callback URL, the same value it would have
    // sent the citizen's browser to directly under the old flow.
    redirectUri: summary.redirectUri,
    expiresAt: summary.expiresAt,
  });
}
