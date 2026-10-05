import Pusher from 'pusher';
import { PUSHER_APP_ID, PUSHER_SECRET } from '$app/env/private';
import { PUSHER_CLUSTER, PUSHER_KEY } from '$app/env/public';
import { ServiceError } from '#lib/server/services/errors.ts';

const TRIGGER_TIMEOUT_MS = 1500;

/** null when PUSHER_* aren't configured: everything works, just without live updates. */
const pusher =
	PUSHER_APP_ID && PUSHER_KEY && PUSHER_SECRET && PUSHER_CLUSTER
		? new Pusher({
				appId: PUSHER_APP_ID,
				key: PUSHER_KEY,
				secret: PUSHER_SECRET,
				cluster: PUSHER_CLUSTER,
				useTLS: true
			})
		: null;

export const userChannel = (userId: string) => `private-user-${userId}`;

/** Tell the user's open web tabs and app sessions that their cart changed. Never throws. */
export async function publishCartUpdated(userId: string, itemCount: number): Promise<void> {
	if (!pusher) return;
	try {
		await Promise.race([
			pusher.trigger(userChannel(userId), 'cart-updated', {
				itemCount,
				at: new Date().toISOString()
			}),
			new Promise((_, reject) =>
				setTimeout(
					() => reject(new Error(`timed out after ${TRIGGER_TIMEOUT_MS}ms`)),
					TRIGGER_TIMEOUT_MS
				)
			)
		]);
	} catch (err) {
		console.error('Pusher cart-updated failed:', err instanceof Error ? err.message : err);
	}
}

/** Private-channel auth: a user may only subscribe to their own channel. */
export function authorizeChannel(userId: string, socketId: string, channelName: string) {
	if (!pusher)
		throw new ServiceError(503, 'realtime_unavailable', 'Live updates are not configured.');
	if (channelName !== userChannel(userId)) {
		throw new ServiceError(403, 'forbidden_channel', 'You can only subscribe to your own channel.');
	}
	if (!/^\d+\.\d+$/.test(socketId))
		throw new ServiceError(400, 'invalid_socket_id', 'Invalid socket_id.');
	return pusher.authorizeChannel(socketId, channelName);
}
