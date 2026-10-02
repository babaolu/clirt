import { and, asc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { orderItem, orders } from '#lib/server/db/schema.ts';
import { sendOrderConfirmation } from '#lib/server/email.ts';

export async function getUserOrder(orderId: string, userId: string) {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) return null;
	const [order] = await db
		.select()
		.from(orders)
		.where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
		.limit(1);
	if (!order) return null;
	const items = await db
		.select()
		.from(orderItem)
		.where(eq(orderItem.orderId, orderId))
		.orderBy(asc(orderItem.id));
	return { order, items };
}

/** Sends (or resends) the confirmation email and records the outcome on the order. Never throws. */
export async function deliverOrderEmail(orderId: string, userId: string, fallbackOrigin?: string) {
	try {
		const found = await getUserOrder(orderId, userId);
		if (!found) return { ok: false, error: 'Order not found' };
		const result = await sendOrderConfirmation(found.order, found.items, fallbackOrigin);
		await db
			.update(orders)
			.set(
				result.ok
					? { emailStatus: 'sent', emailMessageId: result.messageId ?? null, emailError: null }
					: { emailStatus: 'failed', emailError: result.error?.slice(0, 500) ?? 'Unknown error' }
			)
			.where(eq(orders.id, orderId));
		return result;
	} catch (err) {
		console.error('deliverOrderEmail failed', err);
		return { ok: false, error: 'Unexpected error while sending email' };
	}
}
