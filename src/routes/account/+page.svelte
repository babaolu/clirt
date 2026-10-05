<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let confirmText = $state('');
	let deleting = $state(false);
	const confirmed = $derived(confirmText.trim() === 'DELETE');
</script>

<svelte:head><title>Account · Clirt</title></svelte:head>

<div class="mx-auto max-w-2xl space-y-6">
	<h1 class="text-3xl font-extrabold">Your account</h1>

	<section class="card flex items-center gap-4 p-5" aria-label="Profile">
		{#if data.account.image}
			<img
				src={data.account.image}
				alt=""
				class="size-14 rounded-full ring-2 ring-mist"
				referrerpolicy="no-referrer"
			/>
		{/if}
		<div class="min-w-0">
			<p class="text-lg font-bold">{data.account.name}</p>
			<p class="break-all text-slate">{data.account.email}</p>
			<p class="spec mt-1">Signed in with Google</p>
		</div>
	</section>

	<section class="card space-y-4 border-alert/30 p-5" aria-labelledby="danger-heading">
		<h2 id="danger-heading" class="text-lg font-bold text-alert">Delete my account</h2>
		<p class="text-slate">
			This permanently deletes your Clirt account and everything tied to it: your cart, your orders
			and their details, and the link to your Google account. It can't be undone. If you sign in
			again later, you'll start with a brand-new account.
		</p>
		<form
			method="POST"
			action="?/deleteAccount"
			class="space-y-3"
			use:enhance={() => {
				deleting = true;
				return async ({ update }) => {
					await update();
					deleting = false;
				};
			}}
		>
			<label class="block">
				<span class="label">Type <span class="font-mono">DELETE</span> to confirm</span>
				<input
					name="confirm"
					bind:value={confirmText}
					autocomplete="off"
					autocapitalize="characters"
					spellcheck="false"
					class={['input max-w-xs', form?.error && 'input-invalid']}
				/>
				{#if form?.error}<span class="field-error">{form.error}</span>{/if}
			</label>
			<button
				type="submit"
				disabled={!confirmed || deleting}
				class="btn bg-alert text-white hover:bg-alert/90"
			>
				{deleting ? 'Deleting…' : 'Delete my account'}
			</button>
		</form>
	</section>
</div>
