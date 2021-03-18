import { getModel } from '../database';

const FirebaseToken = getModel('FirebaseToken');
const PushAlarm = getModel('PushAlarm');
const MemberCalendar = getModel('MemberCalendar');
const Member = getModel('Member');

/** @description 회원 파이어베이스 존재 여부 */
export const isExistFirebaseToken = async (firebaseParam) => {
	const isExistCount = await FirebaseToken.count({ where: { member_id: firebaseParam.member_id, token: firebaseParam.token } });
	return isExistCount > 0;
};

/** @description 회원 파이어베이스 토큰 등록 */
export const postMemberFirebaseToken = async (firebaseParam, t: any) => {
	const response = await FirebaseToken.create(firebaseParam, { transaction: t });
	return response;
};

export const getFirebaseTokenByMemberId = async (memberId: number) => {
	let response = null;

	const firebaseTokens = await FirebaseToken.findAll({ where: { member_id: memberId } });
	if (firebaseTokens && firebaseTokens.length > 0) response = firebaseTokens;

	return response;
};

/** @description 달력 인덱스로 소속 회원 파이어베이스 토큰 조회 */
export const getFirebaseTokenByCalendarId = async (calendarId: number) => {
	let response = null;

	const firebaseTokensData = await MemberCalendar.findAll({
		where: { calendar_id: calendarId },
		include: [{ model: Member, as: 'member', required: true, include: [{ model: FirebaseToken, as: 'firebase_token', required: true }] }],
	});

	if (firebaseTokensData && firebaseTokensData.length) {
		const firebaseTokens = [];

		for (let i = 0; i < firebaseTokensData.length; i += 1) {
			const { member } = firebaseTokensData[i];

			for (let j = 0; j < member.firebase_token.length; j += 1) {
				const tmpTokens = {
					id: member.firebase_token[i].id,
					member_id: member.firebase_token[i].member_id,
					token: member.firebase_token[i].token,
					division: member.firebase_token[i].division,
					device_name: member.firebase_token[i].device_name,
					created_at: member.firebase_token[i].created_at,
					updated_at: member.firebase_token[i].updated_at,
				};
				firebaseTokens.push(tmpTokens);
			}
		}
		response = firebaseTokens;
	}

	return response;
};

/** @description 푸시 알림 로그 작성 */
export const postPushAlarm = async (title: string, body: string, firebaseTokenId: number, category: string, scheduleLoopId: number, t: any) => {
	const response = await PushAlarm.create({ title, body, firebase_token_id: firebaseTokenId, category, schedule_loop_id: scheduleLoopId }, { transaction: t });
	return response;
};
