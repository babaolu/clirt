/**
 * SvelteKit's CSRF rule, re-applied in hooks (the built-in check is turned off in vite.config.ts)
 * with one exception: requests to the JSON API and Better Auth that carry no Origin header.
 *
 * Browsers always send Origin on cross-site POST/PUT/PATCH/DELETE, so a request without one comes
 * from a native client (the Android app), not from a victim's browser. Without this exception the
 * built-in check rejects the app's bodyless DELETE/POST calls (e.g. DELETE /api/v1/me) with 403.
 */
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const FORM_TYPES = new Set([
	'application/x-www-form-urlencoded',
	'multipart/form-data',
	'text/plain',
	'application/x-sveltekit-formdata'
]);
const NATIVE_CLIENT_PATHS = ['/api/v1/', '/api/auth/'];

export function isCsrfForbidden(request: Request, url: URL): boolean {
	if (!MUTATING.has(request.method)) return false;
	const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
	if (type && !FORM_TYPES.has(type)) return false; // e.g. application/json can't be sent cross-site without CORS
	const origin = request.headers.get('origin');
	if (origin === url.origin) return false;
	if (!origin && NATIVE_CLIENT_PATHS.some((p) => url.pathname.startsWith(p))) return false;
	return true;
}
