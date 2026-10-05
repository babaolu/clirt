import { error, fail, redirect } from '@sveltejs/kit';
import { SURCHARGES, getActivePresets, getActiveStyles } from '#lib/server/services/catalog.ts';
import { addCartItem } from '#lib/server/services/cart.ts';
import { failFromService } from '#lib/server/form-errors.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [styles, presets] = await Promise.all([getActiveStyles(), getActivePresets()]);
	const style = styles.find((s) => s.slug === params.slug);
	if (!style) error(404, 'Style not found');

	// Surcharges are for displaying prices on the client only; the server always prices with unitPrice.
	return { style, styles, presets, surcharges: SURCHARGES };
};

export const actions: Actions = {
	addToCart: async ({ request, locals, params }) => {
		const form = await request.formData();
		let raw: unknown;
		try {
			raw = JSON.parse(String(form.get('payload') ?? ''));
		} catch {
			return fail(400, {
				errors: { form: 'Something went wrong reading your design. Please try again.' } as Record<
					string,
					string
				>
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

		try {
			await addCartItem(locals.user.id, raw);
		} catch (err) {
			return failFromService(err);
		}
		redirect(303, '/cart');
	}
};
