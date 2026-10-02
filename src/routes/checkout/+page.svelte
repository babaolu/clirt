<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatNaira } from '#lib/money.ts';
	import { NIGERIAN_STATES } from '#lib/nigeria.ts';
	import { googleFontsUrl } from '#lib/render/shirt.ts';

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

	const inputClass = (field: string) => [
		'w-full rounded-md border bg-white px-3 py-2',
		errors[field] ? 'border-red-500' : 'border-stone-300'
	];
</script>

<svelte:head>
	<title>Checkout · Clirt</title>
	<link rel="stylesheet" href={googleFontsUrl()} />
</svelte:head>

<h1 class="text-2xl font-bold">Checkout</h1>

<div class="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
	<form
		method="POST"
		action="?/placeOrder"
		novalidate
		class="space-y-4"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update({ reset: false });
				submitting = false;
			};
		}}
	>
		{#if errors.form}
			<p role="alert" class="rounded-md bg-red-50 p-3 text-sm text-red-700">
				{errors.form} <a href="/cart" class="underline">Go to cart</a>
			</p>
		{/if}

		<h2 class="text-lg font-semibold">Contact</h2>
		<label class="block">
			<span class="mb-1 block text-sm font-medium">Email</span>
			<input
				name="contactEmail"
				type="email"
				autocomplete="email"
				value={values.contactEmail}
				class={inputClass('contactEmail')}
				aria-invalid={!!errors.contactEmail}
			/>
			{#if errors.contactEmail}<span class="mt-1 block text-sm text-red-700"
					>{errors.contactEmail}</span
				>{/if}
		</label>
		<label class="block">
			<span class="mb-1 block text-sm font-medium">Phone</span>
			<input
				name="phone"
				type="tel"
				autocomplete="tel"
				placeholder="0803 123 4567"
				value={values.phone}
				class={inputClass('phone')}
				aria-invalid={!!errors.phone}
			/>
			{#if errors.phone}<span class="mt-1 block text-sm text-red-700">{errors.phone}</span>{/if}
		</label>

		<h2 class="pt-2 text-lg font-semibold">Delivery address</h2>
		<label class="block">
			<span class="mb-1 block text-sm font-medium">Full name</span>
			<input
				name="shippingName"
				autocomplete="name"
				value={values.shippingName}
				class={inputClass('shippingName')}
				aria-invalid={!!errors.shippingName}
			/>
			{#if errors.shippingName}<span class="mt-1 block text-sm text-red-700"
					>{errors.shippingName}</span
				>{/if}
		</label>
		<label class="block">
			<span class="mb-1 block text-sm font-medium">Address</span>
			<input
				name="address"
				autocomplete="street-address"
				value={values.address}
				class={inputClass('address')}
				aria-invalid={!!errors.address}
			/>
			{#if errors.address}<span class="mt-1 block text-sm text-red-700">{errors.address}</span>{/if}
		</label>
		<div class="grid gap-4 sm:grid-cols-2">
			<label class="block">
				<span class="mb-1 block text-sm font-medium">City</span>
				<input
					name="city"
					autocomplete="address-level2"
					value={values.city}
					class={inputClass('city')}
					aria-invalid={!!errors.city}
				/>
				{#if errors.city}<span class="mt-1 block text-sm text-red-700">{errors.city}</span>{/if}
			</label>
			<label class="block">
				<span class="mb-1 block text-sm font-medium">State</span>
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
				{#if errors.state}<span class="mt-1 block text-sm text-red-700">{errors.state}</span>{/if}
			</label>
		</div>
		<label class="block">
			<span class="mb-1 block text-sm font-medium"
				>Notes <span class="font-normal text-stone-500">(optional)</span></span
			>
			<textarea name="notes" rows="3" maxlength="500" class={inputClass('notes')}
				>{values.notes}</textarea
			>
			{#if errors.notes}<span class="mt-1 block text-sm text-red-700">{errors.notes}</span>{/if}
		</label>

		<p class="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
			No payment is taken online. You pay on delivery.
		</p>

		<button
			type="submit"
			disabled={submitting || data.hasProblems}
			class="w-full rounded-md bg-stone-900 px-4 py-3 font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
		>
			{submitting ? 'Placing order…' : `Place order · ${formatNaira(data.subtotalKobo)}`}
		</button>
	</form>

	<aside class="h-fit rounded-xl border border-stone-200 bg-white p-5">
		<h2 class="font-semibold">Order summary</h2>
		<ul class="mt-4 space-y-4">
			{#each data.lines as line (line.id)}
				<li class="flex gap-3">
					<div class="w-16 shrink-0 rounded-md bg-stone-100 p-0.5">{@html line.previewSvg}</div>
					<div class="min-w-0 flex-1 text-sm">
						<p class="font-medium">{line.style.name}</p>
						<p class="text-stone-600">{line.colorName} · {line.size} · ×{line.quantity}</p>
						<p class="truncate text-stone-500">{line.summary}</p>
						{#if line.problem}<p class="text-red-700">{line.problem}</p>{/if}
					</div>
					<p class="text-sm font-medium">{formatNaira(line.lineTotalKobo)}</p>
				</li>
			{/each}
		</ul>
		<dl class="mt-4 space-y-1 border-t border-stone-200 pt-4 text-sm">
			<div class="flex justify-between">
				<dt class="text-stone-600">Subtotal</dt>
				<dd>{formatNaira(data.subtotalKobo)}</dd>
			</div>
			<div class="flex justify-between">
				<dt class="text-stone-600">Delivery</dt>
				<dd>Free</dd>
			</div>
			<div class="flex justify-between text-base font-semibold">
				<dt>Total</dt>
				<dd>{formatNaira(data.subtotalKobo)}</dd>
			</div>
		</dl>
	</aside>
</div>
