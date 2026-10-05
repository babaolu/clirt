import { json } from '@sveltejs/kit';
import { api, readJson, requireApiUser, serializeCart } from '#lib/server/api.ts';
import { addCartItem, getCart } from '#lib/server/services/cart.ts';

/** Body: { styleSlug, size, quantity, customization } → 201 { item, cart } */
export const POST = api(async (event) => {
	const user = requireApiUser(event);
	const { id } = await addCartItem(user.id, await readJson(event.request));
	const cart = serializeCart(await getCart(user.id));
	return json({ item: cart.items.find((i) => i.id === id) ?? null, cart }, { status: 201 });
});
