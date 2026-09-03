import { randomUUID } from 'crypto';

/** Row primary key generator. Not a real "cuid" — uses Node's built-in UUID v4. */
export function createId(): string {
  return randomUUID();
}
