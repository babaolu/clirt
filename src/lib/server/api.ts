import { json, type RequestEvent, type RequestHandler } from '@sveltejs/kit';
import { ServiceError } from '#lib/server/services/errors.ts';

/** JSON error envelope used by every /api/v1 endpoint. */
export function apiError(
	status: number,
	code: string,
	message: string,
	fields?: Record<string, string>
) {
	return json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

/** The signed-in user (web cookie or the Cookie header the Expo client sends); 401, never a redirect. */
export function requireApiUser(event: RequestEvent) {
	const user = event.locals.user;
	if (!user) throw new ServiceError(401, 'unauthorized', 'Sign in to continue.');
	return user;
}

export async function readJson(request: Request): Promise<unknown> {
	const type = request.headers.get('content-type') ?? '';
	if (!type.includes('application/json')) {
		throw new ServiceError(
			400,
			'invalid_body',
			'Send a JSON body with Content-Type: application/json.'
		);
	}
	try {
		return await request.json();
	} catch {
		throw new ServiceError(400, 'invalid_json', 'The request body is not valid JSON.');
	}
}

/** Positive integer route param, or 404 (an id that can't exist is simply not found). */
export function intParam(value: string, what: string): number {
	const id = Number(value);
	if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id <= 0) {
		throw new ServiceError(404, 'not_found', `${what} not found.`);
	}
	return id;
}

/** Wraps a handler so ServiceErrors become JSON errors and anything else a JSON 500. */
export function api(handler: RequestHandler): RequestHandler {
	return async (event) => {
		try {
			return await handler(event);
		} catch (err) {
			if (err instanceof ServiceError)
				return apiError(err.status, err.code, err.message, err.fields);
			console.error(`API ${event.request.method} ${event.url.pathname} failed:`, err);
			return apiError(500, 'internal_error', 'Something went wrong. Please try again.');
		}
	};
}

type CartLike = {
	lines: {
		id: number;
		size: string;
		quantity: number;
		style: { slug: string; name: string };
		customization: unknown;
		summary: string;
		unitPriceKobo: number;
		lineTotalKobo: number;
		previewSvg: string;
		problem: string | null;
	}[];
	itemCount: number;
	subtotalKobo: number;
};

/** Public cart shape for the API (no internal ids such as the style's numeric id). */
export function serializeCart(cart: CartLike) {
	return {
		items: cart.lines.map((line) => ({
			id: line.id,
			styleSlug: line.style.slug,
			styleName: line.style.name,
			size: line.size,
			quantity: line.quantity,
			customization: line.customization,
			designSummary: line.summary,
			unitPriceKobo: line.unitPriceKobo,
			lineTotalKobo: line.lineTotalKobo,
			previewSvg: line.previewSvg,
			problem: line.problem
		})),
		itemCount: cart.itemCount,
		subtotalKobo: cart.subtotalKobo
	};
}
