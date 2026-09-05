/**
 * UI-side display config for registered government portals.
 *
 * What's real vs. display-only, precisely:
 *  - The list of clients, and the ceiling of what each is EVER allowed to
 *    request (`allowedScopes`), comes from GET /api/government-clients —
 *    live, backend-owned (governmentClients.service.ts).
 *  - What canonical fields map to which portal-native field names, and
 *    the actual data-minimization filtering, happens server-side in
 *    interop.service.ts / access.service.ts — never trust a frontend
 *    mapping for that.
 *  - THIS file only supplies human-readable labels and the SSC/RRB-side
 *    application-specific form fields (post preference, exam centre,
 *    etc.) — presentation concerns with no real backend equivalent.
 *    `fieldLabels` and `portalFieldLabels` are hand-kept in sync with
 *    backend/src/modules/interop/interop.service.ts's PORTAL_MAPPINGS;
 *    if that changes, this must be updated too (flagged in
 *    PROJECT_STATUS.md, same convention as the canonical-type mirror).
 */

export interface PortalDisplayConfig {
  clientId: string;
  /** canonical dotted path -> label, for the citizen-facing consent screen */
  fieldLabels: Record<string, string>;
  /** portal-native field name -> label, for the "SSC-side" retrieved-data screen */
  portalFieldLabels: Record<string, string>;
  appSpecificFields: { key: string; label: string; type: 'text' | 'select'; options?: string[] }[];
}

export const PORTAL_DISPLAY: Record<string, PortalDisplayConfig> = {
  SSC_EXAM_PORTAL: {
    clientId: 'SSC_EXAM_PORTAL',
    fieldLabels: {
      'identity.fullName': 'Full name',
      'identity.dateOfBirth': 'Date of birth',
      'identity.guardianName': "Guardian's name",
      'contact.mobile': 'Mobile number',
      address: 'Address',
      'education.secondary': '10th qualification',
      'education.seniorSecondary': '12th qualification',
    },
    portalFieldLabels: {
      candidate_name: 'Candidate Name',
      dob: 'Date of Birth',
      guardian_name: "Guardian's Name",
      mobile_no: 'Mobile No.',
      postal_address: 'Postal Address',
      qualification_10th: '10th Qualification',
      qualification_12th: '12th Qualification',
    },
    appSpecificFields: [
      { key: 'examCentre', label: 'Preferred exam centre', type: 'select', options: ['Delhi', 'Lucknow', 'Patna', 'Bhopal'] },
      { key: 'postPreference', label: 'Post preference', type: 'text' },
    ],
  },
  SCHOLARSHIP_PORTAL: {
    clientId: 'SCHOLARSHIP_PORTAL',
    fieldLabels: {
      'identity.fullName': 'Full name',
      'identity.dateOfBirth': 'Date of birth',
      'contact.email': 'Email address',
      'education.graduation': 'Graduation details',
    },
    portalFieldLabels: {
      applicant_full_name: 'Applicant Full Name',
      date_of_birth: 'Date of Birth',
      contact_email: 'Contact Email',
      secondary_education: 'Graduation Details',
    },
    appSpecificFields: [
      { key: 'departmentPreference', label: 'Department preference', type: 'select', options: ['Engineering', 'Traffic', 'Commercial', 'Medical'] },
      { key: 'zone', label: 'Preferred zone', type: 'text' },
    ],
  },
};

export function getPortalDisplay(clientId: string): PortalDisplayConfig | undefined {
  return PORTAL_DISPLAY[clientId];
}

/** Citizen-facing, value-free permission category label for the consent
 * screen (Batch 2): "what kind of access", never "what the value is".
 * Deliberately coarser/friendlier than fieldLabels, which stays used for
 * the dashboard's consent-history and access-token views where a bit more
 * technical precision is appropriate. */
export function getPermissionCategoryLabel(path: string): string {
  if (path === 'identity.fullName') return 'Name access';
  if (path === 'identity.dateOfBirth') return 'Date of birth access';
  if (path === 'identity.guardianName') return "Guardian's name access";
  if (path === 'contact.mobile') return 'Mobile number access';
  if (path === 'contact.email') return 'Email address access';
  if (path === 'address') return 'Address access';
  if (path.startsWith('education.')) return 'Education access';
  return 'Profile information access';
}

/** Resolves a canonical dotted path against a real profile — for the
 * citizen-side consent screen only (showing what will be shared, before
 * any token exists). Never used on the portal-facing side of the flow;
 * that side only ever sees data.ts's `retrieveDataWithToken` response. */
export function resolveCanonicalValue(profile: import('../types').CanonicalProfile, path: string): string {
  if (path === 'identity.fullName') return profile.identity.fullName;
  if (path === 'identity.dateOfBirth') return profile.identity.dateOfBirth.slice(0, 10);
  if (path === 'identity.guardianName') return profile.identity.guardianName ?? 'Not provided yet';
  if (path === 'contact.mobile') return profile.contact.mobile;
  if (path === 'contact.email') return profile.contact.email;
  if (path === 'address') {
    return profile.address ? `${profile.address.addressLine}, ${profile.address.city}` : 'Not provided yet';
  }
  if (path.startsWith('education.')) {
    const level = path.split('.')[1];
    const record = profile.education.find((e) => e.level === level);
    if (!record) return 'Not provided yet';
    const parts = [record.institution, record.board, record.yearOfPassing ? String(record.yearOfPassing) : undefined].filter(
      Boolean
    );
    return parts.length ? parts.join(', ') : 'Not provided yet';
  }
  return 'Not available';
}

/** Canonical education path -> the credential type a citizen needs on file
 * for that field to count as available (matches documents.service.ts's
 * credential creation on upload). Centralized here so ConsentReviewPage
 * doesn't duplicate this mapping. */
export const EDUCATION_CREDENTIAL_TYPE: Record<string, string> = {
  secondary: '10th Marksheet',
  seniorSecondary: '12th Marksheet',
  graduation: 'Graduation Degree Certificate',
};

/** Canonical field paths this portal could ever request that are not yet
 * backed by a credential on the citizen's profile — drives the "missing
 * document" flow (Part 6). Checks `credentials`, not `education` records:
 * the real gap in the demo story is "no 12th marksheet on file," which is
 * a credential, distinct from whether a structured education row exists. */
export function findMissingFields(
  profile: import('../types').CanonicalProfile,
  requestedFields: string[]
): string[] {
  return requestedFields.filter((path) => {
    if (!path.startsWith('education.')) return false; // identity/contact/address are collected at registration/profile-edit time
    const level = path.split('.')[1];
    const requiredType = EDUCATION_CREDENTIAL_TYPE[level];
    if (!requiredType) return false;
    return !profile.credentials.some((c) => c.type === requiredType);
  });
}
