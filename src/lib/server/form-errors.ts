import { fail } from '@sveltejs/kit';
import { ServiceError } from '#lib/server/services/errors.ts';

/** Turn a ServiceError into a form-action failure (keeping `extra`, e.g. submitted values); rethrow anything else. */
export function failFromService<T extends Record<string, unknown> = Record<never, never>>(
	err: unknown,
	extra: T = {} as T
) {
	if (!(err instanceof ServiceError)) throw err;
	return fail(err.status, {
		...extra,
		message: err.message,
		errors: err.fields ?? { form: err.message }
	});
}
