import {
	BETTER_AUTH_URL,
	MAIL_FROM,
	MAILGUN_API_KEY,
	MAILGUN_DOMAIN,
	MAILGUN_REGION
} from '$app/env/private';
import { orderNumber } from '#lib/order-status.ts';
import {
	buildHtml,
	buildText,
	type EmailItem,
	type EmailOrder
} from '#lib/server/email-template.ts';

export type { EmailItem, EmailOrder } from '#lib/server/email-template.ts';

export type EmailResult = { ok: boolean; messageId?: string; error?: string };

const truncate = (value: string, max = 500) =>
	value.length > max ? value.slice(0, max - 1) + '…' : value;

/** Sends the order confirmation through Mailgun's HTTP API. Never throws. */
export async function sendOrderConfirmation(
	order: EmailOrder,
	items: EmailItem[],
	fallbackOrigin?: string
): Promise<EmailResult> {
	if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN || !MAIL_FROM) {
		return {
			ok: false,
			error: 'Email is not configured (MAILGUN_API_KEY, MAILGUN_DOMAIN and MAIL_FROM are required).'
		};
	}
	// Catch malformed senders (e.g. a missing closing ">") before Mailgun rejects them with a vague 400.
	if (!/^(?:[^<>]+<[^<>\s@]+@[^<>\s@]+>|[^<>\s@]+@[^<>\s@]+)$/.test(MAIL_FROM.trim())) {
		return {
			ok: false,
			error: 'MAIL_FROM is not a valid sender. Use the form "Clirt <postmaster@your-domain>".'
		};
	}

	const origin = (BETTER_AUTH_URL ?? fallbackOrigin ?? '').replace(/\/$/, '');
	const orderUrl = `${origin}/orders/${order.id}`;
	const host = MAILGUN_REGION === 'eu' ? 'api.eu.mailgun.net' : 'api.mailgun.net';

	const body = new URLSearchParams({
		from: MAIL_FROM,
		to: order.contactEmail,
		subject: `Your Clirt order #${orderNumber(order.id)}`,
		text: buildText(order, items, orderUrl),
		html: buildHtml(order, items, orderUrl)
	});

	try {
		const response = await fetch(
			`https://${host}/v3/${encodeURIComponent(MAILGUN_DOMAIN)}/messages`,
			{
				method: 'POST',
				headers: { Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}` },
				body,
				signal: AbortSignal.timeout(10_000)
			}
		);
		const raw = await response.text();
		if (!response.ok) {
			return { ok: false, error: truncate(`Mailgun ${response.status}: ${raw}`) };
		}
		let messageId: string | undefined;
		try {
			messageId = (JSON.parse(raw) as { id?: string }).id;
		} catch {
			// non-JSON success body; keep going without an id
		}
		return { ok: true, messageId };
	} catch (err) {
		const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
		return { ok: false, error: truncate(`Could not reach Mailgun: ${message}`) };
	}
}
