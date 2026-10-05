import { error, fail } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth-guard.ts';
import { getOrder, resendOrderEmail } from '#lib/server/services/orders.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	try {
		const { items, ...order } = await getOrder(user.id, event.params.id);
		return { placed: event.url.searchParams.get('placed') === '1', order, items };
	} catch (err) {
		if (err instanceof ServiceError && err.status === 404) error(404, 'Order not found');
		throw err;
	}
};

export const actions: Actions = {
	resendEmail: async (event) => {
		const user = requireUser(event);
		try {
			const { contactEmail } = await resendOrderEmail(user.id, event.params.id, event.url.origin);
			return { resent: true, message: `Confirmation sent to ${contactEmail}.` };
		} catch (err) {
			if (!(err instanceof ServiceError)) throw err;
			if (err.status === 404) error(404, 'Order not found');
			if (err.code === 'already_sent') return { resent: false, message: err.message };
			return fail(err.status, { resent: false, message: err.message });
		}
	}
};
