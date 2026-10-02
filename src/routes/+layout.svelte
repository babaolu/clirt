<script lang="ts">
	import './layout.css';
	// Self-hosted fonts (no third-party requests). Brand faces:
	import '@fontsource-variable/bricolage-grotesque/opsz.css';
	import '@fontsource-variable/instrument-sans';
	// Design fonts offered in the customizer (see FONTS); @font-face files only download when used.
	import '@fontsource/montserrat/800.css';
	import '@fontsource/playfair-display/700.css';
	import '@fontsource/pacifico/400.css';
	import '@fontsource/bungee/400.css';
	import '@fontsource/space-mono/400.css';
	import '@fontsource/space-mono/700.css';
	import '@fontsource/oswald/600.css';
	import favicon from '#lib/assets/favicon.svg';
	import Logo from '#lib/components/Logo.svelte';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { authClient } from '#lib/auth-client.ts';

	let { data, children } = $props();

	const nav = [
		{ href: '/', label: 'Shop' },
		{ href: '/orders', label: 'My orders' }
	];

	let signingOut = $state(false);

	async function signOut() {
		signingOut = true;
		try {
			await authClient.signOut();
			await invalidateAll();
		} finally {
			signingOut = false;
		}
	}

	const initials = $derived(
		(data.user?.name || data.user?.email || '?')
			.split(/\s+/)
			.map((part) => part[0])
			.slice(0, 2)
			.join('')
			.toUpperCase()
	);
	const isActive = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<meta name="theme-color" content="#1f2a5c" />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<header class="z-20 border-b border-mist bg-paper/90 backdrop-blur lg:sticky lg:top-0">
		<div class="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-6">
			<a href="/" aria-label="Clirt home" class="mr-auto sm:mr-0"><Logo /></a>

			<nav aria-label="Main" class="hidden items-center gap-1 sm:flex">
				{#each nav as item (item.href)}
					<a
						href={item.href}
						aria-current={isActive(item.href) ? 'page' : undefined}
						class={[
							'rounded-lg px-3 py-2 text-sm font-medium',
							isActive(item.href)
								? 'text-indigo underline decoration-marigold decoration-2 underline-offset-8'
								: 'text-slate hover:text-indigo'
						]}>{item.label}</a
					>
				{/each}
			</nav>

			<div class="flex items-center gap-2 sm:ml-auto">
				<a
					href="/cart"
					aria-current={isActive('/cart') ? 'page' : undefined}
					class="relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-indigo hover:bg-fog"
				>
					<svg
						viewBox="0 0 24 24"
						class="size-5"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						aria-hidden="true"
					>
						<path d="M5 7h14l-1.2 12.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5 7Z" /><path
							d="M9 7V6a3 3 0 0 1 6 0v1"
						/>
					</svg>
					<span class="max-sm:sr-only">Cart</span>
					{#if data.cartCount > 0}
						<span class="badge bg-marigold text-ink" aria-label={`${data.cartCount} items`}
							>{data.cartCount}</span
						>
					{/if}
				</a>

				{#if data.user}
					{#if data.user.image}
						<img
							src={data.user.image}
							alt=""
							class="size-8 rounded-full ring-2 ring-mist"
							referrerpolicy="no-referrer"
						/>
					{:else}
						<span
							class="grid size-8 place-items-center rounded-full bg-indigo font-mono text-xs font-bold text-paper"
							aria-hidden="true">{initials}</span
						>
					{/if}
					<button
						type="button"
						onclick={signOut}
						disabled={signingOut}
						class="btn btn-ghost px-2 whitespace-nowrap"
					>
						{signingOut ? 'Signing out…' : 'Sign out'}
					</button>
				{:else}
					<a
						href={`/signin?redirectTo=${encodeURIComponent(page.url.pathname + page.url.search)}`}
						class="btn btn-secondary py-2"
					>
						Sign in
					</a>
				{/if}
			</div>
		</div>
		<nav aria-label="Main" class="mx-auto flex max-w-6xl gap-1 px-4 pb-2 sm:hidden">
			{#each nav as item (item.href)}
				<a
					href={item.href}
					aria-current={isActive(item.href) ? 'page' : undefined}
					class={[
						'rounded-lg px-3 py-1.5 text-sm font-medium',
						isActive(item.href) ? 'bg-indigo text-paper' : 'text-slate'
					]}>{item.label}</a
				>
			{/each}
		</nav>
	</header>

	<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
		{@render children()}
	</main>

	<footer class="border-t border-mist">
		<div
			class="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-slate sm:flex-row sm:items-center sm:justify-between"
		>
			<p>Clirt · Custom tees printed in Nigeria</p>
			<nav aria-label="Footer" class="flex gap-4">
				<a href="/" class="hover:text-indigo">Shop</a>
				<a href="/privacy" class="hover:text-indigo">Privacy</a>
			</nav>
		</div>
	</footer>
</div>
