<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import {
		DEFAULT_PLACEMENT,
		FONTS,
		SHIRT_COLORS,
		SIZES,
		customizationSchema,
		type Customization,
		type FontKey,
		type GraphicConfig,
		type GraphicPresetSlug,
		type ShirtColor,
		type Size,
		type TextPresetSlug
	} from '#lib/customization.ts';
	import { formatNaira } from '#lib/money.ts';
	import { googleFontsUrl, renderGraphicIcon, renderShirtSvg } from '#lib/render/shirt.ts';

	let { data, form } = $props();

	const DRAFT_KEY = 'clirt:draft:v1';
	const INK_SWATCHES = [
		'#111111',
		'#ffffff',
		'#c62828',
		'#e0a526',
		'#2747b8',
		'#2e5e3e',
		'#db2777',
		'#7c3aed'
	];
	const sleeves = [
		{ value: 'short', label: 'Short sleeve' },
		{ value: 'long', label: 'Long sleeve' }
	] as const;
	const necks = [
		{ value: 'round', label: 'Round' },
		{ value: 'v', label: 'V-neck' },
		{ value: 'collar', label: 'Collar' }
	] as const;

	const textPresets = $derived(data.presets.filter((p) => p.kind === 'text_style'));
	const graphicPresets = $derived(data.presets.filter((p) => p.kind === 'graphic'));

	// Initial values come from the first load; later loads (after form actions) must not reset the editor.
	let styleSlug = $state(untrack(() => data.style.slug));
	let shirtColor = $state<ShirtColor>('white');
	let size = $state<Size>('M');
	let quantity = $state(1);
	let tab = $state<'text' | 'graphic'>('text');
	let text = $state('Your text');
	let font = $state<FontKey>('montserrat');
	let textColor = $state('#111111');
	let textPreset = $state<TextPresetSlug>('plain');
	let graphicPreset = $state<GraphicPresetSlug>('star');
	let graphicColor = $state('#c62828');
	let placement = $state({ ...DEFAULT_PLACEMENT });

	let ready = $state(false);
	let restoredBanner = $state(false);
	let submitting = $state(false);

	const style = $derived(data.styles.find((s) => s.slug === styleSlug) ?? data.style);
	const safeQuantity = $derived(Math.min(20, Math.max(1, Math.round(Number(quantity) || 1))));

	const design = $derived<Customization['design']>(
		tab === 'text'
			? { kind: 'text', text: text.trim(), font, textColor, presetSlug: textPreset }
			: { kind: 'graphic', presetSlug: graphicPreset, graphicColor }
	);
	const customization = $derived<Customization>({
		shirtColor,
		design,
		placement: { x: Number(placement.x), y: Number(placement.y), scale: Number(placement.scale) }
	});
	const valid = $derived(customizationSchema.safeParse(customization).success);

	const unitKobo = $derived(
		style.basePriceKobo + (design.kind === 'text' ? data.surcharges.text : data.surcharges.graphic)
	);

	const previewSvg = $derived(
		renderShirtSvg({
			sleeve: style.sleeve,
			neck: style.neck,
			shirtColorHex: SHIRT_COLORS[shirtColor].hex,
			design: design.kind === 'text' && !design.text ? null : design,
			placement: customization.placement,
			presets: data.presets,
			idPrefix: 'customizer',
			showPrintArea: true,
			className: 'h-auto w-full',
			title: `${style.name} preview`
		})
	);

	const payload = $derived(
		JSON.stringify({ styleSlug: style.slug, size, quantity: safeQuantity, customization })
	);

	function selectStyle(sleeve: 'short' | 'long', neck: 'round' | 'v' | 'collar') {
		const next = data.styles.find((s) => s.sleeve === sleeve && s.neck === neck);
		if (!next || next.slug === styleSlug) return;
		styleSlug = next.slug;
		replaceState(`/customize/${next.slug}${page.url.search}`, {});
	}

	function applyDraft(raw: unknown): boolean {
		const draft = raw as {
			styleSlug?: unknown;
			size?: unknown;
			quantity?: unknown;
			customization?: unknown;
		};
		const parsed = customizationSchema.safeParse(draft?.customization);
		if (!parsed.success) return false;
		const c = parsed.data;
		if (typeof draft.styleSlug === 'string' && draft.styleSlug !== styleSlug) {
			const s = data.styles.find((st) => st.slug === draft.styleSlug);
			if (s) selectStyle(s.sleeve, s.neck);
		}
		if (SIZES.includes(draft.size as Size)) size = draft.size as Size;
		if (typeof draft.quantity === 'number') quantity = draft.quantity;
		shirtColor = c.shirtColor;
		placement = { ...c.placement };
		tab = c.design.kind;
		if (c.design.kind === 'text') {
			text = c.design.text;
			font = c.design.font;
			textColor = c.design.textColor;
			textPreset = c.design.presetSlug;
		} else {
			graphicPreset = c.design.presetSlug;
			graphicColor = c.design.graphicColor;
		}
		return true;
	}

	onMount(() => {
		const resume = page.url.searchParams.get('resume') === '1';
		try {
			const stored = localStorage.getItem(DRAFT_KEY);
			if (stored) {
				const draft = JSON.parse(stored);
				if (resume || draft?.styleSlug === styleSlug) {
					restoredBanner = applyDraft(draft) && resume;
				}
			}
		} catch {
			// storage unavailable or corrupt draft; start fresh
		}
		ready = true;
	});

	$effect(() => {
		if (!ready) return;
		const draft = JSON.stringify({
			styleSlug: style.slug,
			size,
			quantity: safeQuantity,
			customization
		});
		try {
			localStorage.setItem(DRAFT_KEY, draft);
		} catch {
			// ignore (private mode, quota)
		}
	});

	const errors = $derived((form?.errors ?? {}) as Record<string, string>);
	const firstError = $derived(Object.values(errors)[0]);
</script>

<svelte:head>
	<title>Customize {style.name} · Clirt</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link rel="stylesheet" href={googleFontsUrl()} />
</svelte:head>

<a href="/" class="text-sm text-stone-500 hover:underline">← All styles</a>

{#if restoredBanner}
	<p role="status" class="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
		Your design is restored. Add it to your cart.
	</p>
{/if}

<div class="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
	<!-- Preview -->
	<section aria-label="Preview" class="lg:sticky lg:top-28 lg:self-start">
		<div class="rounded-2xl bg-stone-100 p-4 sm:p-8">
			<div class="mx-auto max-w-md">{@html previewSvg}</div>
		</div>
		<div class="mt-4 flex items-baseline justify-between gap-4">
			<h1 class="text-xl font-bold sm:text-2xl">{style.name}</h1>
			<p class="text-right">
				<span class="font-semibold">{formatNaira(unitKobo)} each</span>
				<span class="text-stone-500"> · {formatNaira(unitKobo * safeQuantity)} total</span>
			</p>
		</div>
	</section>

	<!-- Controls -->
	<section aria-label="Options" class="space-y-6">
		<fieldset>
			<legend class="mb-2 text-sm font-semibold">Sleeve</legend>
			<div class="grid grid-cols-2 gap-2">
				{#each sleeves as option (option.value)}
					<button
						type="button"
						aria-pressed={style.sleeve === option.value}
						onclick={() => selectStyle(option.value, style.neck)}
						class={[
							'rounded-md border px-3 py-2 text-sm',
							style.sleeve === option.value
								? 'border-stone-900 bg-stone-900 text-white'
								: 'border-stone-300 bg-white hover:border-stone-500'
						]}>{option.label}</button
					>
				{/each}
			</div>
		</fieldset>

		<fieldset>
			<legend class="mb-2 text-sm font-semibold">Neck</legend>
			<div class="grid grid-cols-3 gap-2">
				{#each necks as option (option.value)}
					<button
						type="button"
						aria-pressed={style.neck === option.value}
						onclick={() => selectStyle(style.sleeve, option.value)}
						class={[
							'rounded-md border px-3 py-2 text-sm',
							style.neck === option.value
								? 'border-stone-900 bg-stone-900 text-white'
								: 'border-stone-300 bg-white hover:border-stone-500'
						]}>{option.label}</button
					>
				{/each}
			</div>
		</fieldset>

		<fieldset>
			<legend class="mb-2 text-sm font-semibold">
				Colour <span class="font-normal text-stone-500">· {SHIRT_COLORS[shirtColor].name}</span>
			</legend>
			<div class="flex flex-wrap gap-2">
				{#each Object.entries(SHIRT_COLORS) as [key, color] (key)}
					<button
						type="button"
						title={color.name}
						aria-label={color.name}
						aria-pressed={shirtColor === key}
						onclick={() => (shirtColor = key as ShirtColor)}
						class={[
							'size-9 rounded-full border border-stone-300 ring-offset-2',
							shirtColor === key && 'ring-2 ring-stone-900'
						]}
						style:background-color={color.hex}
					></button>
				{/each}
			</div>
		</fieldset>

		<div class="grid grid-cols-2 gap-4">
			<label class="block">
				<span class="mb-2 block text-sm font-semibold">Size</span>
				<select
					bind:value={size}
					class="w-full rounded-md border border-stone-300 bg-white px-3 py-2"
				>
					{#each SIZES as s (s)}<option value={s}>{s}</option>{/each}
				</select>
			</label>
			<label class="block">
				<span class="mb-2 block text-sm font-semibold">Quantity</span>
				<input
					type="number"
					min="1"
					max="20"
					bind:value={quantity}
					onblur={() => (quantity = safeQuantity)}
					class="w-full rounded-md border border-stone-300 bg-white px-3 py-2"
				/>
			</label>
		</div>

		<!-- Design -->
		<div>
			<div
				role="tablist"
				aria-label="Design type"
				class="grid grid-cols-2 rounded-lg bg-stone-200 p-1"
			>
				{#each [{ value: 'text', label: 'Text' }, { value: 'graphic', label: 'Graphic' }] as t (t.value)}
					<button
						type="button"
						role="tab"
						aria-selected={tab === t.value}
						onclick={() => (tab = t.value as 'text' | 'graphic')}
						class={[
							'rounded-md py-2 text-sm font-medium',
							tab === t.value ? 'bg-white shadow-sm' : 'text-stone-600'
						]}>{t.label}</button
					>
				{/each}
			</div>

			{#if tab === 'text'}
				<div class="mt-4 space-y-5">
					<label class="block">
						<span class="mb-2 flex justify-between text-sm font-semibold">
							Your text <span class="font-normal text-stone-500">{text.length}/40</span>
						</span>
						<input
							type="text"
							maxlength="40"
							bind:value={text}
							class="w-full rounded-md border border-stone-300 bg-white px-3 py-2"
						/>
					</label>

					<fieldset>
						<legend class="mb-2 text-sm font-semibold">Font</legend>
						<div class="grid grid-cols-2 gap-2">
							{#each Object.entries(FONTS) as [key, f] (key)}
								<button
									type="button"
									aria-pressed={font === key}
									onclick={() => (font = key as FontKey)}
									class={[
										'truncate rounded-md border px-3 py-2 text-left text-lg',
										font === key
											? 'border-stone-900 ring-1 ring-stone-900'
											: 'border-stone-300 bg-white'
									]}
									style:font-family={f.family}
									style:font-weight={f.weight}
								>
									{f.name}
								</button>
							{/each}
						</div>
					</fieldset>

					<fieldset>
						<legend class="mb-2 text-sm font-semibold">Text colour</legend>
						<div class="flex flex-wrap items-center gap-2">
							{#each INK_SWATCHES as hex (hex)}
								<button
									type="button"
									aria-label={`Colour ${hex}`}
									aria-pressed={textColor === hex}
									onclick={() => (textColor = hex)}
									class={[
										'size-8 rounded-full border border-stone-300 ring-offset-2',
										textColor === hex && 'ring-2 ring-stone-900'
									]}
									style:background-color={hex}
								></button>
							{/each}
							<input
								type="color"
								bind:value={textColor}
								aria-label="Custom text colour"
								class="h-8 w-10 cursor-pointer rounded border border-stone-300 bg-white"
							/>
						</div>
					</fieldset>

					<fieldset>
						<legend class="mb-2 text-sm font-semibold">Style</legend>
						<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
							{#each textPresets as preset (preset.slug)}
								<button
									type="button"
									aria-pressed={textPreset === preset.slug}
									onclick={() => (textPreset = preset.slug as TextPresetSlug)}
									class={[
										'rounded-md border px-3 py-2 text-sm',
										textPreset === preset.slug
											? 'border-stone-900 bg-stone-900 text-white'
											: 'border-stone-300 bg-white hover:border-stone-500'
									]}>{preset.name}</button
								>
							{/each}
						</div>
					</fieldset>
				</div>
			{:else}
				<div class="mt-4 space-y-5">
					<fieldset>
						<legend class="mb-2 text-sm font-semibold">Graphic</legend>
						<div class="grid grid-cols-5 gap-2">
							{#each graphicPresets as preset (preset.slug)}
								<button
									type="button"
									title={preset.name}
									aria-label={preset.name}
									aria-pressed={graphicPreset === preset.slug}
									onclick={() => (graphicPreset = preset.slug as GraphicPresetSlug)}
									class={[
										'aspect-square rounded-md border bg-white p-2',
										graphicPreset === preset.slug
											? 'border-stone-900 ring-1 ring-stone-900'
											: 'border-stone-300 hover:border-stone-500'
									]}
								>
									{@html renderGraphicIcon(preset.config as GraphicConfig, '#292524')}
								</button>
							{/each}
						</div>
					</fieldset>

					<fieldset>
						<legend class="mb-2 text-sm font-semibold">Graphic colour</legend>
						<div class="flex flex-wrap items-center gap-2">
							{#each INK_SWATCHES as hex (hex)}
								<button
									type="button"
									aria-label={`Colour ${hex}`}
									aria-pressed={graphicColor === hex}
									onclick={() => (graphicColor = hex)}
									class={[
										'size-8 rounded-full border border-stone-300 ring-offset-2',
										graphicColor === hex && 'ring-2 ring-stone-900'
									]}
									style:background-color={hex}
								></button>
							{/each}
							<input
								type="color"
								bind:value={graphicColor}
								aria-label="Custom graphic colour"
								class="h-8 w-10 cursor-pointer rounded border border-stone-300 bg-white"
							/>
						</div>
					</fieldset>
				</div>
			{/if}
		</div>

		<fieldset class="space-y-3">
			<div class="flex items-center justify-between">
				<legend class="text-sm font-semibold">Placement</legend>
				<button
					type="button"
					onclick={() => (placement = { ...DEFAULT_PLACEMENT })}
					class="text-sm text-stone-600 underline hover:text-stone-900">Reset position</button
				>
			</div>
			<label class="block text-sm">
				<span class="flex justify-between text-stone-600"
					>Design size <span>{Math.round(placement.scale * 100)}%</span></span
				>
				<input
					type="range"
					min="0.4"
					max="1.6"
					step="0.01"
					bind:value={placement.scale}
					class="w-full accent-stone-900"
				/>
			</label>
			<label class="block text-sm">
				<span class="text-stone-600">Left ↔ right</span>
				<input
					type="range"
					min="0"
					max="1"
					step="0.01"
					bind:value={placement.x}
					class="w-full accent-stone-900"
				/>
			</label>
			<label class="block text-sm">
				<span class="text-stone-600">Up ↕ down</span>
				<input
					type="range"
					min="0"
					max="1"
					step="0.01"
					bind:value={placement.y}
					class="w-full accent-stone-900"
				/>
			</label>
		</fieldset>

		<form
			method="POST"
			action="?/addToCart"
			use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					if (result.type === 'redirect' && result.location === '/cart') {
						try {
							localStorage.removeItem(DRAFT_KEY);
						} catch {
							// ignore
						}
					}
					await update();
					submitting = false;
				};
			}}
		>
			<input type="hidden" name="payload" value={payload} />
			{#if firstError}
				<p role="alert" class="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{firstError}</p>
			{/if}
			{#if tab === 'text' && !text.trim()}
				<p class="mb-3 text-sm text-amber-700">Enter some text, or switch to a graphic.</p>
			{/if}
			<button
				type="submit"
				disabled={!valid || submitting}
				class="w-full rounded-md bg-stone-900 px-4 py-3 font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
			>
				{submitting ? 'Adding…' : `Add to cart · ${formatNaira(unitKobo * safeQuantity)}`}
			</button>
		</form>
	</section>
</div>
