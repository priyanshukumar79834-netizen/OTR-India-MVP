import { randomBytes } from 'crypto';

/**
 * Generates identifiers that are NOT derivable from Aadhaar, phone, DOB,
 * or email (MASTER_SPECIFICATION.md §12). Both use cryptographically
 * random bytes — never a hash or encoding of personal data.
 */
function randomSegment(length: number): string {
  return randomBytes(length)
    .toString('hex')
    .toUpperCase()
    .slice(0, length);
}

/** e.g. OTR-IND-8F3A92C1 */
export function generateOtrId(): string {
  return `OTR-IND-${randomSegment(8)}`;
}

/** e.g. APP-SSC-2026-4F2A */
export function generateApplicationRefId(portalCode: string, year = new Date().getFullYear()): string {
  const safeCode = portalCode.replace(/[^A-Z0-9]/gi, '').toUpperCase() || 'GEN';
  return `APP-${safeCode}-${year}-${randomSegment(4)}`;
}

/** e.g. CONSENT-9B21F0 */
export function generateConsentReference(): string {
  return `CONSENT-${randomSegment(6)}`;
}

/**
 * Opaque access token for portal <-> OTR data retrieval (§12, Part 4/14).
 * Deliberately NOT a JWT and NOT derived from userId/consentId — a bare
 * 256-bit random value looked up server-side. This is what makes it a
 * genuine capability reference rather than a self-describing credential:
 * possessing it proves nothing except "OTR issued this," and every
 * property (who, which client, which scopes, expiry) lives in the
 * access_tokens row, not in the token string itself.
 */
export function generateAccessToken(): string {
  return `otr_at_${randomBytes(32).toString('hex')}`;
}
