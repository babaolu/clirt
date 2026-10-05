import { json } from '@sveltejs/kit';
import { api, requireApiUser } from '#lib/server/api.ts';
import { authorizeChannel } from '#lib/server/services/realtime.ts';
import { ServiceError } from '#lib/server/services/errors.ts';

/**
 * Pusher private-channel auth. Accepts pusher-js's default form body (web) or JSON (mobile; SvelteKit
 * rejects cross-site form posts without an Origin header, so native clients should send JSON).
 */
export const POST = api(async (event) => {
	const user = requireApiUser(event);
	const type = event.request.headers.get('content-type') ?? '';
	let socketId: unknown;
	let channelName: unknown;
	if (type.includes('application/json')) {
		const body = (await event.request.json().catch(() => null)) as Record<string, unknown> | null;
		socketId = body?.socket_id;
		channelName = body?.channel_name;
	} else {
		const form = await event.request.formData().catch(() => null);
		socketId = form?.get('socket_id');
		channelName = form?.get('channel_name');
	}
	if (typeof socketId !== 'string' || typeof channelName !== 'string') {
		throw new ServiceError(400, 'invalid_body', 'socket_id and channel_name are required.');
	}
	return json(authorizeChannel(user.id, socketId, channelName));
});
