<script lang="ts">
	import { formatNaira } from '#lib/money.ts';
	import { EMAIL_STATUS, ORDER_STATUS, formatOrderDate, orderNumber } from '#lib/order-status.ts';

	let { data } = $props();
</script>

<svelte:head><title>My orders · Clirt</title></svelte:head>

<h1 class="text-3xl font-extrabold">My orders</h1>

{#if data.orders.length === 0}
	<div class="card mt-6 flex flex-col items-start gap-4 p-8">
		<p class="text-lg text-slate">You haven't placed any orders yet.</p>
		<a href="/" class="btn btn-primary">Start designing</a>
	</div>
{:else}
	<ul class="card mt-6 divide-y divide-mist">
		{#each data.orders as order (order.id)}
			<li>
				<a
					href={`/orders/${order.id}`}
					class="grid gap-3 p-4 hover:bg-fog sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6 sm:p-5"
				>
					<div>
						<p class="font-mono text-base font-bold text-indigo">#{orderNumber(order.id)}</p>
						<p class="text-sm text-slate">
							{formatOrderDate(order.createdAt)} · {order.itemCount}
							{order.itemCount === 1 ? 'item' : 'items'}
						</p>
					</div>
					<div class="flex flex-wrap gap-2">
						<span class={['badge', ORDER_STATUS[order.status].class]}
							>{ORDER_STATUS[order.status].label}</span
						>
						<span class={['badge', EMAIL_STATUS[order.emailStatus].class]}
							>{EMAIL_STATUS[order.emailStatus].label}</span
						>
					</div>
					<p class="price font-bold sm:text-right">{formatNaira(order.totalKobo)}</p>
				</a>
			</li>
		{/each}
	</ul>
{/if}
