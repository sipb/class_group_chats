<script lang="ts">
	import '../app.postcss';
	import { AppShell, AppBar, Modal } from '@skeletonlabs/skeleton';
	import FeedbackIcon from 'svelte-material-icons/MessageAlertOutline.svelte';
	import GitHubIcon from 'svelte-material-icons/Github.svelte';

	import { PUBLIC_MATRIX_HOMESERVER } from '$env/static/public';
	import { onMount, setContext } from 'svelte';
	import { persisted } from 'svelte-local-storage-store';
	import { derived, readonly, writable } from 'svelte/store';
	import { initializeStores } from '@skeletonlabs/skeleton';
	import { LOCAL_STORAGE_USERNAME_KEY } from '$lib/constants';

	import '@fortawesome/fontawesome-free/css/all.min.css';
	import MatrixLogo from '$lib/components/logos/MatrixLogo.svelte';

	const isMobile = writable<boolean>(true);
	setContext('isMobile', readonly(isMobile));

	onMount(() => {
		// get whether mobile (from user agent)
		const { userAgent } = navigator;
		$isMobile = userAgent.includes('Android') || userAgent.includes('iPhone') || userAgent.includes('iPod');
	});

	// TODO: use some actual authentication mechanism
	// This can be either a kerb or a full MXID
	// TODO: consider using session storage here instead -- at least I am testing with many accounts but old usernames get saved
	const username = persisted<string>(LOCAL_STORAGE_USERNAME_KEY, '');
	setContext('username', username);
	const mxid = derived(
		username,
		(username) => {
			// If already a MXID then don't do anything
			if (username.startsWith('@')) {
				return username;
			} else {
				return `@${username.trim().toLowerCase()}:${PUBLIC_MATRIX_HOMESERVER}`;
			}
		}
	);
	setContext('mxid', mxid);

	/// For Skeleton: https://www.skeleton.dev/utilities/modals
	initializeStores();
</script>

<Modal />
<!-- App Shell -->
<AppShell>
	<svelte:fragment slot="header">
		<!-- App Bar -->
		<AppBar>
			<svelte:fragment slot="lead">
				<strong class="text-xl uppercase hidden sm:block">Class group chats via <MatrixLogo/></strong>
				<strong class="text-xl uppercase sm:hidden block"><MatrixLogo/> class chats</strong>
			</svelte:fragment>
			<svelte:fragment slot="trail">
				<a
					class="btn btn-sm variant-ghost-surface"
					href="https://github.com/sipb/class_group_chats"
					target="_blank"
					rel="noreferrer"
				>
					<div style="padding-right: 4px;"><GitHubIcon /></div>
					Source code
				</a>
				<a
					id="feedback-button"
					class="btn btn-sm variant-filled-warning"
					href="https://docs.google.com/forms/d/e/1FAIpQLSfIbAmtZeqLWCRx3L8_Hj28Nwh6TtsCjxN7OZjl8UisDkHgHw/viewform"
					target="_blank"
					rel="noreferrer"
				>
					<div style="padding-right: 4px;"><FeedbackIcon /></div>
					Give us feedback!
				</a>
			</svelte:fragment>
		</AppBar>
	</svelte:fragment>
	<svelte:fragment slot="pageFooter">
		<!-- TODO(skeleton): footer styling -->
		<!-- <p>
			Brought to you by <a href="https://sipb.mit.edu" target="_blank" rel="noopener">SIPB</a>.
            The source code is available on <a href="https://github.com/gabrc52/class_group_chats/">GitHub</a>.
		</p>
		<p>
			Contact: <a href="mailto:matrix@mit.edu">matrix@mit.edu</a>
		</p> -->
	</svelte:fragment>
	<slot />
</AppShell>
