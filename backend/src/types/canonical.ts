/**
 * Canonical OTR data model types (MASTER_SPECIFICATION.md §9).
 *
 * This is the shape Harsh's interoperability layer maps portal fields
 * to/from (e.g. Portal A `dob` -> canonical `dateOfBirth`). Treat this
 * file as a shared contract — changes here are shared-code changes
 * (TEAM_WORKFLOW.md §8): explain why, check dependents, tell the team.
 */

export interface CanonicalIdentity {
  fullName: string;
  dateOfBirth: string; // ISO 8601 date
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
  level: 'secondary' | 'seniorSecondary' | 'graduation' | string;
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

/** The full canonical profile shape — what OTR maintains per citizen. */
export interface CanonicalProfile {
  otrId: string;
  identity: CanonicalIdentity;
  contact: CanonicalContact;
  address?: CanonicalAddress;
  education: CanonicalEducationRecord[];
  credentials: CanonicalCredential[];
}

/**
 * A named subset of canonical field paths, used for consent requests and
 * data-minimization enforcement (§11). e.g. ["identity.fullName", "identity.dateOfBirth"].
 * Anchal's module is the actual enforcement point — this type just gives
 * everyone a consistent way to reference "which fields".
 */
export type CanonicalFieldPath = string;
