import { redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth-guard.ts';
import { getCart } from '#lib/server/services/cart.ts';
import { CHECKOUT_FIELDS, placeOrder } from '#lib/server/services/checkout.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import { failFromService } from '#lib/server/form-errors.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	event.depends('app:cart'); // re-run when a cart-updated event arrives
	const user = requireUser(event);
	const { lines, subtotalKobo } = await getCart(user.id);
	if (lines.length === 0) redirect(303, '/cart');
	return {
		lines,
		subtotalKobo,
		hasProblems: lines.some((l) => l.problem),
		defaults: { contactEmail: user.email, shippingName: user.name }
	};
};

export const actions: Actions = {
	placeOrder: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const values = Object.fromEntries(
			CHECKOUT_FIELDS.map((f) => [f, String(form.get(f) ?? '')])
		) as Record<(typeof CHECKOUT_FIELDS)[number], string>;

		let orderId: string;
		try {
			({ orderId } = await placeOrder(user.id, values, event.url.origin));
		} catch (err) {
			if (err instanceof ServiceError && err.code === 'cart_empty') redirect(303, '/cart');
			return failFromService(err, { values });
		}
		redirect(303, `/orders/${orderId}?placed=1`);
	}
};
