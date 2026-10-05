import { json } from '@sveltejs/kit';
import { api } from '#lib/server/api.ts';
import { getCatalog } from '#lib/server/services/catalog.ts';

/** Public: active styles and presets plus the customization constants and surcharges. */
export const GET = api(async () => json(await getCatalog()));
