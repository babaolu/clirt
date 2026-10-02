<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatNaira } from '#lib/money.ts';
	import { EMAIL_STATUS, ORDER_STATUS, formatOrderDate, orderNumber } from '#lib/order-status.ts';
	import { googleFontsUrl } from '#lib/render/shirt.ts';

	let { data, form } = $props();

	let resending = $state(false);
	const order = $derived(data.order);
</script>

<svelte:head>
	<title>Order #{orderNumber(order.id)} · Clirt</title>
	<link rel="stylesheet" href={googleFontsUrl()} />
</svelte:head>

<a href="/orders" class="text-sm text-stone-500 hover:underline">← My orders</a>

{#if data.placed}
	{#if order.emailStatus === 'sent'}
		<p role="status" class="mt-4 rounded-md bg-emerald-50 p-4 text-emerald-800">
			Order placed. Confirmation sent to <strong>{order.contactEmail}</strong>.
		</p>
	{:else}
		<p role="status" class="mt-4 rounded-md bg-amber-50 p-4 text-amber-900">
			Order placed. We couldn't send the confirmation email.
		</p>
	{/if}
{/if}

<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
	<div>
		<h1 class="text-2xl font-bold">Order #{orderNumber(order.id)}</h1>
		<p class="text-sm text-stone-500">Placed {formatOrderDate(order.createdAt)}</p>
	</div>
	<div class="flex flex-wrap gap-2">
		<span
			class={['rounded-full px-2.5 py-1 text-xs font-medium', ORDER_STATUS[order.status].class]}
		>
			{ORDER_STATUS[order.status].label}
		</span>
		<span
			class={[
				'rounded-full px-2.5 py-1 text-xs font-medium',
				EMAIL_STATUS[order.emailStatus].class
			]}
		>
			{EMAIL_STATUS[order.emailStatus].label}
		</span>
	</div>
</div>

{#if order.emailStatus !== 'sent'}
	<form
		method="POST"
		action="?/resendEmail"
		class="mt-4 flex flex-wrap items-center gap-3"
		use:enhance={() => {
			resending = true;
			return async ({ update }) => {
				await update();
				resending = false;
			};
		}}
	>
		<button
			type="submit"
			disabled={resending}
			class="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
		>
			{resending ? 'Sending…' : 'Resend confirmation email'}
		</button>
	</form>
{/if}
{#if form?.message}
	<p role="status" class={['mt-3 text-sm', form.resent ? 'text-emerald-700' : 'text-red-700']}>
		{form.message}
	</p>
{/if}

<div class="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
	<ul class="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
		{#each data.items as item (item.id)}
			<li class="flex gap-4 p-4">
				<div class="w-24 shrink-0 rounded-lg bg-stone-100 p-1 sm:w-28">
					{#if item.previewSvg}{@html item.previewSvg}{/if}
				</div>
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-start justify-between gap-x-4">
						<h2 class="font-semibold">{item.styleName}</h2>
						<p class="font-semibold">{formatNaira(item.unitPriceKobo * item.quantity)}</p>
					</div>
					<p class="text-sm text-stone-600">
						{item.colorName} · Size {item.size} · ×{item.quantity}
					</p>
					<p class="truncate text-sm text-stone-600">{item.summary}</p>
					<p class="text-sm text-stone-500">{formatNaira(item.unitPriceKobo)} each</p>
				</div>
			</li>
		{/each}
	</ul>

	<aside class="h-fit space-y-5 rounded-xl border border-stone-200 bg-white p-5 text-sm">
		<dl class="space-y-1">
			<div class="flex justify-between">
				<dt class="text-stone-600">Subtotal</dt>
				<dd>{formatNaira(order.subtotalKobo)}</dd>
			</div>
			<div class="flex justify-between">
				<dt class="text-stone-600">Delivery</dt>
				<dd>Free</dd>
			</div>
			<div class="flex justify-between text-base font-semibold">
				<dt>Total</dt>
				<dd>{formatNaira(order.totalKobo)}</dd>
			</div>
		</dl>
		<p class="rounded-md bg-amber-50 p-2 text-amber-900">Pay on delivery</p>
		<div>
			<h2 class="font-semibold">Delivering to</h2>
			<p class="mt-1 text-stone-600">
				{order.shippingName}<br />{order.address}<br />{order.city}, {order.state}<br
				/>{order.phone}
			</p>
		</div>
		<div>
			<h2 class="font-semibold">Contact</h2>
			<p class="mt-1 text-stone-600">{order.contactEmail}</p>
		</div>
		{#if order.notes}
			<div>
				<h2 class="font-semibold">Notes</h2>
				<p class="mt-1 whitespace-pre-line text-stone-600">{order.notes}</p>
			</div>
		{/if}
	</aside>
</div>
