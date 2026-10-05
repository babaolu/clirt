import { json } from '@sveltejs/kit';
import { api, requireApiUser } from '#lib/server/api.ts';
import { orderNumber } from '#lib/order-status.ts';
import { getOrder } from '#lib/server/services/orders.ts';

export const GET = api(async (event) => {
	const user = requireApiUser(event);
	const order = await getOrder(user.id, event.params.id ?? '');
	return json({ order: { ...order, number: orderNumber(order.id) } });
});
