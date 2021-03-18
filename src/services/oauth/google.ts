import axios from 'axios';
import qs from 'qs';

import * as oauthInterface from '../../interface/oauth';

// get Curl
export const getCurl = async (apiUrl: string) => {
	return axios.get(apiUrl);
};

// post Curl
export const postCurl = async (apiUrl: string, params?: oauthInterface.PostCurlParams, accessToken?: string) => {
	try {
		const headers = <oauthInterface.AxiosHeaders>{};
		headers['Content-Type'] = 'application/x-www-form-urlencoded';
		if (accessToken) headers.Authorization = `Bearer ${String(accessToken)}`;
		const response = await axios.post(apiUrl, qs.stringify(params), { headers });
		return response;
	} catch (err) {
		return err;
	}
};

export const getAccessTokenByCode = async (code: string, redirectUrl: string) => {
	const apiUrl = 'https://oauth2.googleapis.com/token';
	const params = { grant_type: 'authorization_code', client_id: process.env.GOOGLE_API_KEY, client_secret: process.env.GOOGLE_SECRET, redirect_uri: redirectUrl, code: decodeURIComponent(code) };
	try {
		const response = await postCurl(apiUrl, params, null);
		// Return
		return response.data.access_token;
	} catch (err) {
		// Return
		return null;
	}
};

// accessToken 을 사용해 SNS 에서 제공하는 사용자 정보 획득
export const getMemberByAccessToken = async (accessToken: string) => {
	const apiUrl = 'https://www.googleapis.com/oauth2/v1/userinfo';
	const params = qs.stringify({ access_token: accessToken });

	try {
		const result = <oauthInterface.SnsMember>{};
		const response = await getCurl(`${apiUrl}?${params}`);
		if (response.data.id) {
			result.external_id = parseInt(response.data.id, 10);
			result.email = response.data.email ? response.data.email : null;
			result.thumbnail = response.data.picture ? response.data.picture : null;
		}
		// Return
		return result;
	} catch (err) {
		// Return
		return null;
	}
};
