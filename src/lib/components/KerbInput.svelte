<script lang="ts">
	import { PUBLIC_MATRIX_HOMESERVER } from '$env/static/public';
	import type { UsernameExistsResult } from '$lib/types';
	import { getContext } from 'svelte';
	import type { Readable, Writable } from 'svelte/store';
	import { writable } from 'svelte/store';

	export let username: Writable<string>;
	const mxid: Readable<string> = getContext('mxid');

	export let usernameExists = writable<boolean>(true);
	let lookedUpUsername: string;

	async function exists(username: string): Promise<boolean> {
		username = username.trim().toLowerCase();
		const kerb = username.trim().toLowerCase();
		const response = await fetch(`/classes/api/kerb/${kerb}`);
		const result: UsernameExistsResult = await response.json();
		return result.exists;
	}
</script>

<label for="kerb">Enter your kerb</label>
<div class="input-group input-group-divider grid-cols-[auto_1fr_auto]">
	<div class="input-group-shim">@</div>
	<input
		class:input-error={!usernameExists}
		type="text"
		id="kerb"
		name="kerb"
		placeholder="jflorey"
		on:change={async (e) => {
			const kerb = e.currentTarget.value;
			const result = await exists(kerb);
			lookedUpUsername = kerb;
			$usernameExists = result;
		}}
		bind:value={$username}
	/>
	<div class="input-group-shim">
		:{PUBLIC_MATRIX_HOMESERVER}
	</div>
</div>
{#if $username}
	{#if $usernameExists}
		<p class="text-xs">The full thing ({$mxid}) is your global Matrix username.</p>
	{:else}
		<p class="text-sm text-error-300">Kerb {lookedUpUsername} does not exist</p>
	{/if}
{/if}
