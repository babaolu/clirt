import { json } from '@sveltejs/kit';
import { api, requireApiUser } from '#lib/server/api.ts';
import { deleteAccount } from '#lib/server/services/account.ts';

export const GET = api(async (event) => {
	const user = requireApiUser(event);
	return json({
		user: { id: user.id, name: user.name, email: user.email, image: user.image ?? null }
	});
});

/** Deletes the account and all its data; the client should then discard its session cookie. */
export const DELETE = api(async (event) => {
	const user = requireApiUser(event);
	await deleteAccount(user.id);
	return json({ deleted: true });
});
