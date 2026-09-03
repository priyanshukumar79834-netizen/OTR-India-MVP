import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { auditLogs } from '../../db/schema';
import { logger } from '../../utils/logger';
import { AuditEvent, AuditResult } from './auditEvents';

export interface RecordAuditEventInput {
  event: AuditEvent;
  result: AuditResult;
  /** Omit for events with no authenticated subject yet (e.g. a failed login). */
  userId?: string;
  /** Which external system/portal triggered this, if any (e.g. a portal code for DATA_ACCESSED). */
  requestingSystem?: string;
}

/**
 * Single, shared way to record an audit event (MASTER_SPECIFICATION.md §24).
 *
 * Rule: never pass sensitive content here — no passwords, tokens, document
 * bodies, or full request payloads. Only the event type, a user/reference,
 * the requesting system, and the outcome. This mirrors the audit_logs
 * table shape exactly, so there's no hidden transformation to reason about.
 *
 * This never throws on its own logging failure path in a way that breaks
 * the calling request — if the DB write fails, we log it and swallow it,
 * because "the audit log write failed" should not turn into "the login/
 * registration/consent action itself failed" for the citizen.
 */
export async function recordAuditEvent(input: RecordAuditEventInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: input.userId ?? null,
      event: input.event,
      requestingSystem: input.requestingSystem ?? null,
      result: input.result,
    });
  } catch (err) {
    logger.error('Failed to persist audit event', {
      event: input.event,
      result: input.result,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Structured console output stays for local dev visibility even though
  // the row is now the durable record.
  const level = input.result === 'FAILURE' ? 'warn' : 'info';
  logger[level]('AUDIT', {
    event: input.event,
    userId: input.userId,
    requestingSystem: input.requestingSystem,
    result: input.result,
  });
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Returns audit history for a single user, most recent first.
 * Deliberately scoped to one userId — there is no "list everyone's audit
 * log" path here; that would be an admin-role concern (§25) and is out of
 * scope for the foundation.
 */
export async function listAuditEventsForUser(userId: string, limit = DEFAULT_LIMIT) {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);

  return db
    .select({
      id: auditLogs.id,
      event: auditLogs.event,
      requestingSystem: auditLogs.requestingSystem,
      result: auditLogs.result,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(safeLimit);
}
