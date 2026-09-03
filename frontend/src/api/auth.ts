import { api } from './client';

export interface AuthResult {
  token: string;
  otrId: string;
  userId: string;
}

export function registerCitizen(input: { email: string; password: string; fullName: string }) {
  return api.post<AuthResult>('/auth/register', input);
}

export function loginCitizen(input: { email: string; password: string }) {
  return api.post<AuthResult>('/auth/login', input);
}
