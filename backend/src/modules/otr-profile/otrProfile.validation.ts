import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(1).optional(),
  dateOfBirth: z.string().datetime().optional(), // ISO 8601
  gender: z.string().optional(),
  guardianName: z.string().optional(),
  mobile: z.string().min(6).optional(),
  address: z
    .object({
      addressLine: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      pincode: z.string().min(4),
    })
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
