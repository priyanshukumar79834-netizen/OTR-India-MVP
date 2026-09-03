import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { applicationData, applications } from '../../db/schema';
import { generateApplicationRefId } from '../../utils/idGenerator';
import { recordAuditEvent } from '../audit/audit.service';
import { SubmitApplicationInput } from './applications.validation';

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

export async function listApplicationsForUser(userId: string) {
  return db
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.submittedAt));
}
