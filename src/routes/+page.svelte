<script lang="ts">
	import { goto } from '$app/navigation';
	import HydrantLogo from '$lib/components/logos/HydrantLogo.svelte';
	import KerbInput from '$lib/components/KerbInput.svelte';
	import SearchBox from '$lib/components/SearchBox.svelte';
	import SubjectDetails from '$lib/components/SubjectDetails.svelte';
	import { Stepper, Step } from '@skeletonlabs/skeleton';
	import { getClassListFromMoira } from '$lib/moira';
	import type { Subject } from '$lib/types';
	import { encodeTicket, getUsername, loginWebathena } from '$lib/webathena';
	import { getContext } from 'svelte';
	import type { Readable, Writable } from 'svelte/store';
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import { PUBLIC_HYDRANT_BASEURL, PUBLIC_MATRIX_BASEURL, PUBLIC_ELEMENT_LINK } from '$env/static/public';
	import CustomStepper from '$lib/components/CustomStepper.svelte';
	import { LOCAL_STORAGE_LOGIN_TOKEN_KEY, LOCAL_STORAGE_SUBJECT_LIST_KEY } from '$lib/constants';
	import { loginElement, USER_ID_KEY } from '$lib/element';
	import SubjectListItem from '$lib/components/SubjectListItem.svelte';
	import MatrixJoin from '$lib/components/MatrixJoin.svelte';

	let showHydrantError = false;

	let isMobile: Readable<boolean> = getContext('isMobile');

	let hydrantUrl = PUBLIC_HYDRANT_BASEURL;
	let matrixSsoUrl = '#';

	let loading = true;

	let subject: Subject | undefined;

	const username: Writable<string> = getContext('username');
	let usernameExists: Writable<boolean> = writable<boolean>(true);

	let selectedSubjects: string[] = [];

	async function importFromWebathena(): Promise<void> {
		showHydrantError = false;

		const webathena = await loginWebathena();
		const token = encodeTicket(webathena);
		const classes = await getClassListFromMoira(token);
		// Not changing the username in the new flow, since they should have already given their username
		// $username = getUsername(webathena);
		console.log(classes);
		selectedSubjects = classes;
		// TODO: don't want this anymore
		// goto(`/classes/import?via=Webathena${classes.map((cls) => `&class=${cls}`).join('')}`);
	}

	let step = writable<number>(1);
	let canGoNext = true;

	/// rules for when to allow going next
	$: if ($step === 1) {		
		canGoNext = $username !== "";
	}
	$: if ($step === 2) {
		canGoNext = selectedSubjects.length > 0;
	}

	let showClassPicker = false;
	// automatically hide the class picker when going back
	// (in case people accidentally go back and don't see the close button)
	$: if ($step !== 2) {
		showClassPicker = false;
	}

	// TODO: this attempt at a "popup" is commented out because i don't think it was very successful.
	// also people with many tabs would lose the tab even if it worked

	// This is so before step 3, a "popup" opens (by making the button an <a> element,
	// and adding target = _blank)
	let popupOnNext: string | undefined = undefined;
	// $: popupOnNext = (canGoNext && !$isMobile && $step === 2) ? PUBLIC_ELEMENT_LINK : undefined;

	let onNext: Function = () => {};
	// $: onNext = (canGoNext && $step == 2) ? async () => {
	// 	// in theory, this should change the window back, but that does not seem to work
	// 	setTimeout(() => window.focus(), 1000);
	// } : () => {};

	onMount(async () => {
		// get callback (from window.location)
		const hydrantCallback = `${window.location}hydrantCallback`;
		const touchstoneCallback = `${window.location}touchstoneCallback`;
		hydrantUrl = `${PUBLIC_HYDRANT_BASEURL}/export?callback=${encodeURIComponent(hydrantCallback)}`;
		matrixSsoUrl = `${PUBLIC_MATRIX_BASEURL}/_matrix/client/v3/login/sso/redirect/saml?redirectUrl=${encodeURIComponent(touchstoneCallback)}`;

		// determine if already logged in Element
		const existingUserId = localStorage.getItem(USER_ID_KEY);
		if (existingUserId) {
			$username = existingUserId;
		}

		// determine whether we received a matrix token
		const matrixLoginToken = localStorage.getItem(LOCAL_STORAGE_LOGIN_TOKEN_KEY);
		if (matrixLoginToken) {
			// TODO: exception handling + UI for it
			// TODO: login indicator
			const mxid = await loginElement(matrixLoginToken);
			$username = mxid;
			$step = 2;
			// The login token has been consumed now
			localStorage.removeItem(LOCAL_STORAGE_LOGIN_TOKEN_KEY);
		}

		// determine whether we received a class list from Hydrant
		const hydrantClassListJson = localStorage.getItem(LOCAL_STORAGE_SUBJECT_LIST_KEY);
		if (hydrantClassListJson) {
			const hydrantClassList: string[] = JSON.parse(hydrantClassListJson);
			if (hydrantClassList.length === 0) {
				showHydrantError = true;
			}

			// append Hydrant class list (in case someone presses the button, so it doesn't
			// wipe their class list)

			// TODO: this doesn't actually work because this isn't persisted when redirecting
			// (fix this by using local storage, if it should be done)
			selectedSubjects = [...selectedSubjects, ...hydrantClassList];
			// Don't do it indefinitely, just for the redirect
			if ($username) {
				// only if logged in, otherwise trying to log in will make it forget
				localStorage.removeItem(LOCAL_STORAGE_SUBJECT_LIST_KEY);
			}

			// If we're here, it is because the Hydrant button was clicked, but just to be
			// really sure, make sure the username is set
			if ($username) {
				$step = 2;
			}
		}

		loading = false;
	});
</script>

<svelte:head>
	<title>Class group chats</title>
</svelte:head>

<!-- TODO(skeleton): gradient bad - make it look better (simply no gradient) -->

<div class="container px-4 mx-auto max-w-screen-lg py-4 space-x-4">
	<div class="variant-glass-warning mb-4 rounded-md p-2">
		If you experience any issues, please email 
		<a href="mailto:matrix@mit.edu" class="font-bold underline text-tertiary-300">matrix@mit.edu</a> or fill out the 
		<a href="https://docs.google.com/forms/d/e/1FAIpQLSfIbAmtZeqLWCRx3L8_Hj28Nwh6TtsCjxN7OZjl8UisDkHgHw/viewform" class="font-bold underline text-tertiary-300" target="_blank">feedback form</a>.
		<br/>
		Please note that you must be a student to join the group chats from this site.
	</div>
	
	{#if !loading}
	<div class="py-4">
		<CustomStepper {step} {canGoNext} {popupOnNext} {onNext}>
			{#if $step === 1}
				{#if $isMobile === true}
					<div class="w-fit">
						<KerbInput {username} {usernameExists} />
					</div>
				{/if}
				{#if $isMobile === false}
					{#if $username}
						<p>You are already logged in as <strong>{$username}</strong>.</p>
					{:else}
						<a class="btn variant-filled-tertiary" href={matrixSsoUrl}>Login with Touchstone</a>
					{/if}
				{/if}
			{:else if $step === 2}
				{#if !showClassPicker}
					<!-- TODO: consider hiding these icons after returning from the other service -->
					<p class="pb-2">You can import your class list from another SIPB service:</p>
					<div class="grid md:grid-flow-col grid-flow-row items-center md:space-x-8 space-y-2">
						<!-- TODO: prevent middle clicks - only redirect (preventDefault + redirect / or an actual button instead)-->
						<a class="btn variant-filled" href={hydrantUrl}>
							<span>Import class list from</span>
							<span style="margin-left: 5px;"><HydrantLogo /></span>
						</a>
						<button class="btn variant-filled-secondary" on:click={importFromWebathena}
							>Import from Canvas via Webathena</button
						>
						<button
							class="btn variant-ghost-warning font-bold text-warning-400"
							on:click={() => {
								showHydrantError = false;
								showClassPicker = true;

								/// Focus the search box
								// TODO: this is hacky, figure out if there is a better way
								setTimeout(() => document.getElementById('searchbox')?.focus(), 10);
							}}>+ Add class manually</button
						>
					</div>
					
					{#if showHydrantError}
					<aside class="alert variant-filled-warning m-4">
						<i class="fa-solid fa-triangle-exclamation text-4xl"></i>
						<div class="alert-message">
							<h3 class="h3">Hydrant did not give us any classes.</h3>
							<p>
								If you wish to import from Hydrant, make sure to add your class list to
								<!-- TODO: contrast of the text looks p bad here -->
								<a href="https://hydrant.mit.edu" class="anchor" target="hydrant">https://hydrant.mit.edu</a> first.
							</p>
						</div>
						<div class="alert-actions">
							<button class="btn-icon variant-filled" on:click={() => showHydrantError = false}><i class="fa-solid fa-xmark"></i></button>
						</div>
					</aside>
					{/if}
				{/if}
				<!-- TODO: use an actual modal -->

				<!-- using conditional display style instead of if to share state / avoid mounting and unmounting -->
				<div style:display={showClassPicker ? 'block' : 'none'}>
					<SearchBox
						on:subjectSelected={(event) => {
							const number = event.detail.number;
							// avoid adding duplicate subjects
							if (!selectedSubjects.includes(number)) {
								selectedSubjects = [...selectedSubjects, event.detail.number];
							}
							showClassPicker = false;
						}}
						onClose={() => (showClassPicker = false)}
					/>
				</div>

				{#if !showClassPicker}
					<ul class="list-dl mt-2">
						{#each selectedSubjects as subject (subject)}
							<SubjectListItem {subject} onDelete={() => {
								// -- yes O(N) idgaf, it also removes the exact reference
								// -- bruh what reference, it is a string
								selectedSubjects = selectedSubjects.filter((s) => s != subject);
							}}/>
						{/each}
					</ul>
				{/if}
			{:else}
				<MatrixJoin subjects={selectedSubjects}/>
			{/if}
		</CustomStepper>
	</div>
	{/if}

	<!-- TODO(skeleton): I don't like this stepper since it doesn't preview future steps,
		 but this is what skeleton provides and no time to write a new one or figure out how to import the
		React one. See https://bfanger.medium.com/combining-react-and-svelte-in-a-single-app-interop-6f78aed96ce2
		and https://mui.com/material-ui/react-stepper/
	-->
	<!-- TODO: how to programatically set to a part of the stepper? -->
	<!-- <Stepper> -->
	<!-- TODO: bug - upon refresh it doesn't check existence -->
	<!-- <Step locked={!$username || !$usernameExists}> -->
	<!-- <svelte:fragment slot="header">Identify yourself</svelte:fragment> -->
	<!-- This would be login, but on mobile it's enter your kerb -->
	<!-- <div class="w-full md:w-1/2"> -->
	<!--  -->
	<!-- </div> -->
	<!-- </Step> -->
	<!-- <Step> -->
	<!-- <svelte:fragment slot="header">(header)</svelte:fragment> -->
	<!-- (content) -->
	<!-- </Step> -->
	<!-- ... -->
	<!-- </Stepper> -->

	<!-- <div class="grid md:grid-flow-col grid-flow-row items-center space-x-8 space-y-2 pb-4">
		<div>
			<KerbInput {username} />
		</div>
		<div>
			<a class="btn variant-filled" href={hydrantUrl}>
				<span>Import class list from</span>
				<span style="margin-left: 5px;"><HydrantLogo /></span>
			</a>
		</div>
		<div>
			<button class="btn variant-filled" on:click={importFromWebathena}>Import from Canvas via Webathena</button>
		</div>
	</div>

	{#if $username}
		<SearchBox on:subjectSelected={(event) => (subject = event.detail)} />

		{#if subject}
			<SubjectDetails {subject} />
		{/if}
	{/if} -->
</div>
