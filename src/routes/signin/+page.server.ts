import { redirect } from '@sveltejs/kit';
import { googleEnabled } from '#lib/server/auth.ts';
import { safeRedirectPath } from '#lib/redirect.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const redirectTo = safeRedirectPath(url.searchParams.get('redirectTo'));
	if (locals.user) redirect(303, redirectTo);

	return { redirectTo, googleEnabled, error: url.searchParams.get('error') };
};
