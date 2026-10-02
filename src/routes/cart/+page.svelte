<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatNaira } from '#lib/money.ts';

	let { data, form } = $props();

	const hasProblems = $derived(data.lines.some((line) => line.problem));
	const itemCount = $derived(data.lines.reduce((sum, l) => sum + l.quantity, 0));
	let pending = $state<string | null>(null);

	const track = (key: string) => () => {
		pending = key;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			pending = null;
		};
	};
</script>

<svelte:head><title>Cart · Clirt</title></svelte:head>

<h1 class="text-3xl font-extrabold">Your cart</h1>

{#if data.lines.length === 0}
	<div class="card mt-6 flex flex-col items-start gap-4 p-8">
		<p class="text-lg text-slate">Your cart is empty.</p>
		<a href="/" class="btn btn-primary">Start designing</a>
	</div>
{:else}
	{#if form?.message}
		<p role="alert" class="alert alert-error mt-4">{form.message}</p>
	{/if}

	<div
		class="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-8"
	>
		<ul class="card divide-y divide-mist">
			{#each data.lines as line (line.id)}
				<li class="flex gap-4 p-4 sm:p-5">
					<div class="plate w-24 shrink-0 rounded-xl p-1.5 sm:w-32">{@html line.previewSvg}</div>
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
							<h2 class="text-lg leading-snug font-bold">{line.style.name}</h2>
							<p class="price font-bold">{formatNaira(line.lineTotalKobo)}</p>
						</div>
						<p class="spec mt-1">{line.colorName} · Size {line.size}</p>
						<p class="price text-sm font-normal text-slate">
							{formatNaira(line.unitPriceKobo)} each
						</p>
						<p class="mt-1 truncate text-sm text-slate">{line.summary}</p>
						{#if line.problem}
							<p class="mt-2 text-sm text-alert">{line.problem} Remove it to check out.</p>
						{/if}

						<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
							<form
								method="POST"
								action="?/updateQuantity"
								use:enhance={track(`qty-${line.id}`)}
								class="flex items-center gap-2"
							>
								<input type="hidden" name="id" value={line.id} />
								<label class="sr-only" for={`qty-${line.id}`}>Quantity for {line.style.name}</label>
								<input
									id={`qty-${line.id}`}
									type="number"
									name="quantity"
									min="1"
									max="20"
									value={line.quantity}
									class="input w-20 py-1.5"
								/>
								<button type="submit" disabled={pending !== null} class="btn btn-secondary py-1.5">
									{pending === `qty-${line.id}` ? 'Updating…' : 'Update'}
								</button>
							</form>
							<form method="POST" action="?/remove" use:enhance={track(`rm-${line.id}`)}>
								<input type="hidden" name="id" value={line.id} />
								<button
									type="submit"
									disabled={pending !== null}
									class="btn-danger-link disabled:opacity-50"
								>
									{pending === `rm-${line.id}` ? 'Removing…' : 'Remove'}
								</button>
							</form>
						</div>
					</div>
				</li>
			{/each}
		</ul>

		<aside class="card h-fit space-y-4 p-5 lg:sticky lg:top-24">
			<h2 class="text-lg font-bold">Summary</h2>
			<dl class="space-y-2 text-sm">
				<div class="flex justify-between">
					<dt class="text-slate">Items</dt>
					<dd class="price">{itemCount}</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-slate">Delivery</dt>
					<dd>Free</dd>
				</div>
				<div class="flex justify-between border-t border-mist pt-3 text-base font-bold">
					<dt>Subtotal</dt>
					<dd class="price">{formatNaira(data.subtotalKobo)}</dd>
				</div>
			</dl>
			<p class="text-xs text-slate">You pay on delivery. Nothing is charged online.</p>
			{#if hasProblems}
				<p class="text-sm text-alert">Remove unavailable items to continue.</p>
			{:else}
				<a href="/checkout" class="btn btn-primary w-full py-3 text-base">Proceed to checkout</a>
			{/if}
			<a href="/" class="btn btn-ghost w-full">Keep shopping</a>
		</aside>
	</div>
{/if}
