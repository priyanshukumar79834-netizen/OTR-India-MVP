import { api } from './client';

export interface DocumentEntry {
  id: string;
  userId: string;
  credentialId: string | null;
  documentType: string;
  fileName: string;
  storagePath: string;
  savedToProfile: string;
  createdAt: string;
}

export function fetchMyDocuments() {
  return api.get<{ entries: DocumentEntry[] }>('/documents');
}

export function uploadDocument(input: { documentType: string; fileName: string; saveToProfile?: boolean }) {
  return api.post<DocumentEntry>('/documents', input);
}
