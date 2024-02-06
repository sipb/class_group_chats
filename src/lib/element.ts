import { createClient } from 'matrix-js-sdk';
import { PUBLIC_MATRIX_BASEURL } from '$env/static/public';

const HOMESERVER_URL_KEY = 'mx_hs_url';
const ID_SERVER_URL_KEY = 'mx_is_url';
const ACCESS_TOKEN_STORAGE_KEY = 'mx_access_token';
const HAS_ACCESS_TOKEN_STORAGE_KEY = 'mx_has_access_token';
const USER_ID_KEY = 'mx_user_id';
const DEVICE_ID_KEY = 'mx_device_id';


/**
 * Log into Element with the given login token (if Element is not logged into),
 * and get the mxid
 */
export async function loginElement(loginToken: string) {
    const existingUserId = localStorage.getItem(USER_ID_KEY);
    if (existingUserId) {
        return existingUserId;
    }

    if (localStorage.getItem(HAS_ACCESS_TOKEN_STORAGE_KEY)) {
        throw Error("not expected to be logged in! inconsistent state?");
    }

    // TODO: this throws an error - should just do a HTTP request by hand???
	const client = createClient({ baseUrl: PUBLIC_MATRIX_BASEURL });
	const loginResponse = await client.login('m.login.token', {
		token: loginToken,
		initial_device_display_name: 'SIPB Matrix Web'
	});
    localStorage.setItem(HOMESERVER_URL_KEY, PUBLIC_MATRIX_BASEURL);
    localStorage.setItem(ID_SERVER_URL_KEY, "https://matrix.org");
	localStorage.setItem(USER_ID_KEY, loginResponse.user_id);
    // localStorage.setItem("mx_is_guest", "false");
    localStorage.setItem(DEVICE_ID_KEY, loginResponse.device_id);
    localStorage.setItem(HAS_ACCESS_TOKEN_STORAGE_KEY, "true");
    // TODO: ideally this should be in IndexedDB (matrix-react-sdk -> account -> mx_access_token)
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, loginResponse.access_token);
    // we assume the homeserver isn't configured to work with refresh tokens
	
    // TODO: figure out what happens if element is never opened after a fresh login. might be bad.
	sessionStorage.setItem('mx_fresh_login', String(true));
}