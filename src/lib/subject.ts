import {
	MULESOFT_SUBJECT_API,
	MULESOFT_CLIENT_ID,
	MULESOFT_CLIENT_SECRET
} from '$env/static/private';
import he from 'he';
import { SubjectNotFoundError, type SubjectDetailsMulesoft, type SubjectDetailsOracle } from '$lib/types';
import { getCurrentTerm } from '$lib/terms';
import { oracleQuery } from './warehouse';

/**
 * Extract the canonical number from a subjetcs API response.
 * 
 * This does work for classes with multiple undergrad numbers, but does
 * not link together the undergrad and grad numbers.
 * 
 * @param subjectItem result from the subjects API
 * @returns the canonical subject number
 */
function extractCanonicalNumber(subjectItem: any): string {
	if (!subjectItem.cluster) {
		return subjectItem.subjectId;
	}
	const description: string = subjectItem.description;
	// TODO: the only way I could think of getting the canonical subject,
	// but it could break at any time
	const notCanonicalRegex = /See description under subject (.+)J\./;
	const match = notCanonicalRegex.exec(description);
	if (!match) {
		return subjectItem.subjectId;
	}
	return match[1];
}

/**
 * Get the details about a subject, using the Subjects API.
 *
 * @param subject the canonical subject number (i.e. 6.1010)
 * @returns the details about said subject
 * @throws SubjectNotFoundError if the subject does not exist
 *  or is not offered this term
 */
export async function getSubjectDetailsMulesoft(subject: string): Promise<SubjectDetailsMulesoft> {
	const term = await getCurrentTerm();
	const url = `${MULESOFT_SUBJECT_API}/terms/${term}/subjects/${subject}`;
	const response = await fetch(url, {
		headers: {
			'Authorization': `Basic ${btoa(`${MULESOFT_CLIENT_ID}:${MULESOFT_CLIENT_SECRET}`)}`,
		},
	});
	if (!response.ok) {
		// Inexisting subjects return a 400 bad request ._.
		// Logging it in case it's actually something else, for debugging
		console.log(response);
		throw new SubjectNotFoundError();
	}
	const json = await response.json();
	if (json.item.offered !== true) throw new SubjectNotFoundError();
	const canonicalNumber = extractCanonicalNumber(json.item);
	if (canonicalNumber !== subject) {
		return getSubjectDetailsMulesoft(canonicalNumber);
	}
	const instructorKerbs = json.item.instructorDetails
		? json.item.instructorDetails.map((i: { kerbId: string }) => i.kerbId.toLowerCase())
		: [];
	// Some fields may contain HTML entities, so we unescape them
	return {
		canonicalNumber: canonicalNumber,
		title: he.decode(json.item.title),
		cluster: he.decode(json.item.cluster),
		prerequisites: he.decode(json.item.prerequisites),
		units: json.item.units,
		optional: he.decode(json.item.optional),
		description: he.decode(json.item.description),
		instructorKerbs: instructorKerbs
	};
}


/**
 * Get the master number for a class
 * 
 * @param subject the class
 * @returns the master number, or undefined if there were no results
 * @throws SubjectNotFoundError if the subject does not exist
 */
export async function getMasterNumber(subject: string): Promise<string> {
	const term = await getCurrentTerm();
	const results = await oracleQuery<any>(
		`
		select MASTER_SUBJECT_ID
		from SUBJECT_OFFERED
		where TERM_CODE = :term
			and SUBJECT_ID = :subject
			and IS_MASTER_SECTION = 'Y'
		`,
		{ term, subject }
	);
	if (results === undefined) {
		throw new Error("oracle returned undefined!");
	}
	const result = results[0];
	if (result === undefined) {
		throw new SubjectNotFoundError();
	}
	return result.MASTER_SUBJECT_ID;
}


/**
 * Get the details about a subject, using the Oracle Data Warehouse.
 *
 * @param subject the subject subject number (i.e. 6.1010)
 * @returns the details about said subject
 * @throws SubjectNotFoundError if the subject does not exist
 *  or is not offered this term
 */
export async function getSubjectDetailsOracle(subject: string): Promise<SubjectDetailsOracle> {
	const term = await getCurrentTerm();
	// TODO: there is more in oracle of course, but we don't need more rn
	// see docs http://web.mit.edu/warehouse/metadata/fields/subject_offered.html
	//      and http://web.mit.edu/warehouse/metadata/fields/cis_course_catalog.html
	const results = await oracleQuery<any>(
		`
		select
			MASTER_SUBJECT_ID,
			CLUSTER_ENROLLMENT_NUMBER,
			SUBJECT_ENROLLMENT_NUMBER,
			CLUSTER_LIST,
			SUBJECT_TITLE
		from SUBJECT_OFFERED
		where TERM_CODE = :term
			and SUBJECT_ID = :subject
			and IS_MASTER_SECTION = 'Y'
		`,
		{ term, subject }
	);
	if (results === undefined) {
		throw new Error("oracle returned undefined!");
	}
	const result = results[0];
	if (result === undefined) {
		throw new SubjectNotFoundError();
	}
	return {
		masterNumber: result.MASTER_SUBJECT_ID,
		title: result.SUBJECT_TITLE,
		otherNumbers: result.CLUSTER_LIST?.split(', ') ?? [],
		numStudents: result.CLUSTER_ENROLLMENT_NUMBER || result.SUBJECT_ENROLLMENT_NUMBER,
	};
}
