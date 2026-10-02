import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { cartItem } from '#lib/server/db/schema.ts';
import { requireUser } from '#lib/server/auth-guard.ts';
import { loadCart } from '#lib/server/catalog.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const { lines, subtotalKobo } = await loadCart(user.id);
	return { lines, subtotalKobo };
};

const idSchema = z.coerce.number().int().positive();
const quantitySchema = z.coerce.number().int().min(1).max(20);

export const actions: Actions = {
	updateQuantity: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const id = idSchema.safeParse(form.get('id'));
		const quantity = quantitySchema.safeParse(form.get('quantity'));
		if (!id.success) return fail(400, { message: 'Unknown cart item.' });
		if (!quantity.success)
			return fail(400, { id: id.data, message: 'Quantity must be between 1 and 20.' });

		await db
			.update(cartItem)
			.set({ quantity: quantity.data })
			.where(and(eq(cartItem.id, id.data), eq(cartItem.userId, user.id)));
	},

	remove: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const id = idSchema.safeParse(form.get('id'));
		if (!id.success) return fail(400, { message: 'Unknown cart item.' });

		await db.delete(cartItem).where(and(eq(cartItem.id, id.data), eq(cartItem.userId, user.id)));
	}
};
