/**
 * GovRecruit-A's OWN records — deliberately separate from anything OTR
 * stores. In a real deployment this would be the portal's own database;
 * for this hackathon prototype it's kept in the browser's localStorage,
 * namespaced to this app's origin (so it can never be read by or confused
 * with OTR's own storage on a different origin/port).
 *
 * What's stored here is exactly what a real government portal would keep
 * after an application: its own reference number, the application-specific
 * fields the citizen entered on THIS site, and a pointer (the OTR access
 * token) it can present again later for a follow-up retrieval — e.g.
 * generating an admit card — without asking the citizen to re-authorize.
 * This is what proves OTR is a durable interoperability layer, not a
 * one-time autofill: see MASTER_SPECIFICATION.md §12 (a token is not
 * proof of submission, and is reusable until expiry/revocation).
 */

export interface SscApplicationRecord {
  applicationRefId: string;
  method: 'MANUAL' | 'OTR';
  /** Present only for OTR-authorized applications — the durable pointer
   * back to OTR used for later retrieval (e.g. admit card). Manual
   * applications have no OTR involvement at all. */
  otrAccessToken?: string;
  examCentre: string;
  postPreference: string;
  candidateName: string;
  submittedAt: string;
  status: string;
}

const STORAGE_KEY = 'govrecruit_a_applications';

function readAll(): SscApplicationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SscApplicationRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(records: SscApplicationRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function saveApplication(record: SscApplicationRecord) {
  const all = readAll();
  all.unshift(record);
  writeAll(all);
}

export function listApplications(): SscApplicationRecord[] {
  return readAll();
}

export function getApplication(applicationRefId: string): SscApplicationRecord | undefined {
  return readAll().find((r) => r.applicationRefId === applicationRefId);
}

// --- Manual application reference generation -------------------------
// Manual applications never touch OTR's backend at all, so there's no
// server-issued reference to use. This mirrors the same
// APP-<PORTAL>-<YEAR>-XXXX shape the OTR-authorized path gets from the
// backend (see backend/src/utils/idGenerator.ts) for a consistent look,
// using a distinct portal code so it's still clear which path produced
// it if ever compared side by side.
export function generateManualApplicationRef(): string {
  const year = new Date().getFullYear();
  const segment = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `APP-GOVRECRUITA-${year}-${segment}`;
}
// Short-lived, sessionStorage: survives the redirect round-trip to OTR and
// back, cleared once the application is actually submitted.

interface PendingAuthorization {
  token: string;
  clientId: string;
  expiresAt: string;
}

const PENDING_KEY = 'govrecruit_a_pending_authorization';

export function savePendingAuthorization(p: PendingAuthorization) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(p));
}

export function getPendingAuthorization(): PendingAuthorization | null {
  const raw = sessionStorage.getItem(PENDING_KEY);
  return raw ? (JSON.parse(raw) as PendingAuthorization) : null;
}

export function clearPendingAuthorization() {
  sessionStorage.removeItem(PENDING_KEY);
}

// --- Draft application (in-progress, pre-submission) ----------------------
// Holds whatever's been collected so far — manually typed fields, or
// OTR-retrieved data plus SSC-specific fields — as the applicant moves
// through Review -> Payment -> Face Verification -> Submit. Cleared once
// the application is actually recorded. Kept in sessionStorage: it's
// working state for one visit, not a durable record (that's
// SscApplicationRecord, above).

export interface ManualDraft {
  method: 'MANUAL';
  fullName: string;
  dateOfBirth: string;
  gender: string;
  guardianName: string;
  mobile: string;
  email: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  qualification10th: string;
  qualification12th: string;
  examCentre: string;
  postPreference: string;
}

export interface OtrDraft {
  method: 'OTR';
  token: string;
  otrData: Record<string, unknown>;
  examCentre: string;
  postPreference: string;
  candidateName: string;
}

export type ApplicationDraft = ManualDraft | OtrDraft;

const DRAFT_KEY = 'govrecruit_a_draft_application';

export function saveDraft(draft: ApplicationDraft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function getDraft(): ApplicationDraft | null {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  return raw ? (JSON.parse(raw) as ApplicationDraft) : null;
}

export function clearDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
}
