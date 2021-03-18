import jwt from 'jsonwebtoken';
// import { v4 as uuidv4 } from 'uuid';
import * as jwtInterface from '../interface/jwt';
import * as redis from '../redis';
import { throwErr } from './decorator';

// Get jwt Token
export const getJwtToken = (req) => req.headers['x-access-token'] || req.query.token;

export const getRefreshToken = (req) => req.headers['x-refresh-token'] || req.query.refresh_token;

/** @todo 토큰 검증 과정 필요 */
// decode, verify Access Token
export const decodeAccessToken = (token: string, refresh: boolean) => {
	return new Promise((resolve, reject) => {
		let decodedToken = null;
		if (!refresh) {
			jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, tokenValue) => {
				if (err) return throwErr('Invalid Access Token', 400);

				return resolve(tokenValue);
			});
		} else {
			decodedToken = jwt.decode(token);
		}

		return resolve(decodedToken);
	});
};

/** @todo 토큰 검증 과정 필요 */
// decode, verify Refresh Token
export const decodeRefreshToken = (token: string) => {
	return new Promise((resolve, reject) => {
		jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, tokenValue) => {
			if (err) return throwErr('Invalid Refresh Token', 400);

			return resolve(tokenValue);
		});
	});
};

// encode Token
export const encodeAccessToken = (payLoad) => {
	return new Promise((resolve, reject) => {
		jwt.sign(
			payLoad,
			process.env.JWT_ACCESS_SECRET,
			{
				expiresIn: process.env.JWT_ACCESS_EXP_TIME,
				issuer: process.env.JWT_ISSUER,
			},
			(err, token) => {
				if (err) return reject(err);
				return resolve(token);
			},
		);
	});
};

// encode Refresh Token
export const encodeRefreshToken = (payLoad) => {
	return new Promise((resolve, reject) => {
		jwt.sign(
			payLoad,
			process.env.JWT_REFRESH_SECRET,
			{
				expiresIn: process.env.JWT_REFRESH_EXP_TIME,
				issuer: process.env.JWT_ISSUER,
			},
			(err, token) => {
				if (err) return reject(err);
				return resolve(token);
			},
		);
	});
};

// generate Payload
export const generatePayload = async (data: object, csrf: string) => {
	const payload = { csrf, data };
	return payload;
};

// generate Token
export const generateToken = async (data: jwtInterface.Data, csrf: string, isLogin: boolean) => {
	const payLoad = <object>await generatePayload(data, csrf);

	const accessToken = <string>await encodeAccessToken(payLoad);

	const refreshToken = <string>await encodeRefreshToken(payLoad);

	if (isLogin) await redis.redisSetKeyValue(String(data.member_id), { ac_token: accessToken, re_token: refreshToken });

	return { token: { access_token: accessToken, refresh_token: refreshToken }, decoded_token: await decodeAccessToken(accessToken, false) };
};

// refresh Token
export const refreshToken = async (accessTokenParam: string, refreshTokenParam: string, csrf: string) => {
	const decodedAccessToken = <jwtInterface.DecodeToken>await decodeAccessToken(accessTokenParam, true);
	const { data } = decodedAccessToken;
	let redisToken = null;
	let decodedRefreshToken = null;
	let newAccessToken = null;

	if (data.member_id) {
		redisToken = <jwtInterface.RedisToken>await redis.redisGetValue(String(data.member_id));
		if (redisToken.ac_token === accessTokenParam && redisToken.re_token === refreshTokenParam) {
			decodedRefreshToken = <jwtInterface.DecodeToken>await decodeRefreshToken(redisToken.re_token);
		} else {
			return throwErr('Not Match Token', 400);
		}
	} else {
		decodedRefreshToken = <jwtInterface.DecodeToken>await decodeRefreshToken(refreshTokenParam);
	}

	// generate new access token
	const payLoad = <object>await generatePayload(decodedRefreshToken.data, csrf);
	const accessToken = <string>await encodeAccessToken(payLoad);

	if (data.member_id) await redis.redisSetKeyValue(String(data.member_id), { ac_token: accessToken, re_token: redisToken.re_token });

	newAccessToken = { token: { access_token: accessToken }, decoded_token: await decodeAccessToken(accessToken, false) };

	return newAccessToken;
};
