import { json } from '@sveltejs/kit';
import { api, readJson, requireApiUser } from '#lib/server/api.ts';
import { placeOrder } from '#lib/server/services/checkout.ts';

/** Body: { contactEmail, shippingName, phone, address, city, state, notes? } → 201 { orderId, emailStatus } */
export const POST = api(async (event) => {
	const user = requireApiUser(event);
	const result = await placeOrder(user.id, await readJson(event.request), event.url.origin);
	return json(result, { status: 201 });
});
