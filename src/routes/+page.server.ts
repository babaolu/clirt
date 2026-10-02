import { asc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { shirtStyle } from '#lib/server/db/schema.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const styles = await db
		.select({
			slug: shirtStyle.slug,
			name: shirtStyle.name,
			sleeve: shirtStyle.sleeve,
			neck: shirtStyle.neck,
			basePriceKobo: shirtStyle.basePriceKobo
		})
		.from(shirtStyle)
		.where(eq(shirtStyle.active, true))
		.orderBy(asc(shirtStyle.sortOrder), asc(shirtStyle.id));

	return { styles };
};
