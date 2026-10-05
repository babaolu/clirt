import {
	BETTER_AUTH_SECRET,
	BETTER_AUTH_URL,
	EXPO_DEV_ORIGINS,
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET
} from '$app/env/private';
import { dev } from '$app/env';
import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '#lib/server/db/index.ts';

/** Google is the only sign-in method; without credentials the app still runs, sign-in is just unavailable. */
export const googleEnabled = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

/** Deep-link scheme of the Clirt Android app. */
export const APP_SCHEME = 'clirt://';

/**
 * The Expo plugin appends the session cookie to redirects into trusted app origins, so Expo Go
 * (exp://) origins are only trusted in local dev or when EXPO_DEV_ORIGINS=true is set explicitly.
 */
const expoDevOrigins =
	dev || EXPO_DEV_ORIGINS ? ['exp://', 'exp://**', 'exp://192.168.*.*:*/**'] : [];

export const auth = betterAuth({
	baseURL: BETTER_AUTH_URL,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	// Mobile sign-in uses the same Google web client via the system browser, then returns to clirt://.
	trustedOrigins: [APP_SCHEME, ...expoDevOrigins],
	socialProviders: googleEnabled
		? {
				google: {
					clientId: GOOGLE_CLIENT_ID!,
					clientSecret: GOOGLE_CLIENT_SECRET!,
					prompt: 'select_account'
				}
			}
		: {},
	plugins: [
		expo(),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
