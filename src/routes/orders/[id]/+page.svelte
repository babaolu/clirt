<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatNaira } from '#lib/money.ts';
	import { EMAIL_STATUS, ORDER_STATUS, formatOrderDate, orderNumber } from '#lib/order-status.ts';

	let { data, form } = $props();

	let resending = $state(false);
	const order = $derived(data.order);
</script>

<svelte:head><title>Order #{orderNumber(order.id)} · Clirt</title></svelte:head>

<a href="/orders" class="text-sm text-slate hover:text-indigo">← My orders</a>

{#if data.placed}
	{#if order.emailStatus === 'sent'}
		<p role="status" class="alert alert-success mt-4 text-base">
			Order placed. Confirmation sent to <strong>{order.contactEmail}</strong>.
		</p>
	{:else}
		<p role="status" class="alert alert-warning mt-4 text-base">
			Order placed. We couldn't send the confirmation email.
		</p>
	{/if}
{/if}

<div class="mt-4 flex flex-wrap items-end justify-between gap-3">
	<div>
		<p class="spec">Order</p>
		<h1 class="font-mono text-3xl font-bold">#{orderNumber(order.id)}</h1>
		<p class="text-sm text-slate">Placed {formatOrderDate(order.createdAt)}</p>
	</div>
	<div class="flex flex-wrap gap-2">
		<span class={['badge', ORDER_STATUS[order.status].class]}
			>{ORDER_STATUS[order.status].label}</span
		>
		<span class={['badge', EMAIL_STATUS[order.emailStatus].class]}
			>{EMAIL_STATUS[order.emailStatus].label}</span
		>
	</div>
</div>

{#if order.emailStatus !== 'sent'}
	<form
		method="POST"
		action="?/resendEmail"
		class="mt-4"
		use:enhance={() => {
			resending = true;
			return async ({ update }) => {
				await update();
				resending = false;
			};
		}}
	>
		<button type="submit" disabled={resending} class="btn btn-secondary">
			{resending ? 'Sending…' : 'Resend confirmation email'}
		</button>
	</form>
{/if}
{#if form?.message}
	<p role="status" class={['mt-3 text-sm', form.resent ? 'text-leaf' : 'text-alert']}>
		{form.message}
	</p>
{/if}

<div class="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-8">
	<ul class="card divide-y divide-mist">
		{#each data.items as item (item.id)}
			<li class="flex gap-4 p-4 sm:p-5">
				<div class="plate w-24 shrink-0 rounded-xl p-1.5 sm:w-32">
					{#if item.previewSvg}{@html item.previewSvg}{/if}
				</div>
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
						<h2 class="text-lg leading-snug font-bold">{item.styleName}</h2>
						<p class="price font-bold">{formatNaira(item.unitPriceKobo * item.quantity)}</p>
					</div>
					<p class="spec mt-1">{item.colorName} · Size {item.size} · ×{item.quantity}</p>
					<p class="price text-sm font-normal text-slate">{formatNaira(item.unitPriceKobo)} each</p>
					<p class="mt-1 truncate text-sm text-slate">{item.summary}</p>
				</div>
			</li>
		{/each}
	</ul>

	<aside class="card h-fit space-y-5 p-5 text-sm">
		<dl class="space-y-2">
			<div class="flex justify-between">
				<dt class="text-slate">Subtotal</dt>
				<dd class="price">{formatNaira(order.subtotalKobo)}</dd>
			</div>
			<div class="flex justify-between">
				<dt class="text-slate">Delivery</dt>
				<dd>Free</dd>
			</div>
			<div class="flex justify-between border-t border-mist pt-3 text-base font-bold">
				<dt>Total</dt>
				<dd class="price">{formatNaira(order.totalKobo)}</dd>
			</div>
		</dl>
		<p class="alert alert-warning">Pay on delivery</p>
		<div>
			<h2 class="text-base font-bold">Delivering to</h2>
			<p class="mt-1 text-slate">
				{order.shippingName}<br />{order.address}<br />{order.city}, {order.state}<br
				/>{order.phone}
			</p>
		</div>
		<div>
			<h2 class="text-base font-bold">Contact</h2>
			<p class="mt-1 break-all text-slate">{order.contactEmail}</p>
		</div>
		{#if order.notes}
			<div>
				<h2 class="text-base font-bold">Notes</h2>
				<p class="mt-1 whitespace-pre-line text-slate">{order.notes}</p>
			</div>
		{/if}
	</aside>
</div>
