/**
 * Idempotent seed: `npm run db:seed`. Upserts by slug, so re-running updates rows in place.
 * Runs outside SvelteKit (via tsx), so it builds its own client from process.env.
 */
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { shirtStyle, designPreset } from './schema';
import type { GraphicConfig, TextStyleConfig } from '../../customization';

try {
	process.loadEnvFile('.env');
} catch {
	// no .env file; rely on the real environment
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const db = drizzle(neon(process.env.DATABASE_URL));

const styles: (typeof shirtStyle.$inferInsert)[] = [
	{
		slug: 'short-sleeve-round-neck',
		name: 'Short-sleeve Round-neck',
		sleeve: 'short',
		neck: 'round',
		basePriceKobo: 700_000,
		sortOrder: 1
	},
	{
		slug: 'short-sleeve-v-neck',
		name: 'Short-sleeve V-neck',
		sleeve: 'short',
		neck: 'v',
		basePriceKobo: 750_000,
		sortOrder: 2
	},
	{
		slug: 'short-sleeve-collar',
		name: 'Short-sleeve Collar (Polo)',
		sleeve: 'short',
		neck: 'collar',
		basePriceKobo: 1_000_000,
		sortOrder: 3
	},
	{
		slug: 'long-sleeve-round-neck',
		name: 'Long-sleeve Round-neck',
		sleeve: 'long',
		neck: 'round',
		basePriceKobo: 900_000,
		sortOrder: 4
	},
	{
		slug: 'long-sleeve-v-neck',
		name: 'Long-sleeve V-neck',
		sleeve: 'long',
		neck: 'v',
		basePriceKobo: 950_000,
		sortOrder: 5
	},
	{
		slug: 'long-sleeve-collar',
		name: 'Long-sleeve Collar (Polo)',
		sleeve: 'long',
		neck: 'collar',
		basePriceKobo: 1_200_000,
		sortOrder: 6
	}
];

// Text sizes are in units of the printable-area width (1 = full width) so the renderer can scale them.
const textStyles: { slug: string; name: string; config: TextStyleConfig }[] = [
	{ slug: 'plain', name: 'Plain', config: { effect: 'plain', fontSize: 0.16, letterSpacing: 0 } },
	{
		slug: 'arched',
		name: 'Arched',
		config: { effect: 'arc', fontSize: 0.14, letterSpacing: 0.02, arcDegrees: 140, radius: 0.42 }
	},
	{
		slug: 'outlined',
		name: 'Outlined',
		config: { effect: 'outline', fontSize: 0.18, letterSpacing: 0.01, strokeWidth: 0.008 }
	},
	{
		slug: 'stacked',
		name: 'Stacked',
		config: { effect: 'stack', fontSize: 0.22, letterSpacing: 0, lineHeight: 0.92, uppercase: true }
	}
];

// Original artwork on a 100x100 canvas.
const graphics: { slug: string; name: string; config: GraphicConfig }[] = [
	{
		slug: 'star',
		name: 'Star',
		config: {
			viewBox: '0 0 100 100',
			paths: [
				{
					d: 'M50 2 L61.2 34.6 L95.6 35.2 L68.1 55.9 L78.2 88.8 L50 69 L21.8 88.8 L31.9 55.9 L4.4 35.2 L38.8 34.6 Z'
				}
			]
		}
	},
	{
		slug: 'heart',
		name: 'Heart',
		config: {
			viewBox: '0 0 100 100',
			paths: [
				{
					d: 'M50 90 C22 70 4 52 4 32 C4 17 15 7 29 7 C39 7 46 13 50 22 C54 13 61 7 71 7 C85 7 96 17 96 32 C96 52 78 70 50 90 Z'
				}
			]
		}
	},
	{
		slug: 'lightning',
		name: 'Lightning Bolt',
		config: {
			viewBox: '0 0 100 100',
			paths: [{ d: 'M60 2 L18 56 L44 56 L34 98 L82 40 L56 40 L68 2 Z' }]
		}
	},
	{
		slug: 'mountains',
		name: 'Mountain Range',
		config: {
			viewBox: '0 0 100 100',
			paths: [
				{ d: 'M2 88 L28 44 L40 62 L60 24 L98 88 Z' },
				{ d: 'M74 22 A9 9 0 1 0 92 22 A9 9 0 1 0 74 22 Z' }
			]
		}
	},
	{
		slug: 'wave',
		name: 'Wave',
		config: {
			viewBox: '0 0 100 100',
			paths: [
				{
					d: 'M2 50 C14 34 26 34 38 50 C50 66 62 66 74 50 C82 40 90 36 98 38 L98 54 C90 52 82 56 74 66 C62 82 50 82 38 66 C26 50 14 50 2 66 Z'
				}
			]
		}
	}
];

const presets: (typeof designPreset.$inferInsert)[] = [
	...textStyles.map((p, i) => ({ ...p, kind: 'text_style' as const, sortOrder: i + 1 })),
	...graphics.map((p, i) => ({ ...p, kind: 'graphic' as const, sortOrder: i + 1 }))
];

await db
	.insert(shirtStyle)
	.values(styles)
	.onConflictDoUpdate({
		target: shirtStyle.slug,
		set: {
			name: sql`excluded.name`,
			sleeve: sql`excluded.sleeve`,
			neck: sql`excluded.neck`,
			basePriceKobo: sql`excluded.base_price_kobo`,
			sortOrder: sql`excluded.sort_order`
		}
	});

await db
	.insert(designPreset)
	.values(presets)
	.onConflictDoUpdate({
		target: designPreset.slug,
		set: {
			name: sql`excluded.name`,
			kind: sql`excluded.kind`,
			config: sql`excluded.config`,
			sortOrder: sql`excluded.sort_order`
		}
	});

console.log(`Seeded ${styles.length} shirt styles and ${presets.length} design presets.`);
