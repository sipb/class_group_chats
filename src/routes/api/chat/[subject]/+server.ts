import { authenticated } from '$lib/auth';
import { getRoomAlias } from '$lib/chats';
import { getRoomId, countMembers } from '$lib/matrix';
import { getLatestTermHydrant, getCurrentTerm } from '$lib/terms';
import { json } from '@sveltejs/kit';

/**
 * Get details about the given class group chat
 * (for now just the member count)
 */
export const GET = async function ({ params }) {
	const { subject } = params;
	const term = await getCurrentTerm();
	const alias = getRoomAlias(subject!, term);
	const id = await getRoomId(alias);
	return json({
		exists: id !== undefined,
		alias: alias,
		roomId: id,
		numMembers: await countMembers(id)
	});
};
