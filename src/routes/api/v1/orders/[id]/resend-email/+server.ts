import { json } from '@sveltejs/kit';
import { api, requireApiUser } from '#lib/server/api.ts';
import { resendOrderEmail } from '#lib/server/services/orders.ts';

/** → 200 { emailStatus: 'sent' } · 409 already sent · 502 Mailgun failed again */
export const POST = api(async (event) => {
	const user = requireApiUser(event);
	const { emailStatus } = await resendOrderEmail(user.id, event.params.id ?? '', event.url.origin);
	return json({ emailStatus });
});
