import axios from 'axios';
import qs from 'qs';
import { sequelize } from '../database';
import * as firebaseComponent from '../component/firebase';
import * as memberComponent from '../component/member';
import * as firebaseInterface from '../interface/firebase';
import * as scheduleInterface from '../interface/schedule';

// post Curl
const postCurl = async (apiUrl: string, params?: firebaseInterface.FirebaseBody) => {
	try {
		const headers = <firebaseInterface.FirebaseHeader>{};
		headers['Content-Type'] = 'application/json';
		headers.Authorization = `key=${process.env.FIREBASE_SERVER_KEY}`;
		const response = await axios.post(apiUrl, JSON.stringify(params), { headers });
		return response;
	} catch (err) {
		return err;
	}
};

/** @description 회원 파이어베이스 토큰 등록 */
export const postMemberFirebaseToken = async (firebaseParam) => {
	const isExistToken = await firebaseComponent.isExistFirebaseToken(firebaseParam);
	let response = null;
	if (isExistToken) {
		await sequelize.transaction(async (t) => {
			response = await firebaseComponent.postMemberFirebaseToken(firebaseParam, t);
		});
	}
	return response;
};

/** @description 푸시 알림 보내기 */
export const sendNotification = async (title: string, body: string, token: string[]) => {
	const params = { notification: { title, body, click_action: '', icon: '' }, data: { test: 'test' }, registration_ids: token };

	const result = await postCurl('https://fcm.googleapis.com/fcm/send', params);
	console.log(result.response);
	return null;
};

/** @description 일정 알림 보내기 */
export const firebaseAlarm = async (alarm: string, title: string, calendarId: number) => {
	const firebaseTokens = await firebaseComponent.getFirebaseTokenByCalendarId(calendarId);

	const firebaseData = <scheduleInterface.postScheduleFirebaseData>{};
	if (firebaseTokens && firebaseTokens.length > 0) {
		const timer = alarm === '24' ? '하루 전' : `${alarm}분 전`;
		const tokens = [];
		const tokenids = [];
		for (let i = 0; i < firebaseTokens.length; i += 1) {
			// eslint-disable-next-line no-await-in-loop
			const pushOnOff = await memberComponent.pushOnOff(firebaseTokens[i].member_id);
			if (pushOnOff) {
				tokenids.push(firebaseTokens[i].id);
				tokens.push(firebaseTokens[i].token);
			}
		}

		firebaseData.title = `[일정 알람] - ${timer}`;
		firebaseData.body = `${title}`;
		firebaseData.token = tokens;
		firebaseData.tokenids = tokenids;
	}
	return firebaseData;

	/*
		토큰 데이터 {id, member_id, token} 가져온거 가지고
		member_id
	*/
};
