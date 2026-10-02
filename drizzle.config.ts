import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs outside Vite, so load .env ourselves (Vercel/CI provide real env vars instead)
try {
	process.loadEnvFile('.env');
} catch {
	// no .env file
}

// `generate` only diffs schema files; every other command needs a database
const needsDb = !process.argv.includes('generate');
if (needsDb && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL ?? '' },
	verbose: true,
	strict: true
});
