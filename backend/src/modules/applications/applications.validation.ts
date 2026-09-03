import { z } from 'zod';

export const submitApplicationSchema = z.object({
  clientId: z.string().min(1),
  accessTokenId: z.string().min(1).optional(), // links to the token used to pull OTR data for this application
  applicationName: z.string().min(1),
  organisation: z.string().min(1),
  appSpecificData: z.record(z.string(), z.string()).default({}),
});

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;
