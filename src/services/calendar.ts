import nodeSchedule from 'node-schedule';
import { sequelize, Op } from '../database';
import * as firebaseService from './firebase';
import * as calendarComponent from '../component/calendar';
import * as scheduleComponent from '../component/schedule';
import * as memberComponent from '../component/member';
import * as firebaseComponent from '../component/firebase';
import * as redis from '../redis';
import * as memberInterface from '../interface/member';
import * as scheduleInterface from '../interface/schedule';

export const postCalendar = async (calendarData, memberCalendarParam) => {
	const memberCalendarData = memberCalendarParam;
	let response = null;

	await sequelize.transaction(async (t) => {
		// 캘린더 생성
		const calendar = await calendarComponent.postCalendar(calendarData, t);
		memberCalendarData.calendar_id = calendar.id;

		// 회원 캘린더
		const memberCalendar = await calendarComponent.postMemberCalendar(memberCalendarData, t);

		response = {
			calendar,
			member_calendar: memberCalendar,
		};
	});

	return response;
};

export const getCalendarById = async (calendarId: number) => {
	const response = await calendarComponent.getCalendarById(calendarId);
	return response;
};

/** @description 달력 참여자 목록 조회 */
export const getCalendarMemberByCalendarId = async (calendarId: number) => {
	let response = null;

	const calendarMember = await calendarComponent.getCalendarMemberByCalendarId(calendarId);
	const calendarAttr = await calendarComponent.getCalendarById(calendarId);

	if (calendarMember && calendarMember.length > 0) {
		for (let i = 0; i < calendarMember.length; i += 1) {
			// eslint-disable-next-line no-await-in-loop
			const memberAttr = await memberComponent.getMemberById(calendarMember[i].member_id);
			calendarMember[i].member = memberAttr;
			calendarMember[i].calendar = calendarAttr;
		}

		response = { total: calendarMember.length, list: calendarMember };
	}

	return response;
};

/** @description 소유 캘린더 삭제 */
export const deleteCalendar = async (memberId, calendarId) => {
	const isMaster = await calendarComponent.getIsMasterByMemberId(memberId, calendarId);

	await sequelize.transaction(async (t) => {
		// 달력 하위 일정 조회
		const scheduleIds = [];
		const schedules = await calendarComponent.getScheduleByCalendarId(calendarId);
		const todayDate = new Date();
		let scheduleLoops = null;

		if (schedules && schedules.length > 0) {
			for (let i = 0; i < schedules.length; i += 1) scheduleIds.push(schedules[i].id);

			scheduleLoops = await scheduleComponent.getScheduleLoopsByScheduleId({ [Op.and]: [{ schedule_id: { [Op.in]: scheduleIds } }, { start_time: { [Op.gte]: todayDate } }] });
		}

		if (isMaster) {
			await calendarComponent.deleteCalendarByMaster(calendarId, t);
			await calendarComponent.patchCalendar(calendarId, memberId, { is_deleted: 'Y' }, t);

			if (schedules && schedules.length > 0) {
				for (let i = 0; i < scheduleLoops.length; i += 1) {
					const scheduleLoopId = scheduleLoops[i].id;
					// eslint-disable-next-line no-await-in-loop
					const prevScheduleJob = <scheduleInterface.Job>await redis.redisGetValue(`scheduleLoopId${scheduleLoopId}`);
					prevScheduleJob.cancel();

					// eslint-disable-next-line no-await-in-loop
					await redis.redisDelKey(`scheduleLoopId${scheduleLoopId}`);
				}
			}
		} else {
			await calendarComponent.deleteCalendarByUser(memberId, calendarId, t);

			if (schedules && schedules.length > 0) {
				// 알람 생성 푸시 알림 보내기
				const firebaseTokens = await firebaseComponent.getFirebaseTokenByCalendarId(calendarId);
				const firebaseData = <scheduleInterface.postScheduleFirebaseData>{};
				if (firebaseTokens && firebaseTokens.length > 0) {
					const tokens = [];
					for (let i = 0; i < firebaseTokens.length; i += 1) {
						// eslint-disable-next-line no-await-in-loop
						const pushOnOff = await memberComponent.pushOnOff(firebaseTokens[i].member_id);
						if (pushOnOff) tokens.push(firebaseTokens[i].token);
					}
					firebaseData.title = `[일정 알람] - `;
					firebaseData.body = `${scheduleLoops[0].title}`;
					firebaseData.token = tokens;
				}

				for (let i = 0; i < scheduleLoops.length; i += 1) {
					const scheduleLoopId = scheduleLoops[i].id;
					// eslint-disable-next-line no-await-in-loop
					const alarmData = await scheduleComponent.getAlarmByLoopId(scheduleLoopId);
					if (alarmData) {
						const timer = alarmData.alarm === '24' ? '하루 전' : `${alarmData.alarm}분 전`;
						firebaseData.title += timer;

						if (alarmData.alarm_at) {
							const scheduleJob = nodeSchedule.scheduleJob(alarmData.alarm_at, async () => {
								firebaseService.sendNotification(firebaseData.title, firebaseData.body, firebaseData.token);
								for (let j = 0; j < firebaseData.token.length; j += 1)
									// eslint-disable-next-line no-await-in-loop
									await firebaseComponent.postPushAlarm(firebaseData.title, firebaseData.body, firebaseTokens[j].id, 'Alarm', scheduleLoopId, t);

								redis.redisSetKeyValue(`scheduleLoopId${scheduleLoopId}`, scheduleJob);
							});
						}
					}
				}
			}
		}
	});

	return null;
};

/** @description 달력 수정 */
export const patchCalendar = async (calendarParam, memberId: number, calendarId: number) => {
	// 캘린더 마스터 검사
	const isMaster = await calendarComponent.getIsMasterByMemberId(memberId, calendarId);

	await sequelize.transaction(async (t) => {
		if (isMaster) await calendarComponent.patchCalendar(calendarId, memberId, calendarParam.calendar_data, t);
		await memberComponent.patchMemberCalendar({ member_id: memberId, calendar_id: calendarId }, calendarParam.member_calendar_data, t);
	});

	return null;
};

/** @description 달력 사용자 초대 */
export const inviteCalendarMember = async (memberIds: number[], memberCalendarParam) => {
	const memberCalendarData = memberCalendarParam;
	let response = null;

	if (memberIds && memberIds.length > 0) {
		const memberCalendar = [];

		await sequelize.transaction(async (t) => {
			for (let i = 0; i < memberIds.length; i += 1) {
				memberCalendarData.member_id = memberIds[i];

				// eslint-disable-next-line no-await-in-loop
				const tmpMemberCalendar = await calendarComponent.postMemberCalendar(memberCalendarData, t);
				// eslint-disable-next-line no-await-in-loop

				memberCalendar.push(tmpMemberCalendar);
			}
			response = { member_calendar: memberCalendar };
		});
	}

	return response;
};

/** @description 캘린더 참여 */
export const patchCalendarShare = async (calendarId: number, memberId: number, status: string) => {
	await sequelize.transaction(async (t) => {
		await memberComponent.patchMemberCalendar({ calendar_id: calendarId, member_id: memberId }, { status }, t);

		// 달력 하위 일정 조회
		const scheduleIds = [];
		const schedules = await calendarComponent.getScheduleByCalendarId(calendarId);
		const todayDate = new Date();
		let scheduleLoops = null;

		if (schedules && schedules.length > 0) {
			for (let i = 0; i < schedules.length; i += 1) scheduleIds.push(schedules[i].id);

			scheduleLoops = await scheduleComponent.getScheduleLoopsByScheduleId({ [Op.and]: [{ schedule_id: { [Op.in]: scheduleIds } }, { start_time: { [Op.gte]: todayDate } }] });

			if (scheduleLoops && scheduleLoops.length > 0) {
				// 알람 생성 푸시 알림 보내기
				const firebaseTokens = await firebaseComponent.getFirebaseTokenByCalendarId(calendarId);
				const firebaseData = <scheduleInterface.postScheduleFirebaseData>{};
				if (firebaseTokens && firebaseTokens.length > 0) {
					const tokens = [];
					for (let i = 0; i < firebaseTokens.length; i += 1) {
						// eslint-disable-next-line no-await-in-loop
						const pushOnOff = await memberComponent.pushOnOff(firebaseTokens[i].member_id);
						if (pushOnOff) tokens.push(firebaseTokens[i].token);
					}
					firebaseData.title = `[일정 알람] - `;
					firebaseData.body = `${scheduleLoops[0].title}`;
					firebaseData.token = tokens;
				}

				for (let i = 0; i < scheduleLoops.length; i += 1) {
					const scheduleLoopId = scheduleLoops[i].id;
					// eslint-disable-next-line no-await-in-loop
					const alarmData = await scheduleComponent.getAlarmByLoopId(scheduleLoopId);
					if (alarmData) {
						const timer = alarmData.alarm === '24' ? '하루 전' : `${alarmData.alarm}분 전`;
						firebaseData.title += timer;
						if (alarmData.alarm_at) {
							// eslint-disable-next-line no-await-in-loop
							const prevScheduleJob = <scheduleInterface.Job>await redis.redisGetValue(`scheduleLoopId${scheduleLoopId}`);
							prevScheduleJob.cancel();

							// eslint-disable-next-line no-await-in-loop
							await redis.redisDelKey(`scheduleLoopId${scheduleLoopId}`);

							const scheduleJob = nodeSchedule.scheduleJob(alarmData.alarm_at, async () => {
								firebaseService.sendNotification(firebaseData.title, firebaseData.body, firebaseData.token);
								for (let j = 0; j < firebaseData.token.length; j += 1) {
									// eslint-disable-next-line no-await-in-loop
									await firebaseComponent.postPushAlarm(firebaseData.title, firebaseData.body, firebaseTokens[j].id, 'Alarm', scheduleLoopId, t);
								}
							});

							redis.redisSetKeyValue(`scheduleLoopId${scheduleLoopId}`, scheduleJob);
						}
					}
				}
			}
		}
	});

	return null;
};

/** @description 회원, 달력 인덱스로 마스터 권한 조회 */
export const getIsMasterByMemberId = async (memberId, calendarId) => {
	const response = calendarComponent.getIsMasterByMemberId(memberId, calendarId);
	return response;
};
