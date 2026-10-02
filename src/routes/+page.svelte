<script lang="ts">
	import { SHIRT_COLORS } from '#lib/customization.ts';
	import { formatNaira } from '#lib/money.ts';
	import { renderShirtSvg } from '#lib/render/shirt.ts';
	import RegMarks from '#lib/components/RegMarks.svelte';

	let { data } = $props();

	const sleeveLabel = { short: 'Short sleeve', long: 'Long sleeve' } as const;
	const neckLabel = { round: 'Round neck', v: 'V-neck', collar: 'Collar' } as const;

	const featuredSvg = $derived(
		renderShirtSvg({
			sleeve: 'short',
			neck: 'round',
			shirtColorHex: SHIRT_COLORS.mustard.hex,
			design: {
				kind: 'text',
				text: 'Owambe Crew',
				font: 'bungee',
				textColor: '#1f2a5c',
				presetSlug: 'stacked'
			},
			placement: { x: 0.5, y: 0.32, scale: 1 },
			presets: data.presets,
			idPrefix: 'hero',
			className: 'h-auto w-full drop-shadow-[0_18px_24px_rgba(31,42,92,0.18)]',
			title: 'A mustard tee printed with "Owambe Crew"'
		})
	);
	const startHref = $derived(`/customize/${data.styles[0]?.slug ?? ''}`);

	const steps = [
		{
			title: 'Choose your shirt',
			body: 'Short or long sleeve, with a round, V or collar neck, in eight colours.'
		},
		{
			title: 'Make it yours',
			body: 'Add up to 40 characters in one of six fonts, or pick a graphic. Drag it into place.'
		},
		{
			title: 'Preview & order',
			body: "What you see is what we print. Check out in a minute and pay when it's delivered."
		}
	];
</script>

<svelte:head>
	<title>Shop · Clirt</title>
	<meta
		name="description"
		content="Design your own T-shirt: pick a cut and colour, add text or a graphic, preview it live, and pay on delivery anywhere in Nigeria."
	/>
</svelte:head>

<section class="grid items-center gap-10 pb-14 md:grid-cols-[1.05fr_1fr] md:gap-12 md:pb-20">
	<div>
		<p class="spec">Custom tees · Printed in Nigeria · Pay on delivery</p>
		<h1 class="overprint mt-4 text-5xl leading-[0.95] font-extrabold sm:text-6xl lg:text-7xl">
			Say it on a tee.
		</h1>
		<p class="mt-6 max-w-md text-lg text-slate">
			Pick a cut and colour, add your own words or a graphic, and see it live before you order.
		</p>
		<div class="mt-8 flex flex-wrap items-center gap-3">
			<a href={startHref} class="btn btn-primary px-6 py-3 text-base">Start designing</a>
			<a href="#styles" class="btn btn-ghost px-4 py-3 text-base">See all six styles ↓</a>
		</div>
	</div>

	<figure class="plate mx-auto w-full max-w-md p-8 sm:p-10">
		<RegMarks />
		{@html featuredSvg}
		<figcaption class="spec mt-2 text-center">Short-sleeve · Mustard · Bungee · Stacked</figcaption>
	</figure>
</section>

<section aria-labelledby="how-heading" class="border-y border-mist py-12">
	<h2 id="how-heading" class="text-2xl font-bold sm:text-3xl">How it works</h2>
	<ol class="mt-8 grid gap-8 sm:grid-cols-3">
		{#each steps as step, i (step.title)}
			<li class="flex gap-4">
				<span
					class="grid size-10 shrink-0 place-items-center rounded-full bg-indigo font-mono text-sm font-bold text-marigold"
					>{i + 1}</span
				>
				<div>
					<h3 class="text-lg font-bold">{step.title}</h3>
					<p class="mt-1 text-slate">{step.body}</p>
				</div>
			</li>
		{/each}
	</ol>
</section>

<section id="styles" aria-labelledby="styles-heading" class="scroll-mt-24 pt-12">
	<div class="flex flex-wrap items-end justify-between gap-2">
		<h2 id="styles-heading" class="text-2xl font-bold sm:text-3xl">Choose your shirt</h2>
		<p class="text-sm text-slate">
			Base prices. Text adds {formatNaira(data.surcharges.text)}, a graphic {formatNaira(
				data.surcharges.graphic
			)}.
		</p>
	</div>

	{#if data.styles.length === 0}
		<p class="card mt-6 p-6 text-slate">No styles are available right now. Check back soon.</p>
	{:else}
		<ul class="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
			{#each data.styles as style (style.slug)}
				<li>
					<a
						href={`/customize/${style.slug}`}
						class="group card block overflow-hidden transition hover:-translate-y-0.5 hover:border-indigo/40 hover:shadow-[4px_4px_0_var(--color-marigold)]"
					>
						<div class="plate rounded-none border-0 border-b border-mist p-4 sm:p-6">
							{@html renderShirtSvg({
								sleeve: style.sleeve,
								neck: style.neck,
								shirtColorHex: '#ffffff',
								presets: [],
								idPrefix: `home-${style.slug}`,
								className: 'mx-auto h-auto w-full max-w-52 transition group-hover:scale-[1.03]',
								title: style.name
							})}
						</div>
						<div class="p-4">
							<h3 class="text-base leading-snug font-bold sm:text-lg">{style.name}</h3>
							<p class="spec mt-1">{sleeveLabel[style.sleeve]} · {neckLabel[style.neck]}</p>
							<p class="mt-3 flex items-center justify-between gap-2">
								<span class="price text-sm font-bold text-ink"
									>{formatNaira(style.basePriceKobo)}</span
								>
								<span class="text-sm font-semibold text-indigo group-hover:underline"
									>Customize →</span
								>
							</p>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
