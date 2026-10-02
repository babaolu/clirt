import { and, asc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { cartItem, designPreset, shirtStyle } from '#lib/server/db/schema.ts';
import {
	SHIRT_COLORS,
	customizationSchema,
	describeDesign,
	type Customization
} from '#lib/customization.ts';
import { renderShirtSvg, type RenderPreset } from '#lib/render/shirt.ts';
import { unitPrice } from '#lib/server/pricing.ts';

const styleColumns = {
	id: shirtStyle.id,
	slug: shirtStyle.slug,
	name: shirtStyle.name,
	sleeve: shirtStyle.sleeve,
	neck: shirtStyle.neck,
	basePriceKobo: shirtStyle.basePriceKobo
};

export type CatalogStyle = Awaited<ReturnType<typeof getActiveStyles>>[number];
export type CatalogPreset = Awaited<ReturnType<typeof getActivePresets>>[number];

export function getActiveStyles() {
	return db
		.select(styleColumns)
		.from(shirtStyle)
		.where(eq(shirtStyle.active, true))
		.orderBy(asc(shirtStyle.sortOrder), asc(shirtStyle.id));
}

export function getActivePresets() {
	return db
		.select({
			slug: designPreset.slug,
			name: designPreset.name,
			kind: designPreset.kind,
			config: designPreset.config
		})
		.from(designPreset)
		.where(eq(designPreset.active, true))
		.orderBy(asc(designPreset.kind), asc(designPreset.sortOrder));
}

/** Returns an error message if the design's preset is missing, inactive or of the wrong kind. */
export function presetError(
	design: Customization['design'],
	presets: readonly RenderPreset[]
): string | null {
	const kind = design.kind === 'text' ? 'text_style' : 'graphic';
	const found = presets.some((p) => p.slug === design.presetSlug && p.kind === kind);
	return found ? null : 'That design style is no longer available.';
}

export function shirtPreview(
	style: { sleeve: 'short' | 'long'; neck: 'round' | 'v' | 'collar' },
	customization: Customization,
	presets: readonly RenderPreset[],
	idPrefix: string
): string {
	return renderShirtSvg({
		sleeve: style.sleeve,
		neck: style.neck,
		shirtColorHex: SHIRT_COLORS[customization.shirtColor].hex,
		design: customization.design,
		placement: customization.placement,
		presets,
		idPrefix
	});
}

export type CartLine = Awaited<ReturnType<typeof loadCart>>['lines'][number];

/**
 * The user's cart with prices from unitPrice and server-rendered previews.
 * `problem` is set for rows that can no longer be ordered (inactive style, invalid design).
 */
export async function loadCart(userId: string) {
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
	return { lines, subtotalKobo, presets };
}

export async function cartQuantity(userId: string): Promise<number> {
	const rows = await db
		.select({ quantity: cartItem.quantity })
		.from(cartItem)
		.where(eq(cartItem.userId, userId));
	return rows.reduce((sum, r) => sum + r.quantity, 0);
}

export async function getActiveStyleBySlug(slug: string) {
	const [style] = await db
		.select(styleColumns)
		.from(shirtStyle)
		.where(and(eq(shirtStyle.slug, slug), eq(shirtStyle.active, true)))
		.limit(1);
	return style ?? null;
}
