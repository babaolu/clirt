import { json } from '@sveltejs/kit';
import { api, intParam, readJson, requireApiUser, serializeCart } from '#lib/server/api.ts';
import { getCart, removeCartItem, updateCartItemQuantity } from '#lib/server/services/cart.ts';

/** Body: { quantity } → 200 { item, cart } */
export const PATCH = api(async (event) => {
	const user = requireApiUser(event);
	const id = intParam(event.params.id ?? '', 'Cart item');
	const body = (await readJson(event.request)) as { quantity?: unknown } | null;
	await updateCartItemQuantity(user.id, id, body?.quantity);
	const cart = serializeCart(await getCart(user.id));
	return json({ item: cart.items.find((i) => i.id === id) ?? null, cart });
});

/** → 200 { cart } */
export const DELETE = api(async (event) => {
	const user = requireApiUser(event);
	await removeCartItem(user.id, intParam(event.params.id ?? '', 'Cart item'));
	return json({ cart: serializeCart(await getCart(user.id)) });
});
