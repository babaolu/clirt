import { cartQuantity } from '#lib/server/services/cart.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	depends('app:cart'); // re-run when a cart-updated event arrives
	const user = locals.user;
	return {
		user: user
			? { id: user.id, name: user.name, email: user.email, image: user.image ?? null }
			: null,
		cartCount: user ? await cartQuantity(user.id) : 0
	};
};
