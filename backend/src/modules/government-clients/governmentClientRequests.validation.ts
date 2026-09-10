import { z } from 'zod';

/**
 * Body for POST /api/government-clients/requests.
 *
 * Deliberately does NOT accept clientId, requestingApp, or anything that
 * identifies "who is asking" — that comes exclusively from
 * `req.govClientId`, set by `requireGovClientAuth` from the authenticated
 * HTTP Basic credentials. This is the whole point of Phase 2: the caller
 * can describe the transaction it wants, but never who it is.
 */
export const createAuthorizationRequestSchema = z.object({
  redirectUri: z.string().min(1),
  purpose: z.string().min(1).max(300).optional(),
  requestedFields: z.array(z.string().min(1)).min(1),
});

export type CreateAuthorizationRequestInput = z.infer<typeof createAuthorizationRequestSchema>;
