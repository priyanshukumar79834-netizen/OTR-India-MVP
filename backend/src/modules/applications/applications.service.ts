import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { applicationData, applications } from '../../db/schema';
import { generateApplicationRefId } from '../../utils/idGenerator';
import { recordAuditEvent } from '../audit/audit.service';
import { validateAccessToken } from '../access/access.service';
import { getActiveClient } from '../government-clients/governmentClients.service';
import { SubmitApplicationInput, SubmitApplicationViaTokenInput } from './applications.validation';

/**
 * Records an application submission. Independent of any access token
 * (§12): the token proves data was shared, this row proves an application
 * was actually submitted. `accessTokenId` is stored as a reference for
 * later retrieval demos (e.g. admit card), never treated as the
 * submission proof itself.
 */
export async function submitApplication(userId: string, input: SubmitApplicationInput) {
  const applicationRefId = generateApplicationRefId(input.clientId);

  const [application] = await db
    .insert(applications)
    .values({
      userId,
      applicationRefId,
      portalName: input.organisation,
      accessTokenId: input.accessTokenId ?? null,
      status: 'SUBMITTED',
    })
    .returning();

  const fieldEntries = Object.entries(input.appSpecificData);
  if (fieldEntries.length > 0) {
    await db.insert(applicationData).values(
      fieldEntries.map(([fieldName, fieldValue]) => ({
        applicationId: application.id,
        fieldName,
        fieldValue,
      }))
    );
  }

  await recordAuditEvent({
    event: 'APPLICATION_SUBMITTED',
    userId,
    requestingSystem: input.clientId,
    result: 'SUCCESS',
  });

  return { ...application, appSpecificData: input.appSpecificData };
}

/**
 * Portal-facing equivalent of submitApplication, for a caller (the
 * standalone Mock SSC site) that has no citizen JWT — only the opaque
 * access token issued when the citizen granted consent. The token is
 * re-validated (status + expiry) exactly like /api/access/data does,
 * then the userId and clientId it carries are used to record the
 * application server-side. The token proves authorization; this call is
 * what actually creates the durable application record (§12 — a token is
 * not itself proof of submission).
 */
export async function submitApplicationViaToken(input: SubmitApplicationViaTokenInput) {
  const tokenRow = await validateAccessToken(input.token);
  const client = await getActiveClient(tokenRow.clientId);

  return submitApplication(tokenRow.userId, {
    clientId: client.clientId,
    accessTokenId: tokenRow.id,
    applicationName: input.applicationName,
    organisation: client.organisation,
    appSpecificData: input.appSpecificData,
  });
}

export async function listApplicationsForUser(userId: string) {
  return db
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.submittedAt));
}
