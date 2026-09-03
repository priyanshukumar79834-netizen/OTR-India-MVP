/**
 * These mirror backend/src/types/canonical.ts 1:1. Kept as a hand-mirrored
 * copy (not a shared package) to avoid introducing a monorepo build step
 * for the hackathon — if the canonical shape changes, this file must be
 * updated to match (flagged in PROJECT_STATUS.md).
 */

export interface CanonicalIdentity {
  fullName: string;
  dateOfBirth: string; // ISO 8601
  gender?: string;
  guardianName?: string;
}

export interface CanonicalContact {
  mobile: string;
  email: string;
}

export interface CanonicalAddress {
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
}

export interface CanonicalEducationRecord {
  level: string; // 'secondary' | 'seniorSecondary' | 'graduation' | custom
  board?: string;
  institution?: string;
  yearOfPassing?: number;
  percentage?: number;
}

export type CredentialStatus =
  | 'USER_PROVIDED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'REVOKED';

export interface CanonicalCredential {
  id: string;
  type: string;
  issuer: string;
  verificationStatus: CredentialStatus;
  issueDate?: string;
  expiry?: string;
  reference?: string;
}

export interface CanonicalProfile {
  otrId: string;
  identity: CanonicalIdentity;
  contact: CanonicalContact;
  address?: CanonicalAddress;
  education: CanonicalEducationRecord[];
  credentials: CanonicalCredential[];
}

// ---------------------------------------------------------------------
// TRUST-LAYER TYPES
//
// These mirror the real backend response shapes (consent, access tokens,
// documents, applications, audit log) — see src/api/*.ts for the actual
// fetch functions, which have their own more precise per-endpoint types.
// The MockDocument/MockPortal/etc. names below predate the single-owner
// MVP consolidation (Sept 2026), when this was Adi's client-side
// placeholder; kept for now to avoid an unrelated rename churning every
// import site, but nothing here is mock data anymore.
// ---------------------------------------------------------------------

export interface MockDocument {
  id: string;
  credentialType: string; // e.g. '10th Marksheet'
  fileName: string;
  uploadedAt: string;
}

export interface PortalFieldRequest {
  canonicalPath: string; // e.g. 'identity.fullName'
  label: string; // human label for the consent screen
}

export interface MockPortal {
  id: string;
  name: string; // e.g. 'GovRecruit-A'
  organisation: string;
  fieldMap: Record<string, string>; // portal's own field name -> canonical path
  requestedFields: PortalFieldRequest[];
  appSpecificFields: { key: string; label: string; type: 'text' | 'select'; options?: string[] }[];
}

export interface ConsentHistoryEntry {
  consentReference: string;
  requestingApp: string;
  requestedFields: string[];
  decision: 'GRANTED' | 'DENIED' | 'EXPIRED';
  decidedAt: string;
}

export interface AccessHistoryEntry {
  event: string;
  requestingSystem: string;
  result: string;
  createdAt: string;
}

export type ApplicationStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED';

export interface ApplicationRecord {
  applicationRefId: string;
  applicationName: string;
  organisation: string;
  date: string;
  status: ApplicationStatus;
  portalId: string;
  sharedFields: string[];
  appSpecificData: Record<string, string>;
}
