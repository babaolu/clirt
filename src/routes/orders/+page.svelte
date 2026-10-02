<script lang="ts">
	import { formatNaira } from '#lib/money.ts';
	import { EMAIL_STATUS, ORDER_STATUS, formatOrderDate, orderNumber } from '#lib/order-status.ts';

	let { data } = $props();
</script>

<svelte:head><title>My orders · Clirt</title></svelte:head>

<h1 class="text-2xl font-bold">My orders</h1>

{#if data.orders.length === 0}
	<p class="mt-6 rounded-lg border border-dashed border-stone-300 p-6 text-stone-500">
		You haven't placed any orders yet. <a href="/" class="font-medium text-stone-900 underline"
			>Start designing</a
		>
	</p>
{:else}
	<ul class="mt-6 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
		{#each data.orders as order (order.id)}
			<li>
				<a
					href={`/orders/${order.id}`}
					class="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-stone-50"
				>
					<div>
						<p class="font-semibold">#{orderNumber(order.id)}</p>
						<p class="text-sm text-stone-500">
							{formatOrderDate(order.createdAt)} · {order.itemCount}
							{order.itemCount === 1 ? 'item' : 'items'}
						</p>
					</div>
					<div class="flex flex-wrap items-center gap-2">
						<span
							class={[
								'rounded-full px-2 py-0.5 text-xs font-medium',
								ORDER_STATUS[order.status].class
							]}
						>
							{ORDER_STATUS[order.status].label}
						</span>
						<span
							class={[
								'rounded-full px-2 py-0.5 text-xs font-medium',
								EMAIL_STATUS[order.emailStatus].class
							]}
						>
							{EMAIL_STATUS[order.emailStatus].label}
						</span>
						<span class="ml-2 font-semibold">{formatNaira(order.totalKobo)}</span>
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}
