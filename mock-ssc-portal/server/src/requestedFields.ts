/**
 * Exactly what GovRecruit-A (SSC_EXAM_PORTAL) asks OTR for, on every
 * authorization request. Fixed here, server-side — this is precisely the
 * value a pre-Phase-3 browser-driven flow could have inflated. It mirrors
 * (and must stay in sync with) this client's `allowedScopes` ceiling in
 * backend/src/modules/government-clients/governmentClients.service.ts, and
 * the description text on OtrIntroPage.tsx ("full name, date of birth,
 * guardian's name, mobile number, address, 10th/12th qualification").
 *
 * If GovRecruit-A ever needs a different set of fields for a different
 * application type, that becomes a new named constant here — never a
 * value accepted from the browser's request body.
 */
export const SSC_REQUESTED_FIELDS: string[] = [
  'identity.fullName',
  'identity.dateOfBirth',
  'identity.guardianName',
  'contact.mobile',
  'address',
  'education.secondary',
  'education.seniorSecondary',
];
