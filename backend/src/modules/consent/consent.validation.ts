import { z } from 'zod';

/**
 * Two ways this body can be shaped:
 *
 *  1. Phase 3 (preferred) — `{ requestId, decision }`. clientId/
 *     requestedFields/purpose are deliberately NOT read from the body in
 *     this path even if present; consent.service.ts re-derives all three
 *     from the server-authenticated `access_requests` row the requestId
 *     points at. A browser can no longer say what was requested — only
 *     approve or deny a request that already exists server-side.
 *
 *  2. Legacy/direct — `{ clientId, requestedFields, decision, purpose? }`.
 *     Kept so existing Phase 1/2 callers and tests (a citizen-facing
 *     client that hasn't been upgraded to the server-created-request
 *     flow) keep working unchanged. Not the security boundary this phase
 *     is closing — see governmentClientRequests.service.ts for that.
 *
 * `.refine` enforces that at least one of the two shapes is actually
 * present, rather than silently accepting an empty request.
 */
export const decideConsentSchema = z
  .object({
    requestId: z.string().min(1).optional(),
    clientId: z.string().min(1).optional(),
    requestedFields: z.array(z.string().min(1)).min(1).optional(),
    decision: z.enum(['GRANTED', 'DENIED']),
    purpose: z.string().min(1).optional(),
  })
  .refine((data) => Boolean(data.requestId) || Boolean(data.clientId && data.requestedFields), {
    message: 'Either requestId, or clientId together with requestedFields, is required',
  });

export type DecideConsentInput = z.infer<typeof decideConsentSchema>;
