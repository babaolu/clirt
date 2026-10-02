<script lang="ts">
	import { page } from '$app/state';
	import RegMarks from '#lib/components/RegMarks.svelte';

	const notFound = $derived(page.status === 404);
</script>

<svelte:head
	><title>{notFound ? 'Page not found' : 'Something went wrong'} · Clirt</title></svelte:head
>

<section class="plate mx-auto max-w-xl px-6 py-14 text-center sm:px-12">
	<RegMarks />
	<p class="spec">Error {page.status}</p>
	<h1 class="overprint mt-3 text-4xl font-extrabold sm:text-5xl">
		{notFound ? 'This page is a misprint.' : 'The press jammed.'}
	</h1>
	<p class="mx-auto mt-4 max-w-sm text-slate">
		{#if notFound}
			We couldn't find what you were looking for. It may have moved or never existed.
		{:else}
			Something went wrong on our side. Please try again in a moment.
		{/if}
	</p>
	<a href="/" class="btn btn-primary mt-8 px-6 py-3 text-base">Back to the shop</a>
</section>
