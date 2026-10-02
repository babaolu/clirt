import { requireUser } from '#lib/server/auth-guard.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	requireUser(event);
	return {};
};
