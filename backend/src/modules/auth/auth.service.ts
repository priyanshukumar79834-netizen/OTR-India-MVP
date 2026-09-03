import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { users, profiles } from '../../db/schema';
import { generateOtrId } from '../../utils/idGenerator';
import { hashPassword, verifyPassword } from '../../utils/password';
import { signAuthToken } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { RegisterInput, LoginInput } from './auth.validation';
import { recordAuditEvent } from '../audit/audit.service';

export async function registerUser(input: RegisterInput) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existing) {
    throw new AppError(409, 'EMAIL_IN_USE', 'An account with this email already exists');
  }

  // User + Profile must be created together — use Drizzle's transaction API
  // so we never end up with a user row and no profile row.
  const user = await db.transaction(async (tx) => {
    const insertedUsers = await tx
      .insert(users)
      .values({
        email: input.email,
        passwordHash: hashPassword(input.password),
        otrId: generateOtrId(),
      })
      .returning();
    const createdUser = insertedUsers[0];

    await tx.insert(profiles).values({
      userId: createdUser.id,
      fullName: input.fullName,
      // Placeholder DOB — the citizen completes this via the profile
      // update flow (Adi's UI). Foundation only needs a valid row to exist.
      dateOfBirth: new Date('2000-01-01'),
      mobile: '',
      email: input.email,
    });

    return createdUser;
  });

  await recordAuditEvent({ event: 'PROFILE_UPDATED', userId: user.id, result: 'SUCCESS' });

  const token = signAuthToken(user.id);
  return { token, otrId: user.otrId, userId: user.id };
}

export async function loginUser(input: LoginInput) {
  const user = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    // No userId on a failed login — we don't know who it was, and we
    // never want to imply we do (e.g. by matching on email string).
    await recordAuditEvent({ event: 'LOGIN', result: 'FAILURE' });
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  await recordAuditEvent({ event: 'LOGIN', userId: user.id, result: 'SUCCESS' });

  const token = signAuthToken(user.id);
  return { token, otrId: user.otrId, userId: user.id };
}
