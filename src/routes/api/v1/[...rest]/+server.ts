import { apiError } from '#lib/server/api.ts';
import type { RequestHandler } from './$types';

/** Unknown /api/v1 paths get the JSON error envelope instead of an HTML 404 page. */
export const fallback: RequestHandler = () => apiError(404, 'not_found', 'No such endpoint.');
