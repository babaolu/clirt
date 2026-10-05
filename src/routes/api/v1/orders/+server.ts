import { json } from '@sveltejs/kit';
import { api, requireApiUser } from '#lib/server/api.ts';
import { orderNumber } from '#lib/order-status.ts';
import { listOrders } from '#lib/server/services/orders.ts';

export const GET = api(async (event) => {
	const user = requireApiUser(event);
	const rows = await listOrders(user.id);
	return json({ orders: rows.map((o) => ({ ...o, number: orderNumber(o.id) })) });
});
