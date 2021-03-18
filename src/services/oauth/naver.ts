import axios from 'axios';
import qs from 'qs';

import * as oauthInterface from '../../interface/oauth';

// get Curl
export const getCurl = async (apiUrl: string, accessToken: string) => {
	const headers = <oauthInterface.AxiosHeaders>{};
	if (accessToken) headers.Authorization = `Bearer ${String(accessToken)}`;
	return axios.get(apiUrl, { headers });
};

// post Curl
export const postCurl = async (apiUrl: string, params?: oauthInterface.PostCurlParams, accessToken?: string) => {
	const headers = <oauthInterface.AxiosHeaders>{};
	headers['Content-Type'] = 'application/x-www-form-urlencoded';
	if (accessToken) headers.Authorization = `Bearer ${String(accessToken)}`;
	const response = await axios.post(apiUrl, qs.stringify(params), { headers });
	return response;
};

export const getAccessTokenByCode = async (code: string, redirectUrl: string) => {
	const apiUrl = 'https://nid.naver.com/oauth2.0/token';
	const params = { grant_type: 'authorization_code', client_id: process.env.NAVER_API_KEY, client_secret: process.env.NAVER_SECRET, redirect_uri: redirectUrl, code };

	try {
		const response = await postCurl(apiUrl, params);
		// Return
		return response.data.access_token;
	} catch (err) {
		// Return
		return null;
	}
};

// accessToken 을 사용해 SNS 에서 제공하는 사용자 정보 획득
export const getMemberByAccessToken = async (accessToken: string) => {
	const apiUrl = 'https://openapi.naver.com/v1/nid/me';

	try {
		const result = <oauthInterface.SnsMember>{};
		const response = await getCurl(apiUrl, accessToken);
		if (response.data.response.id) {
			result.external_id = response.data.response.id;
			result.nickname = response.data.response.nickname ? response.data.response.nickname : null;
			result.email = response.data.response.email ? response.data.response.email : null;
			result.thumbnail = response.data.response.profile_image ? response.data.response.profile_image : null;
		}

		// Return
		return result;
	} catch (err) {
		// Return
		return null;
	}
};
