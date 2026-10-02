import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { cartItem } from '#lib/server/db/schema.ts';
import { SIZES, customizationSchema } from '#lib/customization.ts';
import {
	getActivePresets,
	getActiveStyleBySlug,
	getActiveStyles,
	presetError
} from '#lib/server/catalog.ts';
import { GRAPHIC_DESIGN_SURCHARGE_KOBO, TEXT_DESIGN_SURCHARGE_KOBO } from '#lib/server/pricing.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [styles, presets] = await Promise.all([getActiveStyles(), getActivePresets()]);
	const style = styles.find((s) => s.slug === params.slug);
	if (!style) error(404, 'Style not found');

	return {
		style,
		styles,
		presets,
		// For displaying prices on the client only; the server always prices with unitPrice.
		surcharges: { text: TEXT_DESIGN_SURCHARGE_KOBO, graphic: GRAPHIC_DESIGN_SURCHARGE_KOBO }
	};
};

const addToCartSchema = z.object({
	styleSlug: z.string().min(1),
	size: z.enum(SIZES, { error: 'Choose a size' }),
	quantity: z.number().int().min(1, 'Quantity must be 1–20').max(20, 'Quantity must be 1–20'),
	customization: customizationSchema
});

type FieldErrors = Record<string, string>;

export const actions: Actions = {
	addToCart: async ({ request, locals, params }) => {
		const form = await request.formData();
		let raw: unknown;
		try {
			raw = JSON.parse(String(form.get('payload') ?? ''));
		} catch {
			return fail(400, {
				errors: {
					form: 'Something went wrong reading your design. Please try again.'
				} as FieldErrors
			});
		}

		if (!locals.user) {
			const slugCandidate = (raw as { styleSlug?: unknown })?.styleSlug;
			const slug =
				typeof slugCandidate === 'string' && /^[a-z0-9-]+$/.test(slugCandidate)
					? slugCandidate
					: params.slug;
			redirect(303, `/signin?redirectTo=${encodeURIComponent(`/customize/${slug}?resume=1`)}`);
		}

		const parsed = addToCartSchema.safeParse(raw);
		if (!parsed.success) {
			const errors: FieldErrors = {};
			for (const issue of parsed.error.issues) {
				const key = issue.path.length ? issue.path.join('.') : 'form';
				errors[key] ??= issue.message;
			}
			return fail(400, { errors });
		}
		const { styleSlug, size, quantity, customization } = parsed.data;

		const [style, presets] = await Promise.all([
			getActiveStyleBySlug(styleSlug),
			getActivePresets()
		]);
		if (!style)
			return fail(400, {
				errors: { styleSlug: 'That style is no longer available.' } as FieldErrors
			});
		const badPreset = presetError(customization.design, presets);
		if (badPreset)
			return fail(400, { errors: { 'customization.design.presetSlug': badPreset } as FieldErrors });

		await db.insert(cartItem).values({
			userId: locals.user.id,
			shirtStyleId: style.id,
			size,
			quantity,
			customization
		});

		redirect(303, '/cart');
	}
};
