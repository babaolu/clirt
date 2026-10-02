import { defineEnvVars } from '@sveltejs/kit/env';

/** Treats an unset or empty variable as "not configured". */
const optional = (value: string | undefined) => value?.trim() || undefined;

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'Neon Postgres connection string.' },
	BETTER_AUTH_SECRET: {
		description:
			'Secret used by Better Auth to sign sessions. Generate with `openssl rand -base64 32`.'
	},
	BETTER_AUTH_URL: {
		description:
			'Public base URL of the app, e.g. `http://localhost:5173`. Inferred from the request if unset.',
		schema: optional
	},
	GOOGLE_CLIENT_ID: { description: 'Google OAuth client ID.', schema: optional },
	GOOGLE_CLIENT_SECRET: { description: 'Google OAuth client secret.', schema: optional },
	MAILGUN_API_KEY: { description: 'Mailgun API key (used in a later phase).', schema: optional },
	MAILGUN_DOMAIN: { description: 'Mailgun sending domain.', schema: optional },
	MAILGUN_REGION: {
		description: 'Mailgun region: `us` or `eu`.',
		schema: (value) => {
			const region = optional(value) ?? 'us';
			if (region !== 'us' && region !== 'eu')
				throw new Error('MAILGUN_REGION must be "us" or "eu"');
			return region;
		}
	},
	MAIL_FROM: {
		description:
			'From address for order emails, e.g. `Clirt <postmaster@your-sandbox-domain.mailgun.org>`.',
		schema: optional
	}
});
