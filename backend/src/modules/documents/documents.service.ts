import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { credentials, documents } from '../../db/schema';
import { recordAuditEvent } from '../audit/audit.service';
import { UploadDocumentInput } from './documents.validation';

/**
 * Records document metadata and, if requested, attaches/creates the
 * corresponding credential — WITHOUT marking it VERIFIED (§6: uploading a
 * document is not the same as an issuer verifying it). This is the
 * server-side version of Adi's `mock/store.ts` upload behavior, kept
 * behaviorally identical so the frontend rewire doesn't change what a
 * judge sees.
 *
 * No real file bytes are persisted for the hackathon prototype (Part 16)
 * — storagePath is a placeholder reference, not a working file store.
 */
export async function uploadDocument(userId: string, input: UploadDocumentInput) {
  let credentialId: string | null = null;

  if (input.saveToProfile) {
    const existing = await db.query.credentials.findFirst({
      where: and(eq(credentials.userId, userId), eq(credentials.type, input.documentType)),
    });

    if (existing) {
      credentialId = existing.id;
    } else {
      const [created] = await db
        .insert(credentials)
        .values({
          userId,
          type: input.documentType,
          issuer: 'Self-declared',
          verificationStatus: 'USER_PROVIDED',
        })
        .returning();
      credentialId = created.id;
    }
  }

  const [doc] = await db
    .insert(documents)
    .values({
      userId,
      credentialId,
      documentType: input.documentType,
      fileName: input.fileName,
      storagePath: `local://uploads/${userId}/${Date.now()}-${input.fileName}`,
      savedToProfile: input.saveToProfile ? 'true' : 'false',
    })
    .returning();

  await recordAuditEvent({ event: 'DOCUMENT_UPLOADED', userId, result: 'SUCCESS' });

  return doc;
}

export async function listDocumentsForUser(userId: string) {
  return db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.createdAt));
}
