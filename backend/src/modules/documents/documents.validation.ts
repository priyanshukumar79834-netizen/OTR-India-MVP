import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  documentType: z.string().min(1), // e.g. "12th Marksheet" — matches credentials.type vocabulary
  fileName: z.string().min(1),
  saveToProfile: z.boolean().default(true),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
