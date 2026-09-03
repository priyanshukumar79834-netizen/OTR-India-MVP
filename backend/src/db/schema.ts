// OTR-India — Canonical Data Model (Foundation)
//
// This schema establishes the SHARED canonical model described in
// MASTER_SPECIFICATION.md §9 and §18. It is intentionally minimal:
//
//   - Priyanshu (foundation) owns: users, profiles, addresses, education, credentials (shape only)
//   - Anchal (consent/docs/applications) extends: consents, applications, application_data, access_requests
//   - Harsh (interoperability) reads this model to build field mapping; does not own tables here
//   - Adi (frontend) never talks to this schema directly — only through the API layer
//
// Anything beyond field shape/relations (state machines, business rules,
// validation logic) belongs in each owning module's service layer.
// Changes here are SHARED CODE — see TEAM_WORKFLOW.md §8 before modifying.
//
// Engineering decision: Drizzle ORM (not Prisma) — Prisma's client requires
// downloading a native query-engine binary from binaries.prisma.sh at
// generate/install time, which is unreachable from this sandbox's network
// allowlist (confirmed: 403). Drizzle is pure TypeScript over the plain
// `pg` driver, so it has no such dependency. Documented in
// docs/ARCHITECTURE_DECISIONS.md.

import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  doublePrecision,
  integer,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createId } from '../utils/cuid';

export const credentialStatusEnum = pgEnum('credential_status', [
  'USER_PROVIDED',
  'PENDING_VERIFICATION',
  'VERIFIED',
  'REJECTED',
  'EXPIRED',
  'REVOKED',
]);

export const consentDecisionEnum = pgEnum('consent_decision', ['GRANTED', 'DENIED', 'EXPIRED']);

export const accessTokenStatusEnum = pgEnum('access_token_status', ['ACTIVE', 'REVOKED', 'EXPIRED']);

// --- Identity / Auth boundary -----------------------------------------

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    otrId: text('otr_id').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    otrIdIdx: uniqueIndex('users_otr_id_idx').on(table.otrId),
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
  })
);

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  credentials: many(credentials),
  applications: many(applications),
  consents: many(consents),
  auditLogs: many(auditLogs),
}));

// --- Category 1: Common reusable profile data (§5.1) --------------------

export const profiles = pgTable(
  'profiles',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    dateOfBirth: timestamp('date_of_birth').notNull(),
    gender: text('gender'),
    guardianName: text('guardian_name'),
    mobile: text('mobile').notNull(),
    email: text('email').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: uniqueIndex('profiles_user_id_idx').on(table.userId),
  })
);

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
  address: one(addresses, { fields: [profiles.id], references: [addresses.profileId] }),
  education: many(education),
}));

export const addresses = pgTable(
  'addresses',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    profileId: text('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    addressLine: text('address_line').notNull(),
    city: text('city').notNull(),
    state: text('state').notNull(),
    pincode: text('pincode').notNull(),
  },
  (table) => ({
    profileIdIdx: uniqueIndex('addresses_profile_id_idx').on(table.profileId),
  })
);

export const education = pgTable('education', {
  id: text('id').primaryKey().$defaultFn(createId),
  profileId: text('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  level: text('level').notNull(),
  board: text('board'),
  institution: text('institution'),
  yearOfPassing: integer('year_of_passing'),
  percentage: doublePrecision('percentage'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// --- Category 2: Credentials (§5.2, §6 verification lifecycle) ---------
// Full verification workflow (mock issuer, status transitions) is Anchal's
// module — this table only defines the shared shape her service builds on.

export const credentials = pgTable('credentials', {
  id: text('id').primaryKey().$defaultFn(createId),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  issuer: text('issuer').notNull(),
  verificationStatus: credentialStatusEnum('verification_status').notNull().default('USER_PROVIDED'),
  issueDate: timestamp('issue_date'),
  expiry: timestamp('expiry'),
  reference: text('reference'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// --- Document metadata (§14 — metadata in relational DB, files elsewhere) --
// Distinct from `credentials`: a credential is a typed, verifiable claim;
// a document is the underlying file's metadata. A document upload can
// create/attach to a credential (see documents.service.ts) without the
// two concepts being the same row.

export const documents = pgTable('documents', {
  id: text('id').primaryKey().$defaultFn(createId),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  credentialId: text('credential_id').references(() => credentials.id, { onDelete: 'set null' }),
  documentType: text('document_type').notNull(),
  fileName: text('file_name').notNull(),
  storagePath: text('storage_path').notNull(),
  savedToProfile: text('saved_to_profile').notNull().default('true'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// --- Government client registry (Part 15 — clients, not free-text strings) -
// A requesting portal must be a known, registered client before it can
// request consent or receive an access token. The frontend "portal id"
// (e.g. 'portal-a') maps 1:1 to a clientId here; the server never trusts
// an arbitrary frontend-supplied name as authorization.

export const governmentClients = pgTable(
  'government_clients',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    clientId: text('client_id').notNull(),
    name: text('name').notNull(),
    organisation: text('organisation').notNull(),
    allowedScopes: jsonb('allowed_scopes').notNull(),
    active: text('active').notNull().default('true'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    clientIdIdx: uniqueIndex('government_clients_client_id_idx').on(table.clientId),
  })
);

// --- Access tokens (Part 4/14 — opaque authorization reference) -----------
// NOT proof of application submission (§12). Represents: this citizen
// authorized this client to receive exactly these scopes, until expiry
// or revocation. Data retrieval always re-validates against this row.

export const accessTokens = pgTable(
  'access_tokens',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    token: text('token').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clientId: text('client_id')
      .notNull()
      .references(() => governmentClients.clientId),
    consentId: text('consent_id')
      .notNull()
      .references(() => consents.id, { onDelete: 'cascade' }),
    scopes: jsonb('scopes').notNull(),
    purpose: text('purpose').notNull(),
    status: accessTokenStatusEnum('status').notNull().default('ACTIVE'),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex('access_tokens_token_idx').on(table.token),
  })
);

// --- Category 3 + consent/application scaffolding (Anchal's module) ----
// Table shapes only, so Anchal's service layer, Adi's UI contracts, and
// Harsh's connector checks can all be built against a stable schema from
// day one. Anchal owns the business logic and may extend these fields.

export const consents = pgTable(
  'consents',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    consentReference: text('consent_reference').notNull(),
    requestingApp: text('requesting_app').notNull(),
    clientId: text('client_id').references(() => governmentClients.clientId),
    requestedFields: jsonb('requested_fields').notNull(),
    grantedFields: jsonb('granted_fields'),
    decision: consentDecisionEnum('decision').notNull(),
    decidedAt: timestamp('decided_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at'),
  },
  (table) => ({
    refIdx: uniqueIndex('consents_reference_idx').on(table.consentReference),
  })
);

export const applications = pgTable(
  'applications',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    applicationRefId: text('application_ref_id').notNull(),
    portalName: text('portal_name').notNull(),
    accessTokenId: text('access_token_id').references(() => accessTokens.id, { onDelete: 'set null' }),
    status: text('status').notNull().default('SUBMITTED'),
    submittedAt: timestamp('submitted_at').notNull().defaultNow(),
  },
  (table) => ({
    refIdx: uniqueIndex('applications_ref_id_idx').on(table.applicationRefId),
  })
);

export const applicationData = pgTable('application_data', {
  id: text('id').primaryKey().$defaultFn(createId),
  applicationId: text('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  fieldName: text('field_name').notNull(),
  fieldValue: text('field_value').notNull(),
});

export const accessRequests = pgTable('access_requests', {
  id: text('id').primaryKey().$defaultFn(createId),
  requestingApp: text('requesting_app').notNull(),
  requestedFields: jsonb('requested_fields').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// --- Cross-cutting: audit logging (§24) ---------------------------------

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(createId),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  event: text('event').notNull(),
  requestingSystem: text('requesting_system'),
  result: text('result').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
