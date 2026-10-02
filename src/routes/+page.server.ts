import { getActivePresets, getActiveStyles } from '#lib/server/catalog.ts';
import { GRAPHIC_DESIGN_SURCHARGE_KOBO, TEXT_DESIGN_SURCHARGE_KOBO } from '#lib/server/pricing.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [styles, presets] = await Promise.all([getActiveStyles(), getActivePresets()]);
	return {
		styles,
		presets,
		surcharges: { text: TEXT_DESIGN_SURCHARGE_KOBO, graphic: GRAPHIC_DESIGN_SURCHARGE_KOBO }
	};
};
