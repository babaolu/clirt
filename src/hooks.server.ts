import { json, text } from '@sveltejs/kit';
import { sequence, type Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.ts';
import { isCsrfForbidden } from '#lib/server/csrf.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const handleCsrf: Handle = ({ event, resolve }) => {
	if (isCsrfForbidden(event.request, event.url)) {
		const message = `Cross-site ${event.request.method} form submissions are forbidden`;
		return event.request.headers.get('accept') === 'application/json'
			? json({ message }, { status: 403 })
			: text(message, { status: 403 });
	}
	return resolve(event);
};

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = sequence(handleCsrf, handleBetterAuth);
