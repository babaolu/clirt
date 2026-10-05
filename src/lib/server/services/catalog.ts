import { and, asc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { designPreset, shirtStyle } from '#lib/server/db/schema.ts';
import { FONTS, SHIRT_COLORS, SIZES, type Customization } from '#lib/customization.ts';
import { renderShirtSvg, type RenderPreset } from '#lib/render/shirt.ts';
import { GRAPHIC_DESIGN_SURCHARGE_KOBO, TEXT_DESIGN_SURCHARGE_KOBO } from '#lib/server/pricing.ts';

export const styleColumns = {
	id: shirtStyle.id,
	slug: shirtStyle.slug,
	name: shirtStyle.name,
	sleeve: shirtStyle.sleeve,
	neck: shirtStyle.neck,
	basePriceKobo: shirtStyle.basePriceKobo
};

export type CatalogStyle = Awaited<ReturnType<typeof getActiveStyles>>[number];
export type CatalogPreset = Awaited<ReturnType<typeof getActivePresets>>[number];

/** Surcharges for display only; prices are always computed with unitPrice. */
export const SURCHARGES = {
	text: TEXT_DESIGN_SURCHARGE_KOBO,
	graphic: GRAPHIC_DESIGN_SURCHARGE_KOBO
};

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

export async function getActiveStyleBySlug(slug: string) {
	const [style] = await db
		.select(styleColumns)
		.from(shirtStyle)
		.where(and(eq(shirtStyle.slug, slug), eq(shirtStyle.active, true)))
		.limit(1);
	return style ?? null;
}

/** Everything a client needs to build the customizer. */
export async function getCatalog() {
	const [styles, presets] = await Promise.all([getActiveStyles(), getActivePresets()]);
	return {
		styles: styles.map(({ id: _id, ...style }) => style),
		presets,
		sizes: SIZES,
		shirtColors: SHIRT_COLORS,
		fonts: FONTS,
		surcharges: SURCHARGES
	};
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
