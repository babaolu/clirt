<script lang="ts">
	import { formatNaira } from '#lib/money.ts';

	let { data } = $props();
</script>

<svelte:head><title>Customize {data.style.name} · Tee Studio</title></svelte:head>

<a href="/" class="text-sm text-stone-500 hover:underline">← All styles</a>
<h1 class="mt-3 text-2xl font-bold">{data.style.name}</h1>
<p class="mt-1 text-stone-600">From {formatNaira(data.style.basePriceKobo)}</p>
<p class="mt-6 rounded-lg border border-dashed border-stone-300 p-6 text-stone-500">
	The customizer is coming soon.
</p>
