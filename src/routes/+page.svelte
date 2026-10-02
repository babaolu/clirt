<script lang="ts">
	import { formatNaira } from '#lib/money.ts';
	import { renderShirtSvg } from '#lib/render/shirt.ts';

	let { data } = $props();

	const sleeveLabel = { short: 'Short sleeve', long: 'Long sleeve' } as const;
	const neckLabel = { round: 'Round neck', v: 'V-neck', collar: 'Collar' } as const;
</script>

<svelte:head><title>Shop · Clirt</title></svelte:head>

<section class="mb-10">
	<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Design a tee that's yours.</h1>
	<p class="mt-3 max-w-xl text-stone-600">
		Pick a cut, choose a colour, then add your own text or a graphic. We print it and ship it to you
		anywhere in Nigeria.
	</p>
</section>

<section aria-labelledby="styles-heading">
	<h2 id="styles-heading" class="mb-4 text-lg font-semibold">Choose a style</h2>

	{#if data.styles.length === 0}
		<p class="rounded-lg border border-dashed border-stone-300 p-6 text-stone-500">
			No styles available yet. Run <code>npm run db:seed</code>.
		</p>
	{:else}
		<ul class="grid grid-cols-2 gap-4 lg:grid-cols-3">
			{#each data.styles as style (style.slug)}
				<li>
					<a
						href={`/customize/${style.slug}`}
						class="group block overflow-hidden rounded-xl border border-stone-200 bg-white transition hover:border-stone-400 hover:shadow-sm"
					>
						<div class="bg-stone-100 p-4">
							{@html renderShirtSvg({
								sleeve: style.sleeve,
								neck: style.neck,
								shirtColorHex: '#ffffff',
								presets: [],
								idPrefix: `home-${style.slug}`,
								className: 'mx-auto h-auto w-full max-w-56',
								title: style.name
							})}
						</div>
						<div class="p-4">
							<div
								class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
							>
								<h3 class="font-semibold">{style.name}</h3>
								<span class="shrink-0 font-semibold">{formatNaira(style.basePriceKobo)}</span>
							</div>
							<p class="mt-1 text-sm text-stone-500">
								{sleeveLabel[style.sleeve]} · {neckLabel[style.neck]}
							</p>
							<p class="mt-3 text-sm font-medium text-stone-900 group-hover:underline">
								Customize →
							</p>
						</div>
					</a>
				</li>
			{/each}
		</ul>
		<p class="mt-4 text-xs text-stone-500">Prices shown are the base price before your design.</p>
	{/if}
</section>
