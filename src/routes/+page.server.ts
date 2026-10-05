import { SURCHARGES, getActivePresets, getActiveStyles } from '#lib/server/services/catalog.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const [styles, presets] = await Promise.all([getActiveStyles(), getActivePresets()]);
	return {
		styles,
		presets,
		surcharges: SURCHARGES,
		accountDeleted: url.searchParams.has('accountDeleted')
	};
};
