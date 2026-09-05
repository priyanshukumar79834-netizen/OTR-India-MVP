/**
 * GovRecruit-A's own field labels for what it receives from OTR. These
 * are portal-native field names (candidate_name, dob, ...) — the exact
 * shape OTR's interoperability layer maps to for this client, per
 * backend/src/modules/interop/interop.service.ts's PORTAL_MAPPINGS.
 * Presentation-only; the actual mapping and data-minimization enforcement
 * happen server-side on OTR, never here.
 */
export const OTR_FIELD_LABELS: Record<string, string> = {
  candidate_name: 'Candidate Name',
  dob: 'Date of Birth',
  guardian_name: "Guardian's Name",
  mobile_no: 'Mobile Number',
  postal_address: 'Postal Address',
  qualification_10th: '10th Qualification',
  qualification_12th: '12th Qualification',
};

export const EXAM_CENTRES = ['Delhi', 'Lucknow', 'Patna', 'Bhopal', 'Ghaziabad', 'Mumbai'];

/**
 * Presentation-only groupings used on the intermediate "Details fetched
 * successfully" confirmation screens (OtrApplicationFormPage,
 * OtrReviewPage). These deliberately show WHICH categories of data were
 * authorized, never the actual values — the raw retrieved values are used
 * internally to build the application, but are not re-displayed here.
 * A category is shown as confirmed if OTR actually returned at least one
 * of its underlying fields (so if a future request authorizes a narrower
 * scope, this list reflects that honestly instead of always showing all).
 */
export const OTR_CONFIRMATION_GROUPS: { label: string; fields: string[] }[] = [
  { label: 'Candidate details', fields: ['candidate_name'] },
  { label: 'Date of birth', fields: ['dob'] },
  { label: "Guardian's details", fields: ['guardian_name'] },
  { label: 'Contact information', fields: ['mobile_no'] },
  { label: 'Address', fields: ['postal_address'] },
  { label: 'Educational details', fields: ['qualification_10th', 'qualification_12th'] },
];

export function confirmedGroups(otrData: Record<string, unknown>): string[] {
  const keys = new Set(Object.keys(otrData));
  return OTR_CONFIRMATION_GROUPS.filter((g) => g.fields.some((f) => keys.has(f))).map((g) => g.label);
}

export function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not provided in OTR';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  if (typeof value === 'object') {
    const addr = value as { addressLine?: string; city?: string; state?: string; pincode?: string };
    if (addr.addressLine) {
      return [addr.addressLine, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
    }
    return 'Not provided in OTR';
  }
  return String(value);
}
