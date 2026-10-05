import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { cartItem, orderItem, orders } from '#lib/server/db/schema.ts';
import { NIGERIAN_STATES } from '#lib/nigeria.ts';
import { shirtPreview } from '#lib/server/services/catalog.ts';
import { getCart, notifyCartChanged } from '#lib/server/services/cart.ts';
import { ServiceError, validationError } from '#lib/server/services/errors.ts';
import { deliverOrderEmail } from '#lib/server/services/orders.ts';

const text = (min: number, max: number, label: string) =>
	z
		.string({ error: `${label} is required` })
		.trim()
		.min(min, `${label} is required`)
		.max(max, `${label} must be at most ${max} characters`);

export const CHECKOUT_FIELDS = [
	'contactEmail',
	'shippingName',
	'phone',
	'address',
	'city',
	'state',
	'notes'
] as const;

export const checkoutSchema = z.object({
	contactEmail: z
		.string({ error: 'Enter a valid email address' })
		.trim()
		.pipe(z.email('Enter a valid email address')),
	shippingName: text(2, 100, 'Full name'),
	// Permissive Nigerian format: 0XXXXXXXXXX or +234XXXXXXXXXX, ignoring spaces, dashes, dots and brackets.
	phone: z
		.string({ error: 'Enter a Nigerian phone number, e.g. 0803 123 4567' })
		.transform((v) => v.replace(/[\s\-().]/g, ''))
		.pipe(
			z.string().regex(/^(?:\+?234|0)\d{10}$/, 'Enter a Nigerian phone number, e.g. 0803 123 4567')
		),
	address: text(5, 200, 'Address'),
	city: text(2, 80, 'City'),
	state: z.enum(NIGERIAN_STATES, { error: 'Choose a state' }),
	notes: z
		.string()
		.trim()
		.max(500, 'Notes must be at most 500 characters')
		.nullish()
		.transform((v) => v || null)
});

/**
 * Re-reads and re-prices the cart, then writes the order, its items and the cart cleanup in one
 * db.batch (neon-http has no interactive transactions). The confirmation email is sent afterwards
 * and its outcome recorded on the order; an email failure never fails the order.
 */
export async function placeOrder(userId: string, input: unknown, fallbackOrigin?: string) {
	const parsed = checkoutSchema.safeParse(input);
	if (!parsed.success) throw validationError(parsed.error);
	const shipping = parsed.data;

	const { lines, presets } = await getCart(userId);
	if (lines.length === 0) throw new ServiceError(400, 'cart_empty', 'Your cart is empty.');
	if (lines.some((l) => l.problem || !l.customization)) {
		throw new ServiceError(
			400,
			'cart_unavailable',
			'Some items in your cart are no longer available. Please review your cart.'
		);
	}

	const orderId = crypto.randomUUID();
	const createdAt = new Date();
	const subtotalKobo = lines.reduce((sum, l) => sum + l.unitPriceKobo * l.quantity, 0);

	const itemRows = lines.map((line, i) => ({
		orderId,
		shirtStyleId: line.style.id,
		styleName: line.style.name,
		size: line.size,
		quantity: line.quantity,
		unitPriceKobo: line.unitPriceKobo,
		customization: line.customization!,
		previewSvg: shirtPreview(
			line.style,
			line.customization!,
			presets,
			`o${orderId.slice(0, 8)}-${i}`
		),
		createdAt
	}));

	await db.batch([
		db.insert(orders).values({
			id: orderId,
			userId,
			subtotalKobo,
			totalKobo: subtotalKobo, // delivery is free
			...shipping,
			createdAt
		}),
		db.insert(orderItem).values(itemRows),
		db.delete(cartItem).where(
			and(
				eq(cartItem.userId, userId),
				inArray(
					cartItem.id,
					lines.map((l) => l.id)
				)
			)
		)
	]);

	// The batch emptied the cart (anything added meanwhile stays); tell open clients.
	await notifyCartChanged(userId);

	const email = await deliverOrderEmail(userId, orderId, fallbackOrigin);
	return { orderId, emailStatus: email.ok ? ('sent' as const) : ('failed' as const) };
}
