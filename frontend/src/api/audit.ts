import { api } from './client';

export interface AuditLogEntry {
  id: string;
  event: string;
  requestingSystem: string | null;
  result: string;
  createdAt: string;
}

export function fetchMyAuditLog() {
  return api.get<{ entries: AuditLogEntry[] }>('/audit-logs');
}
