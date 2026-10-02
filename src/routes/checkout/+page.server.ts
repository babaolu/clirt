import { fail, redirect } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { cartItem, orderItem, orders } from '#lib/server/db/schema.ts';
import { requireUser } from '#lib/server/auth-guard.ts';
import { loadCart, shirtPreview } from '#lib/server/catalog.ts';
import { deliverOrderEmail } from '#lib/server/orders.ts';
import { NIGERIAN_STATES } from '#lib/nigeria.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const { lines, subtotalKobo } = await loadCart(user.id);
	if (lines.length === 0) redirect(303, '/cart');
	return {
		lines,
		subtotalKobo,
		hasProblems: lines.some((l) => l.problem),
		defaults: { contactEmail: user.email, shippingName: user.name }
	};
};

const text = (min: number, max: number, label: string) =>
	z
		.string()
		.trim()
		.min(min, `${label} is required`)
		.max(max, `${label} must be at most ${max} characters`);

const checkoutSchema = z.object({
	contactEmail: z.string().trim().pipe(z.email('Enter a valid email address')),
	shippingName: text(2, 100, 'Full name'),
	// Permissive Nigerian format: 0XXXXXXXXXX or +234XXXXXXXXXX, ignoring spaces, dashes, dots and brackets.
	phone: z
		.string()
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
		.transform((v) => v || null)
});

const FIELDS = [
	'contactEmail',
	'shippingName',
	'phone',
	'address',
	'city',
	'state',
	'notes'
] as const;

export const actions: Actions = {
	placeOrder: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const values = Object.fromEntries(FIELDS.map((f) => [f, String(form.get(f) ?? '')])) as Record<
			(typeof FIELDS)[number],
			string
		>;

		const parsed = checkoutSchema.safeParse(values);
		if (!parsed.success) {
			const errors: Record<string, string> = {};
			for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
			return fail(400, { values, errors });
		}
		const shipping = parsed.data;

		// Re-read the cart and re-price everything on the server; nothing price-related comes from the client.
		const { lines, presets } = await loadCart(user.id);
		if (lines.length === 0) redirect(303, '/cart');
		if (lines.some((l) => l.problem || !l.customization)) {
			return fail(400, {
				values,
				errors: {
					form: 'Some items in your cart are no longer available. Please review your cart.'
				}
			});
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

		// neon-http has no interactive transactions; batch runs these atomically in one transaction.
		await db.batch([
			db.insert(orders).values({
				id: orderId,
				userId: user.id,
				subtotalKobo,
				totalKobo: subtotalKobo, // delivery is free
				...shipping,
				createdAt
			}),
			db.insert(orderItem).values(itemRows),
			db.delete(cartItem).where(
				and(
					eq(cartItem.userId, user.id),
					inArray(
						cartItem.id,
						lines.map((l) => l.id)
					)
				)
			)
		]);

		// The order is saved; an email failure is recorded on the order but never fails it.
		await deliverOrderEmail(orderId, user.id, event.url.origin);

		redirect(303, `/orders/${orderId}?placed=1`);
	}
};
