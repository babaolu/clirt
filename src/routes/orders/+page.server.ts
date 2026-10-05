import { requireUser } from '#lib/server/auth-guard.ts';
import { listOrders } from '#lib/server/services/orders.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	return { orders: await listOrders(user.id) };
};
