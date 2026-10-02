/**
 * Returns `target` if it is a same-site relative path (e.g. "/cart?x=1"), otherwise `fallback`.
 * Rejects absolute URLs, protocol-relative "//host" and backslash tricks.
 */
export function safeRedirectPath(target: string | null | undefined, fallback = '/'): string {
	if (!target || !target.startsWith('/') || target.startsWith('//') || target.includes('\\')) {
		return fallback;
	}
	try {
		const base = 'http://local.invalid';
		const url = new URL(target, base);
		if (url.origin !== base) return fallback;
		return url.pathname + url.search + url.hash;
	} catch {
		return fallback;
	}
}
