<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatNaira } from '#lib/money.ts';
	import { NIGERIAN_STATES } from '#lib/nigeria.ts';
	import { liveSync } from '#lib/live-sync.svelte.ts';

	let { data, form } = $props();

	let submitting = $state(false);

	const values = $derived({
		contactEmail: form?.values?.contactEmail ?? data.defaults.contactEmail,
		shippingName: form?.values?.shippingName ?? data.defaults.shippingName,
		phone: form?.values?.phone ?? '',
		address: form?.values?.address ?? '',
		city: form?.values?.city ?? '',
		state: form?.values?.state ?? '',
		notes: form?.values?.notes ?? ''
	});
	const errors = $derived((form?.errors ?? {}) as Record<string, string>);
	const inputClass = (field: string) => ['input', errors[field] && 'input-invalid'];
</script>

<svelte:head><title>Checkout · Clirt</title></svelte:head>

<a href="/cart" class="text-sm text-slate hover:text-indigo">← Back to cart</a>
<h1 class="mt-2 text-3xl font-extrabold">Checkout</h1>

<div class="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-8">
	<form
		method="POST"
		action="?/placeOrder"
		novalidate
		class="space-y-6"
		use:enhance={() => {
			submitting = true;
			liveSync.paused++; // placing the order empties the cart; don't reload /checkout mid-submit
			return async ({ update }) => {
				try {
					await update({ reset: false });
				} finally {
					submitting = false;
					liveSync.paused--;
				}
			};
		}}
	>
		{#if errors.form}
			<p role="alert" class="alert alert-error">
				{errors.form} <a href="/cart" class="font-semibold underline">Review your cart</a>
			</p>
		{/if}

		<fieldset class="card space-y-4 p-5">
			<legend class="sr-only">Contact</legend>
			<h2 class="text-lg font-bold">Contact</h2>
			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="label">Email</span>
					<input
						name="contactEmail"
						type="email"
						autocomplete="email"
						value={values.contactEmail}
						class={inputClass('contactEmail')}
						aria-invalid={!!errors.contactEmail}
					/>
					{#if errors.contactEmail}<span class="field-error">{errors.contactEmail}</span>{/if}
				</label>
				<label class="block">
					<span class="label">Phone</span>
					<input
						name="phone"
						type="tel"
						autocomplete="tel"
						placeholder="0803 123 4567"
						value={values.phone}
						class={inputClass('phone')}
						aria-invalid={!!errors.phone}
					/>
					{#if errors.phone}<span class="field-error">{errors.phone}</span>{/if}
				</label>
			</div>
		</fieldset>

		<fieldset class="card space-y-4 p-5">
			<legend class="sr-only">Delivery address</legend>
			<h2 class="text-lg font-bold">Delivery address</h2>
			<label class="block">
				<span class="label">Full name</span>
				<input
					name="shippingName"
					autocomplete="name"
					value={values.shippingName}
					class={inputClass('shippingName')}
					aria-invalid={!!errors.shippingName}
				/>
				{#if errors.shippingName}<span class="field-error">{errors.shippingName}</span>{/if}
			</label>
			<label class="block">
				<span class="label">Address</span>
				<input
					name="address"
					autocomplete="street-address"
					placeholder="House number, street, area"
					value={values.address}
					class={inputClass('address')}
					aria-invalid={!!errors.address}
				/>
				{#if errors.address}<span class="field-error">{errors.address}</span>{/if}
			</label>
			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="label">City</span>
					<input
						name="city"
						autocomplete="address-level2"
						value={values.city}
						class={inputClass('city')}
						aria-invalid={!!errors.city}
					/>
					{#if errors.city}<span class="field-error">{errors.city}</span>{/if}
				</label>
				<label class="block">
					<span class="label">State</span>
					<select
						name="state"
						autocomplete="address-level1"
						value={values.state}
						class={inputClass('state')}
						aria-invalid={!!errors.state}
					>
						<option value="" disabled>Choose a state</option>
						{#each NIGERIAN_STATES as s (s)}<option value={s}>{s}</option>{/each}
					</select>
					{#if errors.state}<span class="field-error">{errors.state}</span>{/if}
				</label>
			</div>
			<label class="block">
				<span class="label">Notes <span class="font-normal text-slate">(optional)</span></span>
				<textarea
					name="notes"
					rows="3"
					maxlength="500"
					placeholder="Landmark, best time to call…"
					class={inputClass('notes')}>{values.notes}</textarea
				>
				{#if errors.notes}<span class="field-error">{errors.notes}</span>{/if}
			</label>
		</fieldset>

		<p class="alert alert-warning">No payment is taken online. You pay on delivery.</p>

		<button
			type="submit"
			disabled={submitting || data.hasProblems}
			class="btn btn-primary w-full py-3.5 text-base"
		>
			{submitting ? 'Placing order…' : `Place order · ${formatNaira(data.subtotalKobo)}`}
		</button>
	</form>

	<aside class="card h-fit p-5 lg:sticky lg:top-24">
		<h2 class="text-lg font-bold">Order summary</h2>
		<ul class="mt-4 space-y-4">
			{#each data.lines as line (line.id)}
				<li class="flex gap-3">
					<div class="plate w-16 shrink-0 rounded-lg p-0.5">{@html line.previewSvg}</div>
					<div class="min-w-0 flex-1 text-sm">
						<p class="font-semibold">{line.style.name}</p>
						<p class="spec">{line.colorName} · {line.size} · ×{line.quantity}</p>
						<p class="truncate text-slate">{line.summary}</p>
						{#if line.problem}<p class="text-alert">{line.problem}</p>{/if}
					</div>
					<p class="price text-sm font-bold">{formatNaira(line.lineTotalKobo)}</p>
				</li>
			{/each}
		</ul>
		<dl class="mt-5 space-y-2 border-t border-mist pt-4 text-sm">
			<div class="flex justify-between">
				<dt class="text-slate">Subtotal</dt>
				<dd class="price">{formatNaira(data.subtotalKobo)}</dd>
			</div>
			<div class="flex justify-between">
				<dt class="text-slate">Delivery</dt>
				<dd>Free</dd>
			</div>
			<div class="flex justify-between border-t border-mist pt-3 text-base font-bold">
				<dt>Total</dt>
				<dd class="price">{formatNaira(data.subtotalKobo)}</dd>
			</div>
		</dl>
	</aside>
</div>
