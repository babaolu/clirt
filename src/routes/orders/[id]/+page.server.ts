import { error, fail } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth-guard.ts';
import { deliverOrderEmail, getUserOrder } from '#lib/server/orders.ts';
import { describeDesign, shirtColorName } from '#lib/customization.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const found = await getUserOrder(event.params.id, user.id);
	if (!found) error(404, 'Order not found');

	const { order, items } = found;
	return {
		placed: event.url.searchParams.get('placed') === '1',
		order: {
			id: order.id,
			createdAt: order.createdAt,
			status: order.status,
			subtotalKobo: order.subtotalKobo,
			totalKobo: order.totalKobo,
			contactEmail: order.contactEmail,
			shippingName: order.shippingName,
			phone: order.phone,
			address: order.address,
			city: order.city,
			state: order.state,
			notes: order.notes,
			emailStatus: order.emailStatus
		},
		items: items.map((item) => ({
			id: item.id,
			styleName: item.styleName,
			size: item.size,
			quantity: item.quantity,
			unitPriceKobo: item.unitPriceKobo,
			colorName: shirtColorName(item.customization.shirtColor),
			summary: describeDesign(item.customization.design),
			previewSvg: item.previewSvg
		}))
	};
};

export const actions: Actions = {
	resendEmail: async (event) => {
		const user = requireUser(event);
		const found = await getUserOrder(event.params.id, user.id);
		if (!found) error(404, 'Order not found');
		if (found.order.emailStatus === 'sent')
			return { resent: false, message: 'The confirmation email was already sent.' };

		const result = await deliverOrderEmail(found.order.id, user.id, event.url.origin);
		if (!result.ok)
			return fail(502, {
				resent: false,
				message: "We couldn't send the email. Please try again later."
			});
		return { resent: true, message: `Confirmation sent to ${found.order.contactEmail}.` };
	}
};
