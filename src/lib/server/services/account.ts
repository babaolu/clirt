import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { user } from '#lib/server/db/schema.ts';
import { notFound } from '#lib/server/services/errors.ts';

/**
 * Permanently deletes the user. Foreign keys cascade to sessions, the linked Google account,
 * cart items, orders and order items. Signing in again with the same Google account creates a
 * brand-new Clirt account.
 */
export async function deleteAccount(userId: string) {
	const deleted = await db.delete(user).where(eq(user.id, userId)).returning({ id: user.id });
	if (deleted.length === 0) throw notFound('Account');
}
