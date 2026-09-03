import { CanonicalEducationRecord, CanonicalProfile } from '../../types/canonical';

/**
 * Interoperability / field-mapping layer (MASTER_SPECIFICATION.md §10,
 * Part 7-9 of the MVP brief). This is the server-side source of truth for
 * "what does clientId X call this canonical field" — the frontend's
 * `mock/portals.ts` mirrors this for display purposes, but this module is
 * what actually runs when data crosses the OTR <-> portal boundary via
 * `/api/access/data`.
 *
 * Deliberately a plain config object, not a database table or a plugin
 * system — adding a third portal is "add an entry here," matching §35's
 * requirement without over-engineering a connector framework for two
 * portals.
 */
export interface PortalFieldMapping {
  /** portal's own field name -> canonical dotted path */
  fieldMap: Record<string, string>;
}

export const PORTAL_MAPPINGS: Record<string, PortalFieldMapping> = {
  SSC_EXAM_PORTAL: {
    fieldMap: {
      candidate_name: 'identity.fullName',
      dob: 'identity.dateOfBirth',
      guardian_name: 'identity.guardianName',
      mobile_no: 'contact.mobile',
      postal_address: 'address',
      qualification_10th: 'education.secondary',
      qualification_12th: 'education.seniorSecondary',
    },
  },
  SCHOLARSHIP_PORTAL: {
    fieldMap: {
      applicant_full_name: 'identity.fullName',
      date_of_birth: 'identity.dateOfBirth',
      contact_email: 'contact.email',
      secondary_education: 'education.graduation',
    },
  },
};

/** Resolves a canonical dotted path against a real profile. Server-side
 * equivalent of the frontend's display-only resolver — this is the copy
 * that actually decides what leaves the system. */
export function resolveCanonicalValue(profile: CanonicalProfile, path: string): unknown {
  if (path === 'identity.fullName') return profile.identity.fullName;
  if (path === 'identity.dateOfBirth') return profile.identity.dateOfBirth;
  if (path === 'identity.guardianName') return profile.identity.guardianName ?? null;
  if (path === 'contact.mobile') return profile.contact.mobile;
  if (path === 'contact.email') return profile.contact.email;
  if (path === 'address') return profile.address ?? null;
  if (path.startsWith('education.')) {
    const level = path.split('.')[1];
    const record: CanonicalEducationRecord | undefined = profile.education.find((e) => e.level === level);
    return record ?? null;
  }
  return null;
}

/**
 * Maps a canonical profile into a portal's own field names, restricted to
 * exactly the given scopes (data minimization enforcement point — never
 * call this with more scopes than the access token actually carries).
 */
export function mapCanonicalToPortal(
  clientId: string,
  profile: CanonicalProfile,
  scopes: string[]
): Record<string, unknown> {
  const mapping = PORTAL_MAPPINGS[clientId];
  if (!mapping) {
    // No mapping configured yet for this client — return canonical paths
    // directly rather than silently dropping the response; still scoped.
    const fallback: Record<string, unknown> = {};
    for (const scope of scopes) fallback[scope] = resolveCanonicalValue(profile, scope);
    return fallback;
  }

  const result: Record<string, unknown> = {};
  for (const [portalField, canonicalPath] of Object.entries(mapping.fieldMap)) {
    if (scopes.includes(canonicalPath)) {
      result[portalField] = resolveCanonicalValue(profile, canonicalPath);
    }
  }
  return result;
}
