import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { shirtStyle } from '#lib/server/db/schema.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [style] = await db
		.select({
			slug: shirtStyle.slug,
			name: shirtStyle.name,
			basePriceKobo: shirtStyle.basePriceKobo
		})
		.from(shirtStyle)
		.where(and(eq(shirtStyle.slug, params.slug), eq(shirtStyle.active, true)))
		.limit(1);

	if (!style) error(404, 'Style not found');
	return { style };
};
