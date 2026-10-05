import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { cartItem, shirtStyle } from '#lib/server/db/schema.ts';
import { SHIRT_COLORS, SIZES, customizationSchema, describeDesign } from '#lib/customization.ts';
import { unitPrice } from '#lib/server/pricing.ts';
import {
	getActivePresets,
	getActiveStyleBySlug,
	presetError,
	shirtPreview,
	styleColumns
} from '#lib/server/services/catalog.ts';
import { ServiceError, notFound, validationError } from '#lib/server/services/errors.ts';
import { publishCartUpdated } from '#lib/server/services/realtime.ts';

export type CartLine = Awaited<ReturnType<typeof getCart>>['lines'][number];

/**
 * The user's cart with prices from unitPrice and server-rendered previews.
 * `problem` is set for rows that can no longer be ordered (inactive style, invalid design).
 */
export async function getCart(userId: string) {
	const [rows, presets] = await Promise.all([
		db
			.select({
				id: cartItem.id,
				size: cartItem.size,
				quantity: cartItem.quantity,
				customization: cartItem.customization,
				style: { ...styleColumns, active: shirtStyle.active }
			})
			.from(cartItem)
			.innerJoin(shirtStyle, eq(cartItem.shirtStyleId, shirtStyle.id))
			.where(eq(cartItem.userId, userId))
			.orderBy(asc(cartItem.createdAt), asc(cartItem.id)),
		getActivePresets()
	]);

	const lines = rows.map((row) => {
		const parsed = customizationSchema.safeParse(row.customization);
		const problem = !row.style.active
			? 'This style is no longer available.'
			: !parsed.success
				? 'This design is no longer valid.'
				: presetError(parsed.data.design, presets);
		const customization = parsed.success ? parsed.data : null;
		const unitPriceKobo = customization ? unitPrice(row.style, customization) : 0;
		return {
			id: row.id,
			size: row.size,
			quantity: row.quantity,
			style: row.style,
			customization,
			problem,
			unitPriceKobo,
			lineTotalKobo: unitPriceKobo * row.quantity,
			colorName: customization ? SHIRT_COLORS[customization.shirtColor].name : '',
			summary: customization ? describeDesign(customization.design) : '',
			previewSvg: customization
				? shirtPreview(row.style, customization, presets, `cart-${row.id}`)
				: ''
		};
	});

	const subtotalKobo = lines.reduce((sum, line) => sum + line.lineTotalKobo, 0);
	const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
	return { lines, subtotalKobo, itemCount, presets };
}

export async function cartQuantity(userId: string): Promise<number> {
	const rows = await db
		.select({ quantity: cartItem.quantity })
		.from(cartItem)
		.where(eq(cartItem.userId, userId));
	return rows.reduce((sum, r) => sum + r.quantity, 0);
}

/** Publish the new item count after any successful cart change (never throws). */
export async function notifyCartChanged(userId: string) {
	try {
		await publishCartUpdated(userId, await cartQuantity(userId));
	} catch (err) {
		console.error('notifyCartChanged failed:', err);
	}
}

const quantitySchema = z
	.number({ error: 'Quantity must be a whole number from 1 to 20' })
	.int('Quantity must be a whole number from 1 to 20')
	.min(1, 'Quantity must be 1–20')
	.max(20, 'Quantity must be 1–20');

export const addItemSchema = z.object({
	styleSlug: z.string().min(1, 'Choose a style'),
	size: z.enum(SIZES, { error: 'Choose a size' }),
	quantity: quantitySchema,
	customization: customizationSchema
});

/** Validate (schema, active style, active preset of the right kind) and add a cart row. */
export async function addCartItem(userId: string, input: unknown): Promise<{ id: number }> {
	const parsed = addItemSchema.safeParse(input);
	if (!parsed.success) throw validationError(parsed.error);
	const { styleSlug, size, quantity, customization } = parsed.data;

	const [style, presets] = await Promise.all([getActiveStyleBySlug(styleSlug), getActivePresets()]);
	if (!style) {
		throw new ServiceError(400, 'style_unavailable', 'That style is no longer available.', {
			styleSlug: 'That style is no longer available.'
		});
	}
	const badPreset = presetError(customization.design, presets);
	if (badPreset) {
		throw new ServiceError(400, 'preset_unavailable', badPreset, {
			'customization.design.presetSlug': badPreset
		});
	}

	const [row] = await db
		.insert(cartItem)
		.values({ userId, shirtStyleId: style.id, size, quantity, customization })
		.returning({ id: cartItem.id });

	await notifyCartChanged(userId);
	return row;
}

/** Change the quantity of one of the user's own rows (404 for anyone else's). */
export async function updateCartItemQuantity(userId: string, itemId: number, quantity: unknown) {
	const parsed = quantitySchema.safeParse(quantity);
	if (!parsed.success)
		throw validationError(z.object({ quantity: quantitySchema }).safeParse({ quantity }).error!);

	const updated = await db
		.update(cartItem)
		.set({ quantity: parsed.data })
		.where(and(eq(cartItem.id, itemId), eq(cartItem.userId, userId)))
		.returning({ id: cartItem.id });
	if (updated.length === 0) throw notFound('Cart item');

	await notifyCartChanged(userId);
}

/** Remove one of the user's own rows (404 for anyone else's). */
export async function removeCartItem(userId: string, itemId: number) {
	const deleted = await db
		.delete(cartItem)
		.where(and(eq(cartItem.id, itemId), eq(cartItem.userId, userId)))
		.returning({ id: cartItem.id });
	if (deleted.length === 0) throw notFound('Cart item');

	await notifyCartChanged(userId);
}
