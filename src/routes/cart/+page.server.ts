import { requireUser } from '#lib/server/auth-guard.ts';
import { getCart, removeCartItem, updateCartItemQuantity } from '#lib/server/services/cart.ts';
import { failFromService } from '#lib/server/form-errors.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	event.depends('app:cart'); // re-run when a cart-updated event arrives
	const user = requireUser(event);
	const { lines, subtotalKobo } = await getCart(user.id);
	return { lines, subtotalKobo };
};

const itemId = (value: FormDataEntryValue | null) => Number(value) || 0;

export const actions: Actions = {
	updateQuantity: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const raw = String(form.get('quantity') ?? '').trim();
		try {
			await updateCartItemQuantity(user.id, itemId(form.get('id')), raw === '' ? NaN : Number(raw));
		} catch (err) {
			return failFromService(err);
		}
	},

	remove: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		try {
			await removeCartItem(user.id, itemId(form.get('id')));
		} catch (err) {
			return failFromService(err);
		}
	}
};
