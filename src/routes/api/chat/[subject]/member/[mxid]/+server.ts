import { authenticated } from '$lib/auth';
import { ClassGroupChatMembership, SubjectNotFoundError } from '$lib/types';
import { createChat, getRoomAlias } from '$lib/chats';
import { getRoomId, matrixClient } from '$lib/matrix';
import { getSubjectDetailsMulesoft, getSubjectDetailsOracle } from '$lib/subject';
import { getCurrentTerm } from '$lib/terms';
import { error, json, type NumericRange } from '@sveltejs/kit';
import { MatrixError } from 'matrix-js-sdk';
import { PUBLIC_MATRIX_HOMESERVER } from '$env/static/public';
import httpStatus from 'http-status';

function isMatrixUserOurs(mxid: string): boolean {
	const homeserver = mxid.split(':')[1];
	return homeserver === PUBLIC_MATRIX_HOMESERVER;
}

/**
 * Wrap error to make Typescript happy. Return 500 if null
 */
function wrapError(statusCode: number | undefined): NumericRange<400, 599> {
	if (statusCode === undefined || statusCode < 400 || statusCode > 599) {
		return 500;
	}
	// huh even with this it doesn't work?
	return statusCode as NumericRange<400, 599>;
}

export const PUT = authenticated(async function ({ params }) {
	// TODO: check if student and not staff (ideally)
	try {
		const { subject, mxid } = params;
		if (!isMatrixUserOurs(mxid!)) {
			error(
				httpStatus.NOT_IMPLEMENTED,
				'adding external users is not supported yet. please ask matrix@mit.edu to add you manually'
			);
		}
		const term = await getCurrentTerm();
		const details = await getSubjectDetailsMulesoft(subject!);
		const { masterNumber, otherNumbers } = await getSubjectDetailsOracle(subject!);
		const alias = getRoomAlias(masterNumber, term);
		let roomId = await getRoomId(alias);
		if (roomId === undefined) {
			roomId = await createChat(masterNumber, details, term);
			// TODO: it would be nice but not necessary to add other Matrix
			// aliases for each other non-canonical number
		}
		await matrixClient.invite(roomId as string, mxid!);
		return json({});
	} catch (e) {
		if (e instanceof SubjectNotFoundError) {
			error(404, 'subject does not exist');
		} else if (e instanceof MatrixError) {
			error(wrapError(e.httpStatus), e.data.error ?? 'a matrix error occurred');
		} else {
			throw e;
		}
	}
});

export const GET = authenticated(async function ({ params }) {
	try {
		const { subject, mxid } = params;
		const term = await getCurrentTerm();
		const alias = getRoomAlias(subject!, term);
		let roomId = await getRoomId(alias);
		if (roomId === undefined) {
			// room doesn't exist, we count is as you are not in the chat yet
			// (and it hasn't been created because no one has tried to join)
			return json({ membership: ClassGroupChatMembership.not_joined });
		}
		let response: Record<string, any>;
		try {
			// getJoinedRoomMembers would have worked but would be O(N) instead of O(1)
			response = await matrixClient.getStateEvent(roomId, 'm.room.member', mxid!);
		} catch (e) {
			// user has never been invited to the room
			return json({ membership: ClassGroupChatMembership.not_joined });
		}
		const membership_conversion = new Map([
			['ban', ClassGroupChatMembership.banned],
			['invite', ClassGroupChatMembership.invited],
			['join', ClassGroupChatMembership.joined]
		]);
		// We treat anything else ('leave' and 'kick', or any unexpected values)
		// as not joined
		const membership =
			membership_conversion.get(response.membership) ?? ClassGroupChatMembership.not_joined;
		return json({ membership });
	} catch (e) {
		if (e instanceof SubjectNotFoundError) {
			// This is never thrown because we never look up the subject.
			// it is probably fine, since we avoid the unnecessary API call
			// but mistakenly assume every class exists.
			// (This doesn't matter since PUT does validate that it exists)
			error(404, 'subject does not exist');
		} else if (e instanceof MatrixError) {
			console.log(e);
			error(wrapError(e.httpStatus), e.data.error ?? 'a matrix error occurred');
		} else {
			throw e;
		}
	}
});
