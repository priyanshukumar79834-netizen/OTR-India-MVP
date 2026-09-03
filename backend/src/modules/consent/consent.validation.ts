import { z } from 'zod';

export const decideConsentSchema = z.object({
  clientId: z.string().min(1),
  requestedFields: z.array(z.string().min(1)).min(1),
  decision: z.enum(['GRANTED', 'DENIED']),
  purpose: z.string().min(1).default('Government application'),
});

export type DecideConsentInput = z.infer<typeof decideConsentSchema>;
