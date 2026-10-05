import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { orderItem, orders } from '#lib/server/db/schema.ts';
import { describeDesign, shirtColorName } from '#lib/customization.ts';
import { sendOrderConfirmation } from '#lib/server/email.ts';
import { ServiceError, notFound } from '#lib/server/services/errors.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listOrders(userId: string) {
	return db
		.select({
			id: orders.id,
			createdAt: orders.createdAt,
			status: orders.status,
			emailStatus: orders.emailStatus,
			totalKobo: orders.totalKobo,
			// Fully qualified: drizzle renders ${orders.id} as a bare "id", which would bind to order_item.id here.
			itemCount: sql<number>`(select coalesce(sum(oi.quantity), 0) from order_item oi where oi.order_id = "orders"."id")::int`
		})
		.from(orders)
		.where(eq(orders.userId, userId))
		.orderBy(desc(orders.createdAt));
}

/** The user's own order with its items, or null (unknown id, malformed id or someone else's). */
async function findUserOrder(userId: string, orderId: string) {
	if (!UUID.test(orderId)) return null;
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

/** Order detail for its owner; 404 for anyone else. */
export async function getOrder(userId: string, orderId: string) {
	const found = await findUserOrder(userId, orderId);
	if (!found) throw notFound('Order');
	const { order, items } = found;
	return {
		id: order.id,
		createdAt: order.createdAt,
		status: order.status,
		subtotalKobo: order.subtotalKobo,
		totalKobo: order.totalKobo,
		contactEmail: order.contactEmail,
		shippingName: order.shippingName,
		phone: order.phone,
		address: order.address,
		city: order.city,
		state: order.state,
		notes: order.notes,
		emailStatus: order.emailStatus,
		// Only the owner gets here; shown to help diagnose failed confirmations.
		emailError: order.emailStatus === 'failed' ? order.emailError : null,
		items: items.map((item) => ({
			id: item.id,
			styleName: item.styleName,
			size: item.size,
			quantity: item.quantity,
			unitPriceKobo: item.unitPriceKobo,
			lineTotalKobo: item.unitPriceKobo * item.quantity,
			customization: item.customization,
			colorName: shirtColorName(item.customization.shirtColor),
			designSummary: describeDesign(item.customization.design),
			previewSvg: item.previewSvg
		}))
	};
}

/** Sends (or resends) the confirmation email and records the outcome on the order. Never throws. */
export async function deliverOrderEmail(userId: string, orderId: string, fallbackOrigin?: string) {
	try {
		const found = await findUserOrder(userId, orderId);
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

/** Resend for the owner: 404 if not theirs, 409 if already sent, 502 if Mailgun fails again. */
export async function resendOrderEmail(userId: string, orderId: string, fallbackOrigin?: string) {
	const found = await findUserOrder(userId, orderId);
	if (!found) throw notFound('Order');
	if (found.order.emailStatus === 'sent') {
		throw new ServiceError(409, 'already_sent', 'The confirmation email was already sent.');
	}
	const result = await deliverOrderEmail(userId, orderId, fallbackOrigin);
	if (!result.ok) {
		throw new ServiceError(
			502,
			'email_failed',
			"We couldn't send the email. Please try again later."
		);
	}
	return { emailStatus: 'sent' as const, contactEmail: found.order.contactEmail };
}
