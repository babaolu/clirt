import type { z } from 'zod';

/**
 * A failure the caller should see. Form actions turn it into fail(); the JSON API into
 * { error: { code, message, fields? } } with `status`.
 */
export class ServiceError extends Error {
	constructor(
		readonly status: 400 | 401 | 403 | 404 | 409 | 502 | 503,
		readonly code: string,
		message: string,
		readonly fields?: Record<string, string>
	) {
		super(message);
		this.name = 'ServiceError';
	}
}

/** First message per field path, e.g. { 'customization.design.text': 'Too long' }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
	const fields: Record<string, string> = {};
	for (const issue of error.issues) {
		const key = issue.path.length ? issue.path.join('.') : 'form';
		fields[key] ??= issue.message;
	}
	return fields;
}

export const validationError = (
	error: z.ZodError,
	message = 'Please check the highlighted fields.'
) => new ServiceError(400, 'validation_failed', message, fieldErrors(error));

export const notFound = (what: string) => new ServiceError(404, 'not_found', `${what} not found.`);
