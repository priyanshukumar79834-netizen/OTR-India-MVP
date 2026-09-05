import { z } from 'zod';

export const submitApplicationSchema = z.object({
  clientId: z.string().min(1),
  accessTokenId: z.string().min(1).optional(), // links to the token used to pull OTR data for this application
  applicationName: z.string().min(1),
  organisation: z.string().min(1),
  appSpecificData: z.record(z.string(), z.string()).default({}),
});

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;

/**
 * Portal-facing submission: the caller is a government portal's own
 * frontend/backend (e.g. the standalone Mock SSC site), which has no
 * citizen JWT — it only ever holds the opaque access token issued at
 * consent time. That token IS the credential here, same pattern as
 * POST /api/access/data.
 */
export const submitApplicationViaTokenSchema = z.object({
  token: z.string().min(10),
  applicationName: z.string().min(1),
  appSpecificData: z.record(z.string(), z.string()).default({}),
});

export type SubmitApplicationViaTokenInput = z.infer<typeof submitApplicationViaTokenSchema>;
