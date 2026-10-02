<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatNaira } from '#lib/money.ts';
	import { googleFontsUrl } from '#lib/render/shirt.ts';

	let { data, form } = $props();

	const hasProblems = $derived(data.lines.some((line) => line.problem));
</script>

<svelte:head>
	<title>Cart · Clirt</title>
	<link rel="stylesheet" href={googleFontsUrl()} />
</svelte:head>

<h1 class="text-2xl font-bold">Your cart</h1>

{#if data.lines.length === 0}
	<p class="mt-6 rounded-lg border border-dashed border-stone-300 p-6 text-stone-500">
		Your cart is empty. <a href="/" class="font-medium text-stone-900 underline">Browse styles</a>
	</p>
{:else}
	{#if form?.message}
		<p role="alert" class="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{form.message}</p>
	{/if}

	<div class="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
		<ul class="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
			{#each data.lines as line (line.id)}
				<li class="flex gap-4 p-4">
					<div class="w-24 shrink-0 rounded-lg bg-stone-100 p-1 sm:w-28">
						{@html line.previewSvg}
					</div>
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
							<h2 class="font-semibold">{line.style.name}</h2>
							<p class="font-semibold">{formatNaira(line.lineTotalKobo)}</p>
						</div>
						<p class="text-sm text-stone-600">{line.colorName} · Size {line.size}</p>
						<p class="truncate text-sm text-stone-600">{line.summary}</p>
						<p class="text-sm text-stone-500">{formatNaira(line.unitPriceKobo)} each</p>
						{#if line.problem}
							<p class="mt-1 text-sm text-red-700">{line.problem} Please remove it.</p>
						{/if}

						<div class="mt-3 flex flex-wrap items-center gap-3">
							<form
								method="POST"
								action="?/updateQuantity"
								use:enhance
								class="flex items-center gap-2"
							>
								<input type="hidden" name="id" value={line.id} />
								<label class="sr-only" for={`qty-${line.id}`}>Quantity</label>
								<input
									id={`qty-${line.id}`}
									type="number"
									name="quantity"
									min="1"
									max="20"
									value={line.quantity}
									class="w-20 rounded-md border border-stone-300 px-2 py-1"
								/>
								<button
									type="submit"
									class="rounded-md border border-stone-300 px-3 py-1 text-sm hover:bg-stone-50"
								>
									Update
								</button>
							</form>
							<form method="POST" action="?/remove" use:enhance>
								<input type="hidden" name="id" value={line.id} />
								<button type="submit" class="text-sm text-red-700 hover:underline">Remove</button>
							</form>
						</div>
					</div>
				</li>
			{/each}
		</ul>

		<aside class="h-fit rounded-xl border border-stone-200 bg-white p-5">
			<div class="flex justify-between">
				<span class="text-stone-600">Subtotal</span>
				<span class="font-semibold">{formatNaira(data.subtotalKobo)}</span>
			</div>
			<p class="mt-1 text-xs text-stone-500">Delivery is free. You pay on delivery.</p>
			{#if hasProblems}
				<p class="mt-4 text-sm text-red-700">Remove unavailable items to continue.</p>
			{:else}
				<a
					href="/checkout"
					class="mt-4 block rounded-md bg-stone-900 px-4 py-3 text-center font-semibold text-white hover:bg-stone-700"
				>
					Proceed to checkout
				</a>
			{/if}
			<a href="/" class="mt-3 block text-center text-sm text-stone-600 hover:underline"
				>Keep shopping</a
			>
		</aside>
	</div>
{/if}
