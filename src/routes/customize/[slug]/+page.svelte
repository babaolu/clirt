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
	import { PRINT_AREA, renderGraphicIcon, renderShirtSvg } from '#lib/render/shirt.ts';
	import RegMarks from '#lib/components/RegMarks.svelte';

	let { data, form } = $props();

	const DRAFT_KEY = 'clirt:draft:v1';
	const INK_SWATCHES = [
		{ hex: '#111111', name: 'Black' },
		{ hex: '#ffffff', name: 'White' },
		{ hex: '#1f2a5c', name: 'Indigo' },
		{ hex: '#f2b230', name: 'Marigold' },
		{ hex: '#c62828', name: 'Red' },
		{ hex: '#2e5e3e', name: 'Forest' },
		{ hex: '#db2777', name: 'Pink' },
		{ hex: '#7c3aed', name: 'Violet' }
	];
	const sleeves = [
		{ value: 'short', label: 'Short' },
		{ value: 'long', label: 'Long' }
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
	let dragging = $state(false);
	let plateEl = $state<HTMLDivElement>();

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
			className: 'mx-auto block h-auto w-full max-lg:max-h-[34vh] max-lg:w-auto',
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

	// ---- Positioning: drag on the preview, or arrow keys ----
	const clamp01 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;
	let dragStart: { id: number; x: number; y: number; originX: number; originY: number } | null =
		null;

	/** Pointer position in print-area units (0–1 across the printable rectangle). */
	function toPrintArea(event: PointerEvent) {
		// The plate also holds the registration-mark SVGs; target the shirt preview itself.
		const svg = plateEl?.querySelector<SVGSVGElement>('svg[role="img"]');
		const ctm = svg?.getScreenCTM();
		if (!ctm) return null;
		const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
		return { x: (p.x - PRINT_AREA.x) / PRINT_AREA.w, y: (p.y - PRINT_AREA.y) / PRINT_AREA.h };
	}

	function onPointerDown(event: PointerEvent) {
		if (event.button !== 0) return;
		const p = toPrintArea(event);
		if (!p) return;
		dragStart = { id: event.pointerId, x: p.x, y: p.y, originX: placement.x, originY: placement.y };
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		dragging = true;
		event.preventDefault();
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragStart || event.pointerId !== dragStart.id) return;
		const p = toPrintArea(event);
		if (!p) return;
		placement.x = clamp01(dragStart.originX + p.x - dragStart.x);
		placement.y = clamp01(dragStart.originY + p.y - dragStart.y);
	}

	function onPointerEnd(event: PointerEvent) {
		if (dragStart && event.pointerId === dragStart.id) {
			dragStart = null;
			dragging = false;
		}
	}

	function onKeyDown(event: KeyboardEvent) {
		const step = event.shiftKey ? 0.1 : 0.02;
		const moves: Record<string, [number, number]> = {
			ArrowLeft: [-step, 0],
			ArrowRight: [step, 0],
			ArrowUp: [0, -step],
			ArrowDown: [0, step]
		};
		const move = moves[event.key];
		if (!move) return;
		event.preventDefault();
		placement.x = clamp01(placement.x + move[0]);
		placement.y = clamp01(placement.y + move[1]);
	}

	// ---- Draft persistence ----
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
</svelte:head>

{#snippet inkSwatches(current: string, pick: (hex: string) => void, label: string)}
	<div class="flex flex-wrap items-center gap-2.5">
		{#each INK_SWATCHES as swatch (swatch.hex)}
			<button
				type="button"
				aria-label={`${label}: ${swatch.name}`}
				title={swatch.name}
				aria-pressed={current.toLowerCase() === swatch.hex}
				onclick={() => pick(swatch.hex)}
				class="swatch size-8"
				style:background-color={swatch.hex}
			></button>
		{/each}
		<label class="relative inline-flex items-center gap-2 text-sm text-slate">
			<input
				type="color"
				value={current}
				oninput={(e) => pick(e.currentTarget.value)}
				aria-label={`${label}: custom colour`}
				class="h-8 w-10 cursor-pointer rounded-md border border-mist bg-white p-0.5"
			/>
			<span class="font-mono text-xs uppercase">{current}</span>
		</label>
	</div>
{/snippet}

<div class="pb-28 lg:pb-0">
	<a href="/" class="text-sm text-slate hover:text-indigo">← All styles</a>

	{#if restoredBanner}
		<p role="status" class="alert alert-success mt-4">
			Your design is restored. Add it to your cart.
		</p>
	{/if}

	<div
		class="mt-4 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10"
	>
		<!-- Preview + order bar -->
		<div
			class="z-10 max-lg:sticky max-lg:top-0 max-lg:-mx-4 max-lg:bg-paper max-lg:px-4 max-lg:pt-2 max-lg:pb-3 max-lg:shadow-[0_8px_16px_-12px_rgba(31,42,92,0.35)] lg:sticky lg:top-24 lg:self-start"
		>
			<section aria-label="Preview">
				<!-- role="application": a custom 2D drag + arrow-key surface; Svelte doesn't count it as interactive -->
				<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
				<div
					bind:this={plateEl}
					class={[
						'plate touch-none p-3 select-none sm:p-8',
						dragging ? 'cursor-grabbing' : 'cursor-grab'
					]}
					role="application"
					aria-roledescription="design position"
					aria-label="Design preview. Drag the design to move it, or use the arrow keys. Hold Shift to move further."
					tabindex="0"
					onpointerdown={onPointerDown}
					onpointermove={onPointerMove}
					onpointerup={onPointerEnd}
					onpointercancel={onPointerEnd}
					onkeydown={onKeyDown}
				>
					<RegMarks />
					{@html previewSvg}
				</div>
				<p class="spec mt-2 text-center max-lg:hidden">
					Drag the design to move it · Arrow keys nudge it
				</p>
			</section>

			<div class="mt-3 flex items-baseline justify-between gap-3 max-lg:hidden">
				<h1 class="text-2xl font-extrabold">{style.name}</h1>
				<p class="spec shrink-0">{SHIRT_COLORS[shirtColor].name} · {size}</p>
			</div>

			<!-- Order bar: fixed at the bottom on mobile, under the preview on desktop -->
			<form
				method="POST"
				action="?/addToCart"
				class="z-30 border-mist bg-paper/95 backdrop-blur max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:border-t max-lg:px-4 max-lg:py-3 lg:mt-4"
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
					<p role="alert" class="alert alert-error mb-3">{firstError}</p>
				{/if}
				{#if tab === 'text' && !text.trim()}
					<p class="mb-2 text-sm text-alert">Enter some text, or switch to a graphic.</p>
				{/if}
				<div class="flex items-center gap-4">
					<p class="min-w-0 flex-1 leading-tight" aria-live="polite">
						<span class="price block text-lg font-bold">{formatNaira(unitKobo)} each</span>
						<span class="text-sm text-slate"
							>{formatNaira(unitKobo * safeQuantity)} total · {safeQuantity} × {size}</span
						>
					</p>
					<button
						type="submit"
						disabled={!valid || submitting}
						class="btn btn-primary px-5 py-3 text-base"
					>
						{submitting ? 'Adding…' : 'Add to cart'}
					</button>
				</div>
			</form>
		</div>

		<!-- Controls -->
		<div class="space-y-5">
			<h1 class="text-2xl font-extrabold lg:hidden">{style.name}</h1>

			<section class="card space-y-5 p-5" aria-labelledby="shirt-heading">
				<h2 id="shirt-heading" class="text-lg font-bold">Shirt</h2>
				<div class="grid gap-4 sm:grid-cols-[2fr_3fr]">
					<fieldset>
						<legend class="label">Sleeve</legend>
						<div class="grid grid-cols-2 gap-2">
							{#each sleeves as option (option.value)}
								<button
									type="button"
									aria-pressed={style.sleeve === option.value}
									onclick={() => selectStyle(option.value, style.neck)}
									class="chip">{option.label}</button
								>
							{/each}
						</div>
					</fieldset>
					<fieldset>
						<legend class="label">Neck</legend>
						<div class="grid grid-cols-3 gap-2">
							{#each necks as option (option.value)}
								<button
									type="button"
									aria-pressed={style.neck === option.value}
									onclick={() => selectStyle(style.sleeve, option.value)}
									class="chip">{option.label}</button
								>
							{/each}
						</div>
					</fieldset>
				</div>
				<fieldset>
					<legend class="label"
						>Colour <span class="font-normal text-slate">· {SHIRT_COLORS[shirtColor].name}</span
						></legend
					>
					<div class="flex flex-wrap gap-3">
						{#each Object.entries(SHIRT_COLORS) as [key, color] (key)}
							<button
								type="button"
								title={color.name}
								aria-label={color.name}
								aria-pressed={shirtColor === key}
								onclick={() => (shirtColor = key as ShirtColor)}
								class="swatch size-9"
								style:background-color={color.hex}
							></button>
						{/each}
					</div>
				</fieldset>
				<div class="grid grid-cols-2 gap-4">
					<label class="block">
						<span class="label">Size</span>
						<select bind:value={size} class="input">
							{#each SIZES as s (s)}<option value={s}>{s}</option>{/each}
						</select>
					</label>
					<label class="block">
						<span class="label">Quantity</span>
						<input
							type="number"
							min="1"
							max="20"
							bind:value={quantity}
							onblur={() => (quantity = safeQuantity)}
							class="input"
						/>
					</label>
				</div>
			</section>

			<section class="card space-y-5 p-5" aria-labelledby="design-heading">
				<div class="flex items-center justify-between gap-3">
					<h2 id="design-heading" class="text-lg font-bold">Design</h2>
					<div
						role="tablist"
						aria-label="Design type"
						class="grid grid-cols-2 gap-1 rounded-lg bg-fog p-1"
					>
						{#each [{ value: 'text', label: 'Text' }, { value: 'graphic', label: 'Graphic' }] as t (t.value)}
							<button
								type="button"
								role="tab"
								aria-selected={tab === t.value}
								onclick={() => (tab = t.value as 'text' | 'graphic')}
								class={[
									'rounded-md px-4 py-1.5 text-sm font-semibold',
									tab === t.value
										? 'bg-white text-indigo shadow-sm'
										: 'text-slate hover:text-indigo'
								]}>{t.label}</button
							>
						{/each}
					</div>
				</div>

				{#if tab === 'text'}
					<label class="block">
						<span class="label flex justify-between">
							Your text <span class="font-mono text-xs font-normal text-slate"
								>{text.length}/40</span
							>
						</span>
						<input type="text" maxlength="40" bind:value={text} class="input" />
					</label>

					<fieldset>
						<legend class="label">Font</legend>
						<div class="grid grid-cols-2 gap-2">
							{#each Object.entries(FONTS) as [key, f] (key)}
								<button
									type="button"
									aria-pressed={font === key}
									onclick={() => (font = key as FontKey)}
									class="chip truncate text-left text-lg"
									style:font-family={f.family}
									style:font-weight={f.weight}
								>
									{f.name}
								</button>
							{/each}
						</div>
					</fieldset>

					<fieldset>
						<legend class="label">Text colour</legend>
						{@render inkSwatches(textColor, (hex) => (textColor = hex), 'Text colour')}
					</fieldset>

					<fieldset>
						<legend class="label">Style</legend>
						<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
							{#each textPresets as preset (preset.slug)}
								<button
									type="button"
									aria-pressed={textPreset === preset.slug}
									onclick={() => (textPreset = preset.slug as TextPresetSlug)}
									class="chip">{preset.name}</button
								>
							{/each}
						</div>
					</fieldset>
				{:else}
					<fieldset>
						<legend class="label">Graphic</legend>
						<div class="grid grid-cols-5 gap-2">
							{#each graphicPresets as preset (preset.slug)}
								<button
									type="button"
									title={preset.name}
									aria-label={preset.name}
									aria-pressed={graphicPreset === preset.slug}
									onclick={() => (graphicPreset = preset.slug as GraphicPresetSlug)}
									class={[
										'aspect-square rounded-lg border bg-white p-2.5 transition',
										graphicPreset === preset.slug
											? 'border-indigo bg-marigold-soft ring-2 ring-indigo'
											: 'border-mist hover:border-indigo-soft'
									]}
								>
									{@html renderGraphicIcon(preset.config as GraphicConfig, '#1f2a5c')}
								</button>
							{/each}
						</div>
					</fieldset>

					<fieldset>
						<legend class="label">Graphic colour</legend>
						{@render inkSwatches(graphicColor, (hex) => (graphicColor = hex), 'Graphic colour')}
					</fieldset>
				{/if}
			</section>

			<section class="card space-y-4 p-5" aria-labelledby="position-heading">
				<div class="flex items-center justify-between">
					<h2 id="position-heading" class="text-lg font-bold">Position</h2>
					<button
						type="button"
						onclick={() => (placement = { ...DEFAULT_PLACEMENT })}
						class="btn btn-ghost px-2 py-1"
					>
						Reset position
					</button>
				</div>
				<p class="text-sm text-slate lg:hidden">Tip: drag the design on the preview to move it.</p>
				<label class="block text-sm">
					<span class="flex justify-between font-medium text-indigo">
						Design size <span class="font-mono text-xs text-slate"
							>{Math.round(placement.scale * 100)}%</span
						>
					</span>
					<input
						type="range"
						min="0.4"
						max="1.6"
						step="0.01"
						bind:value={placement.scale}
						class="w-full accent-indigo"
					/>
				</label>
				<label class="block text-sm">
					<span class="font-medium text-indigo">Left ↔ right</span>
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						bind:value={placement.x}
						class="w-full accent-indigo"
					/>
				</label>
				<label class="block text-sm">
					<span class="font-medium text-indigo">Up ↕ down</span>
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						bind:value={placement.y}
						class="w-full accent-indigo"
					/>
				</label>
			</section>
		</div>
	</div>
</div>
