import { redirect, type RequestEvent } from '@sveltejs/kit';

/** Returns the signed-in user, or redirects to /signin with a redirectTo back to the current page. */
export function requireUser(event: RequestEvent) {
	const user = event.locals.user;
	if (!user) {
		const redirectTo = event.url.pathname + event.url.search;
		redirect(303, `/signin?redirectTo=${encodeURIComponent(redirectTo)}`);
	}
	return user;
}
