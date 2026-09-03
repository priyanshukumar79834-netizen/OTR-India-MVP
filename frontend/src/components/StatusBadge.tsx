import { CredentialStatus } from '../types';

const CREDENTIAL_STYLE: Record<CredentialStatus, { cls: string; label: string }> = {
  VERIFIED: { cls: 'badge-ok', label: 'Verified' },
  PENDING_VERIFICATION: { cls: 'badge-pending', label: 'Pending Verification' },
  USER_PROVIDED: { cls: 'badge-neutral', label: 'User Provided' },
  REJECTED: { cls: 'badge-danger', label: 'Rejected' },
  EXPIRED: { cls: 'badge-danger', label: 'Expired' },
  REVOKED: { cls: 'badge-danger', label: 'Revoked' },
};

export function CredentialStatusBadge({ status }: { status: CredentialStatus }) {
  const s = CREDENTIAL_STYLE[status];
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function ConsentStatusBadge({ decision }: { decision: 'GRANTED' | 'DENIED' | 'EXPIRED' }) {
  const map = {
    GRANTED: { cls: 'badge-ok', label: 'Granted' },
    DENIED: { cls: 'badge-danger', label: 'Denied' },
    EXPIRED: { cls: 'badge-neutral', label: 'Expired' },
  } as const;
  const s = map[decision];
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function ApplicationStatusBadge({ status }: { status: string }) {
  const cls = status === 'ACCEPTED' ? 'badge-ok' : status === 'REJECTED' ? 'badge-danger' : 'badge-pending';
  const label = status
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function DataCategoryTag({ kind }: { kind: 'reusable' | 'app-specific' }) {
  return (
    <span className={`badge ${kind === 'reusable' ? 'badge-reusable' : 'badge-app'}`}>
      {kind === 'reusable' ? 'Reusable OTR data' : 'Application-specific'}
    </span>
  );
}
