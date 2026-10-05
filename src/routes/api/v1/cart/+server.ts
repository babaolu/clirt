import { json } from '@sveltejs/kit';
import { api, requireApiUser, serializeCart } from '#lib/server/api.ts';
import { getCart } from '#lib/server/services/cart.ts';

export const GET = api(async (event) => {
	const user = requireApiUser(event);
	return json(serializeCart(await getCart(user.id)));
});
