import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { users, profiles, addresses, education, credentials as credentialsTable } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { CanonicalProfile } from '../../types/canonical';
import { UpdateProfileInput } from './otrProfile.validation';
import { recordAuditEvent } from '../audit/audit.service';

async function loadCanonicalProfile(userId: string): Promise<CanonicalProfile> {
  const profileRow = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });

  if (!profileRow) {
    throw new AppError(404, 'PROFILE_NOT_FOUND', 'OTR profile not found for this user');
  }

  const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [addressRow] = await db
    .select()
    .from(addresses)
    .where(eq(addresses.profileId, profileRow.id))
    .limit(1);
  const educationRows = await db.select().from(education).where(eq(education.profileId, profileRow.id));
  const credentialRows = await db.select().from(credentialsTable).where(eq(credentialsTable.userId, userId));

  return {
    otrId: userRow.otrId,
    identity: {
      fullName: profileRow.fullName,
      dateOfBirth: profileRow.dateOfBirth.toISOString(),
      gender: profileRow.gender ?? undefined,
      guardianName: profileRow.guardianName ?? undefined,
    },
    contact: {
      mobile: profileRow.mobile,
      email: profileRow.email,
    },
    address: addressRow
      ? {
          addressLine: addressRow.addressLine,
          city: addressRow.city,
          state: addressRow.state,
          pincode: addressRow.pincode,
        }
      : undefined,
    education: educationRows.map((e) => ({
      level: e.level,
      board: e.board ?? undefined,
      institution: e.institution ?? undefined,
      yearOfPassing: e.yearOfPassing ?? undefined,
      percentage: e.percentage ?? undefined,
    })),
    credentials: credentialRows.map((c) => ({
      id: c.id,
      type: c.type,
      issuer: c.issuer,
      verificationStatus: c.verificationStatus,
      issueDate: c.issueDate ? c.issueDate.toISOString() : undefined,
      expiry: c.expiry ? c.expiry.toISOString() : undefined,
      reference: c.reference ?? undefined,
    })),
  };
}

export async function getProfileForUser(userId: string): Promise<CanonicalProfile> {
  return loadCanonicalProfile(userId);
}

export async function updateProfileForUser(
  userId: string,
  input: UpdateProfileInput
): Promise<CanonicalProfile> {
  const profileRow = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profileRow) {
    throw new AppError(404, 'PROFILE_NOT_FOUND', 'OTR profile not found for this user');
  }

  await db.transaction(async (tx) => {
    const hasProfileChanges =
      input.fullName !== undefined ||
      input.dateOfBirth !== undefined ||
      input.gender !== undefined ||
      input.guardianName !== undefined ||
      input.mobile !== undefined;

    if (hasProfileChanges) {
      await tx
        .update(profiles)
        .set({
          fullName: input.fullName ?? profileRow.fullName,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : profileRow.dateOfBirth,
          gender: input.gender ?? profileRow.gender,
          guardianName: input.guardianName ?? profileRow.guardianName,
          mobile: input.mobile ?? profileRow.mobile,
          updatedAt: new Date(),
        })
        .where(eq(profiles.userId, userId));
    }

    if (input.address) {
      const [existingAddress] = await tx
        .select()
        .from(addresses)
        .where(eq(addresses.profileId, profileRow.id))
        .limit(1);

      if (existingAddress) {
        await tx
          .update(addresses)
          .set(input.address)
          .where(eq(addresses.profileId, profileRow.id));
      } else {
        await tx.insert(addresses).values({ profileId: profileRow.id, ...input.address });
      }
    }
  });

  await recordAuditEvent({ event: 'PROFILE_UPDATED', userId, result: 'SUCCESS' });

  return loadCanonicalProfile(userId);
}
