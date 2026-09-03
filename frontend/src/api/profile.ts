import { api } from './client';
import { CanonicalProfile } from '../types';

export function fetchMyProfile() {
  return api.get<CanonicalProfile>('/otr/profile');
}

export interface UpdateProfileInput {
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  guardianName?: string;
  mobile?: string;
  address?: { addressLine: string; city: string; state: string; pincode: string };
  education?: {
    level: string;
    board?: string;
    institution?: string;
    yearOfPassing?: number;
    percentage?: number;
  }[];
}

export function updateMyProfile(input: UpdateProfileInput) {
  return api.patch<CanonicalProfile>('/otr/profile', input);
}
