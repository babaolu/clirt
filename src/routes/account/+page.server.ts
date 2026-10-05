import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth-guard.ts';
import { deleteAccount } from '#lib/server/services/account.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const user = requireUser(event);
	return { account: { name: user.name, email: user.email, image: user.image ?? null } };
};

export const actions: Actions = {
	deleteAccount: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		if (String(form.get('confirm') ?? '').trim() !== 'DELETE') {
			return fail(400, { error: 'Type DELETE to confirm.' });
		}

		await deleteAccount(user.id); // cascades to sessions, linked Google account, cart and orders

		// The session row is gone; clear the auth cookies (plain and __Secure- prefixed) from this browser.
		for (const { name } of event.cookies.getAll()) {
			if (/^(__Secure-)?better-auth\./.test(name)) {
				event.cookies.delete(name, { path: '/', secure: name.startsWith('__Secure-') });
			}
		}
		redirect(303, '/?accountDeleted=1');
	}
};
