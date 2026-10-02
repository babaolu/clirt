import type { Customization } from '#lib/customization.ts';

/** Surcharges in kobo. */
export const TEXT_DESIGN_SURCHARGE_KOBO = 100_000; // ₦1,000
export const GRAPHIC_DESIGN_SURCHARGE_KOBO = 150_000; // ₦1,500

/** The single place unit prices are computed (cart and checkout both call this). Returns kobo. */
export function unitPrice(
	style: { basePriceKobo: number },
	customization: Pick<Customization, 'design'>
): number {
	const surcharge =
		customization.design.kind === 'text'
			? TEXT_DESIGN_SURCHARGE_KOBO
			: GRAPHIC_DESIGN_SURCHARGE_KOBO;
	return style.basePriceKobo + surcharge;
}
