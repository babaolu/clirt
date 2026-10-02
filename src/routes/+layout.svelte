<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { authClient } from '#lib/auth-client.ts';

	let { data, children } = $props();

	const nav = [
		{ href: '/', label: 'Shop' },
		{ href: '/cart', label: 'Cart' },
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
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex min-h-dvh flex-col bg-stone-50 text-stone-900">
	<header class="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
		<div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
			<a href="/" class="text-lg font-bold tracking-tight">Clirt</a>

			<div class="flex items-center gap-3">
				{#if data.user}
					<div class="flex items-center gap-2">
						{#if data.user.image}
							<img
								src={data.user.image}
								alt={data.user.name}
								class="size-8 rounded-full"
								referrerpolicy="no-referrer"
							/>
						{:else}
							<span
								class="grid size-8 place-items-center rounded-full bg-stone-800 text-xs font-semibold text-white"
								>{initials}</span
							>
						{/if}
						<button
							type="button"
							onclick={signOut}
							disabled={signingOut}
							class="rounded-md px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50"
						>
							Sign out
						</button>
					</div>
				{:else}
					<a
						href={`/signin?redirectTo=${encodeURIComponent(page.url.pathname + page.url.search)}`}
						class="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700"
					>
						Sign in
					</a>
				{/if}
			</div>
		</div>
		<nav class="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
			{#each nav as item (item.href)}
				{@const active =
					item.href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(item.href)}
				<a
					href={item.href}
					aria-current={active ? 'page' : undefined}
					class={[
						'rounded-md px-3 py-1.5 whitespace-nowrap',
						active ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
					]}
				>
					{item.label}
					{#if item.href === '/cart' && data.cartCount > 0}
						<span
							class={[
								'ml-1 rounded-full px-1.5 py-0.5 text-xs font-semibold',
								active ? 'bg-white text-stone-900' : 'bg-stone-900 text-white'
							]}>{data.cartCount}</span
						>
					{/if}
				</a>
			{/each}
		</nav>
	</header>

	<main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
		{@render children()}
	</main>

	<footer class="border-t border-stone-200 py-6 text-center text-xs text-stone-500">
		Clirt · Custom tees printed in Nigeria
	</footer>
</div>
