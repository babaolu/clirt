import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// The built-in CSRF check is re-applied in hooks.server.ts (src/lib/server/csrf.ts), which also
			// lets the Android app's Origin-less API calls through.
			csrf: { trustedOrigins: ['*'] },
			// Run functions next to the Neon database (eu-west-2, London)
			adapter: adapter({ regions: ['lhr1'] })
		})
	]
});
