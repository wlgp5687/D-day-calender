/* eslint-disable no-await-in-loop */
import nodeSchedule from 'node-schedule';
import { sequelize, Op } from '../database';
import * as firebaseService from '../services/firebase';
import * as scheduleComponent from '../component/schedule';
import * as calendarComponent from '../component/calendar';
import * as memberComponent from '../component/member';
import * as firebaseComponent from '../component/firebase';
import * as tagComponent from '../component/tag';
import * as scheduleInterface from '../interface/schedule';

export const postSchedule = async (scheduleData, scheduleLoopParam) => {
	const scheduleLoopData = scheduleLoopParam;
	let response = null;
	await sequelize.transaction(async (t) => {
		// 일정 생성
		const schedule = await scheduleComponent.postSchedule(scheduleData, t);
		scheduleLoopData.schedule_id = schedule.id;

		// 반복 일정 생성
		const betweenDate = await scheduleComponent.getBetweenDate(scheduleLoopData.start_time, scheduleLoopData.end_time);
		const scheduleLoop = [];

		// 반복 없음
		if (scheduleData.repeat === 'N') {
			scheduleLoop.push(await scheduleComponent.postScheduleLoop(scheduleLoopData, t));
		} else {
			while (scheduleLoopData.start_time < scheduleData.repeat_endtime) {
				scheduleLoop.push(await scheduleComponent.postScheduleLoop(scheduleLoopData, t));
				switch (scheduleData.repeat) {
					case 'D':
						scheduleLoopData.start_time = await scheduleComponent.getDatePlusDate(scheduleLoopData.start_time, 1);
						break;
					case 'W':
						scheduleLoopData.start_time = await scheduleComponent.getDatePlusDate(scheduleLoopData.start_time, 7);
						break;
					case 'M':
						scheduleLoopData.start_time = await scheduleComponent.getDatePlusMonth(scheduleLoopData.start_time, 1);
						break;
					case 'Y':
						scheduleLoopData.start_time = await scheduleComponent.getDatePlusYear(scheduleLoopData.start_time, 1);
						break;
					default:
						break;
				}
				scheduleLoopData.start_time = await scheduleComponent.getDatePlusDate(scheduleLoopData.start_time, 1);
				const newStartDate = scheduleLoopData.start_time;
				scheduleLoopData.end_time = await scheduleComponent.getDatePlusFullTime(newStartDate, betweenDate);
			}
		}
		response = {
			schedule,
			scheduleLoop,
		};

		// 알람 생성 푸시 알림 보내기
		const firebaseData = await firebaseService.firebaseAlarm(scheduleLoopData.alarm, scheduleLoopData.title, scheduleData.calendar_id);
		for (let i = 0; i < scheduleLoop.length; i += 1) {
			const scheduleLoopId = scheduleLoop[i].dataValues.id;
			const alarmStartTime = await scheduleComponent.getDateTimeFormat(scheduleLoop[i].dataValues.start_time);
			// 알람 생성
			const alarm = await scheduleComponent.postAlarm(scheduleLoopData, alarmStartTime, scheduleLoopId, firebaseData, t);
			response.alarm = alarm;
			// 메모 생성
			if (scheduleLoopData.memo) await scheduleComponent.postMemo(scheduleLoopId, scheduleLoopData, t);
			// 태그 생성
			if (scheduleLoopData.tags) {
				for (let j = 0; j < scheduleLoopData.tags.length; j += 1) {
					const tags = await tagComponent.postScheduleTag(scheduleLoopId, scheduleLoopData.tags[j], t);
					response.tags = tags;
				}
			}
		}
	});

	return response;
};

export const patchSchedule = async (schedule, memberId, scheduleLoopId) => {
	const scheduleId = await scheduleComponent.getScheduleIdByLoopId(scheduleLoopId);
	const calendarId = await scheduleComponent.getCalendarIdByScheduleId(scheduleId);
	const calendarData = await calendarComponent.getCalendarById(calendarId);
	const scheduleData = await scheduleComponent.getScheduleDataById(scheduleId);
	const scheduleLoopOriginData = await scheduleComponent.getScheduleLoopById(scheduleLoopId);

	// 권한 체크
	if (calendarData && calendarData.write_auth === 'MASTER') if (calendarData.member_id !== memberId) throw new Error('Invalid calendar auth');

	// 일정 다른 달력으로 이동
	await sequelize.transaction(async (t) => {
		if (schedule.scheduleData.calendar_id) {
			const newCalendarData = await calendarComponent.getCalendarById(schedule.scheduleData.calendar_id);

			// 이동할 달력 권한 체크
			if (newCalendarData && newCalendarData.write_auth === 'MASTER') if (newCalendarData.member_id !== memberId) throw new Error('Invalid calendar auth');

			await scheduleComponent.patchSchedule({ calendar_id: schedule.scheduleData.calendar_id }, scheduleId, t);
			scheduleData.calendar_id = schedule.scheduleData.calendar_id;

			if (!schedule.scheduleLoopData.start_time && !schedule.scheduleLoopData.alarm && !schedule.scheduleData.repeat) {
				const scheduleLoops = await scheduleComponent.getScheduleLoopsByScheduleId({ schedule_id: scheduleId });

				for (let i = 0; i < scheduleLoops.length; i += 1) {
					const alarmData = await scheduleComponent.getAlarmByLoopId(scheduleLoops[i].id);
					const firebaseData = await firebaseService.firebaseAlarm(alarmData.alarm, scheduleLoops[i].title, scheduleData.calendar_id);
					const deleteJob = nodeSchedule.scheduledJobs[`scheduleLoopId${scheduleLoops[i].id}`];

					if (deleteJob && Object.keys(deleteJob).length > 0) deleteJob.cancel();
					if (alarmData.alarmAt !== null && firebaseData && Object.keys(firebaseData).length > 0) {
						nodeSchedule.scheduleJob(alarmData.alarmAt, async () => {
							firebaseService.sendNotification(firebaseData.title, firebaseData.body, firebaseData.token);
							for (let j = 0; j < firebaseData.token.length; j += 1)
								// eslint-disable-next-line no-await-in-loop
								await firebaseComponent.postPushAlarm(firebaseData.title, firebaseData.body, firebaseData.tokenids[j], 'Alarm', scheduleLoopId, t);
						});
					}
				}
			}
		}
	});

	await sequelize.transaction(async (t) => {
		const scheduleLoopData = await scheduleComponent.getScheduleLoopById(scheduleLoopId);
		// 해당 일정만 수정할 때
		if (schedule.patchType === 'THIS') {
			const alarmData = await scheduleComponent.getAlarmByLoopId(scheduleLoopId);

			// 제목 & 메모 & 색상 & 종료일자 수정
			if (schedule.scheduleLoopData.title || schedule.scheduleLoopData.memo || schedule.scheduleLoopData.color_id || schedule.scheduleLoopData.end_time) {
				await scheduleComponent.patchScheduleLoop({ id: scheduleLoopId }, schedule.scheduleLoopData, t);
				await scheduleComponent.patchMemo(scheduleLoopId, schedule.scheduleLoopData, t);
			}
			if (schedule.scheduleLoopData.tags) {
				await tagComponent.patchScheduleTag(scheduleLoopId, t);
				for (let i = 0; i < schedule.scheduleLoopData.tags.length; i += 1) {
					await tagComponent.postScheduleTag(scheduleLoopId, schedule.scheduleLoopData.tags[i], t);
				}
			}

			// 시작 시간 수정
			if (schedule.scheduleLoopData.start_time) {
				// 알람 없을 시
				await scheduleComponent.patchScheduleLoop({ id: scheduleLoopId }, schedule.scheduleLoopData, t);
				// 알람 있을 시
				const firebaseData = await firebaseService.firebaseAlarm(alarmData.alarm, scheduleLoopData.title, scheduleData.calendar_id);
				if (alarmData) await scheduleComponent.patchAlarm(alarmData.alarm, schedule.scheduleLoopData.start_time, scheduleLoopId, firebaseData, t);
			}

			// 알람 수정
			if (schedule.scheduleLoopData.alarm) {
				// 알람 생성 푸시 알림 보내기
				const firebaseData = await firebaseService.firebaseAlarm(
					schedule.scheduleLoopData.alarm,
					schedule.scheduleLoopData.title ? schedule.scheduleLoopData.title : scheduleLoopData.title,
					scheduleData.calendar_id,
				);
				await scheduleComponent.patchAlarm(schedule.scheduleLoopData.alarm, scheduleLoopData.start_time, scheduleLoopId, firebaseData, t);
			}
		}

		// 이후 일정도 수정할 때
		else if (schedule.patchType === 'NEXT') {
			const sameMonth = await scheduleComponent.isSameMonth(schedule.scheduleData.start_time, schedule.scheduleData.end_time);
			if (scheduleData.repeat === 'M' && !sameMonth) throw new Error('Invalid date distance');
			const scheduleLoopNextData = await scheduleComponent.getScheduleLoopNextById({ schedule_id: scheduleId, start_time: { [Op.gte]: scheduleLoopData.start_time } });
			// 제목 & 메모 & 색상 수정
			if (schedule.scheduleLoopData.title || schedule.scheduleLoopData.memo || schedule.scheduleLoopData.color_id)
				await scheduleComponent.patchScheduleLoop({ schedule_id: scheduleLoopData.schedule_id, start_time: { [Op.gte]: scheduleLoopData.start_time } }, schedule.scheduleLoopData, t);
			for (let i = 0; i < scheduleLoopNextData.length; i += 1) {
				await scheduleComponent.patchMemo(scheduleLoopNextData[i].id, schedule.scheduleLoopData, t);
			}
			if (schedule.scheduleLoopData.tags) {
				for (let i = 0; i < scheduleLoopNextData.length; i += 1) {
					await tagComponent.patchScheduleTag(scheduleLoopNextData[i].id, t);
					for (let j = 0; j < schedule.scheduleLoopData.tags.length; j += 1) {
						await tagComponent.postScheduleTag(scheduleLoopNextData[i].id, schedule.scheduleLoopData.tags[j], t);
					}
				}
			}

			// 알람 수정
			if (schedule.scheduleLoopData.alarm) {
				for (let i = 0; i < scheduleLoopNextData.length; i += 1) {
					const firebaseData = await firebaseService.firebaseAlarm(
						schedule.scheduleLoopData.alarm,
						schedule.scheduleLoopData.title ? schedule.scheduleLoopData.title : scheduleLoopData.title,
						scheduleData.calendar_id,
					);

					await scheduleComponent.patchAlarm(schedule.scheduleLoopData.alarm, scheduleLoopNextData[i].start_time, scheduleLoopNextData[i].id, firebaseData, t);
				}
			}

			// 종료 시간 수정
			if (schedule.scheduleLoopData.end_time) {
				const betweenDate = await scheduleComponent.getBetweenDate(scheduleLoopData.start_time, schedule.scheduleLoopData.end_time);
				for (let i = 0; i < scheduleLoopNextData.length; i += 1) {
					const newEndTime = await scheduleComponent.getDatePlusFullTime(scheduleLoopNextData[i].start_time, betweenDate);

					await scheduleComponent.patchScheduleLoop({ id: scheduleLoopNextData[i].id }, { end_time: newEndTime }, t);
				}
			}

			// 시작 시간 수정
			if (schedule.scheduleLoopData.start_time) {
				const betweenDate = await scheduleComponent.getBetweenDate(scheduleLoopData.start_time, schedule.scheduleLoopData.start_time);
				for (let i = 0; i < scheduleLoopNextData.length; i += 1) {
					// 알람 없을 시
					const newStartTime = await scheduleComponent.getDatePlusFullTime(scheduleLoopNextData[i].start_time, betweenDate);
					await scheduleComponent.patchScheduleLoop({ id: scheduleLoopNextData[i].id }, { start_time: newStartTime }, t);

					// 알람 있을 시
					const alarmData = await scheduleComponent.getAlarmByLoopId(scheduleLoopNextData[i].id);
					if (alarmData) {
						const firebaseData = await firebaseService.firebaseAlarm(
							schedule.scheduleLoopData.alarm ? schedule.scheduleLoopData.alarm : alarmData.alarm,
							schedule.scheduleLoopData.title ? schedule.scheduleLoopData.title : scheduleLoopData.title,
							scheduleData.calendar_id,
						);
						await scheduleComponent.patchAlarm(alarmData.alarm, newStartTime, scheduleLoopNextData[i].id, firebaseData, t);
					}
				}
			}
		}
	});

	await sequelize.transaction(async (t) => {
		// 일정 반복 수정
		if (schedule.scheduleData.repeat || schedule.scheduleData.repeat_endtime || schedule.scheduleData.calendar_id) {
			const scheduleParam = await scheduleComponent.getScheduleLoopById(scheduleLoopId);
			let scheduleParamStartTime = await scheduleComponent.getDateTimeFormat(scheduleParam.start_time);
			delete scheduleParam.dataValues.id;
			delete scheduleParam.dataValues.created_at;
			delete scheduleParam.dataValues.updated_at;
			const betweenDate = await scheduleComponent.getBetweenDate(scheduleParam.start_time, scheduleParam.end_time);
			const alarmData = await scheduleComponent.getAlarmByLoopId(scheduleLoopId);
			delete alarmData.dataValues.created_at;
			delete alarmData.dataValues.updated_at;
			const memoData = await scheduleComponent.getMemoByLoopId(scheduleLoopId);
			const sameStartTime = schedule.scheduleData.start_time ? schedule.scheduleData.start_time : scheduleParam.start_time;
			const sameEndTime = schedule.scheduleData.end_time ? schedule.scheduleData.end_time : scheduleParam.end_time;
			const sameMonth = await scheduleComponent.isSameMonth(sameStartTime, sameEndTime);
			const scheduleTags = await tagComponent.getScheduleLoopTagsByScheduleLoopId(scheduleLoopId);
			if (schedule.scheduleData.repeat === 'M' && !sameMonth) throw new Error('Invalid date distance');
			await scheduleComponent.patchSchedule(schedule.scheduleData, scheduleId, t);
			if (schedule.scheduleData.repeat) {
				await scheduleComponent.patchSchedule(schedule.scheduleData, scheduleId, t);
				const scheduleRepeatEndTime = schedule.scheduleData.repeat_endtime ? schedule.scheduleData.repeat_endtime : scheduleData.repeat_endtime;
				// 기존 삭제 처리
				await scheduleComponent.patchScheduleLoop({ schedule_id: scheduleId, start_time: { [Op.gte]: scheduleParam.start_time } }, { is_deleted: 'Y' }, t);
				const scheduleLoopNextData = await scheduleComponent.getScheduleLoopNextById({ schedule_id: scheduleId, start_time: { [Op.gte]: scheduleParam.start_time } });
				for (let i = 0; i < scheduleLoopNextData.length; i += 1) {
					await scheduleComponent.patchAlarm('NONE', scheduleParam.start_time, scheduleLoopNextData[i].id, '', t);
					await scheduleComponent.deleteMemo(scheduleLoopNextData[i].id, t);
					await tagComponent.patchScheduleTag(scheduleLoopNextData[i].id, t);
				}
				const scheduleLoop = [];

				// 반복 없음
				if (schedule.scheduleData.repeat === 'N') {
					scheduleLoop.push(await scheduleComponent.postScheduleLoop(scheduleParam.dataValues, t));
				} else {
					while (scheduleParamStartTime < scheduleRepeatEndTime) {
						scheduleLoop.push(await scheduleComponent.postScheduleLoop(scheduleParam.dataValues, t));
						switch (schedule.scheduleData.repeat) {
							case 'D':
								scheduleParam.dataValues.start_time = await scheduleComponent.getDatePlusDate(scheduleParam.start_time, 1);
								break;
							case 'W':
								scheduleParam.dataValues.start_time = await scheduleComponent.getDatePlusDate(scheduleParam.start_time, 7);
								break;
							case 'M':
								scheduleParam.dataValues.start_time = await scheduleComponent.getDatePlusMonth(scheduleParam.start_time, 1);
								break;
							case 'Y':
								scheduleParam.dataValues.start_time = await scheduleComponent.getDatePlusYear(scheduleParam.start_time, 1);
								break;
							default:
								break;
						}
						scheduleParamStartTime = scheduleParam.start_time;
						scheduleParam.dataValues.end_time = await scheduleComponent.getDatePlusFullTime(scheduleParamStartTime, betweenDate);
					}
				}

				// 알람 생성 푸시 알림 보내기
				const firebaseData = await firebaseService.firebaseAlarm(alarmData.alarm, scheduleParam.title, scheduleData.calendar_id);
				for (let i = 0; i < scheduleLoop.length; i += 1) {
					const newScheduleLoopId = scheduleLoop[i].dataValues.id;
					const alarmStartTime = await scheduleComponent.getDateTimeFormat(scheduleLoop[i].dataValues.start_time);
					// 알람 생성
					await scheduleComponent.postAlarm(alarmData, alarmStartTime, newScheduleLoopId, firebaseData, t);
					// 메모 생성
					if (memoData) await scheduleComponent.postMemo(newScheduleLoopId, memoData, t);
					// 태그 생성
					if (scheduleTags) {
						for (let j = 0; j < scheduleTags.length; j += 1) {
							await tagComponent.postScheduleTag(newScheduleLoopId, scheduleTags[j].id, t);
						}
					}
				}
			} else {
				const lastLoopData = await scheduleComponent.getLastLoopData({ schedule_id: scheduleId, is_deleted: 'N' });
				const scheduleRepeat = scheduleData.repeat;
				const newRepeatEndTime = await scheduleComponent.getTimeFormat(schedule.scheduleData.repeat_endtime);
				const oldRepeatEndTime = await scheduleComponent.getTimeFormat(scheduleData.repeat_endtime);
				let lastLoopStartTime = await scheduleComponent.getDateTimeFormat(lastLoopData.start_time);
				delete lastLoopData.dataValues.id;
				if (newRepeatEndTime > oldRepeatEndTime) {
					const scheduleLoop = [];
					while (lastLoopStartTime < schedule.scheduleData.repeat_endtime) {
						switch (scheduleRepeat) {
							case 'D':
								lastLoopData.dataValues.start_time = await scheduleComponent.getDatePlusDate(lastLoopData.start_time, 1);
								break;
							case 'W':
								lastLoopData.dataValues.start_time = await scheduleComponent.getDatePlusDate(lastLoopData.start_time, 7);
								break;
							case 'M':
								lastLoopData.dataValues.start_time = await scheduleComponent.getDatePlusMonth(lastLoopData.start_time, 1);
								break;
							case 'Y':
								lastLoopData.dataValues.start_time = await scheduleComponent.getDatePlusYear(lastLoopData.start_time, 1);
								break;
							default:
								break;
						}
						lastLoopStartTime = lastLoopData.dataValues.start_time;
						lastLoopData.dataValues.end_time = await scheduleComponent.getDatePlusFullTime(lastLoopStartTime, betweenDate);
						if (lastLoopStartTime > schedule.scheduleData.repeat_endtime) break;
						scheduleLoop.push(await scheduleComponent.postScheduleLoop(lastLoopData.dataValues, t));
					}

					const firebaseData = await firebaseService.firebaseAlarm(alarmData.alarm, scheduleParam.title, scheduleData.calendar_id);
					for (let i = 0; i < scheduleLoop.length; i += 1) {
						const newScheduleLoopId = scheduleLoop[i].dataValues.id;
						const alarmStartTime = await scheduleComponent.getDateTimeFormat(scheduleLoop[i].dataValues.start_time);
						// 알람 생성
						await scheduleComponent.postAlarm(alarmData, alarmStartTime, newScheduleLoopId, firebaseData, t);
						// 메모 생성
						if (memoData) await scheduleComponent.postMemo(newScheduleLoopId, memoData, t);
						// 태그 생성
						if (scheduleTags) {
							for (let j = 0; j < scheduleTags.length; j += 1) {
								await tagComponent.postScheduleTag(newScheduleLoopId, scheduleTags[j].id, t);
							}
						}
					}
				} else {
					const scheduleLoopNextData = await scheduleComponent.getScheduleLoopNextById({ schedule_id: scheduleId, start_time: { [Op.gte]: schedule.scheduleData.repeat_endtime } });
					await scheduleComponent.patchScheduleLoop({ schedule_id: scheduleId, start_time: { [Op.gte]: schedule.scheduleData.repeat_endtime } }, { is_deleted: 'Y' }, t);
					for (let i = 0; i < scheduleLoopNextData.length; i += 1) {
						await scheduleComponent.patchAlarm('NONE', scheduleLoopNextData[i].start_time, scheduleLoopNextData[i].id, '', t);
						await scheduleComponent.deleteMemo(scheduleLoopNextData[i].id, t);
						await tagComponent.patchScheduleTag(scheduleLoopNextData[i].id, t);
					}
				}
			}
		}
	});

	// 수정 푸시 알림 보내기
	const memberData = await memberComponent.getMemberById(memberId);
	const firebaseTokens = await firebaseComponent.getFirebaseTokenByMemberId(calendarData.member_id);
	if (firebaseTokens && firebaseTokens.length > 0) {
		const tokens = [];
		await sequelize.transaction(async (t) => {
			for (let i = 0; i < firebaseTokens.length; i += 1) {
				const pushOnOff = await memberComponent.pushOnOff(firebaseTokens[i].member_id);
				if (pushOnOff) tokens.push(firebaseTokens[i].token);
			}
			await firebaseService.sendNotification('[수정 알림]', `${memberData.nickname}님이 [${scheduleLoopOriginData.title}] 일정을 수정하였습니다`, tokens);
			for (let j = 0; j < tokens.length; j += 1)
				await firebaseComponent.postPushAlarm(
					'[수정 알림]',
					`${memberData.nickname}님이 [${scheduleLoopOriginData.title}] 일정을 수정하였습니다`,
					firebaseTokens[j].id,
					'Alarm',
					scheduleLoopId,
					t,
				);
		});
	}
	return null;
};

/** @description 일정 인덱스로 하위 일정 조회 */
export const getScheduleLoopsByScheduleId = async (scheduleParam: scheduleInterface.ScheduleLoopParam) => {
	const response = await scheduleComponent.getScheduleLoopsByScheduleId(scheduleParam);
	return response;
};

/** @description 일정 인덱스로 상세 조회 */
export const getScheduleLoopById = async (scheduleLoopId: number) => {
	let response = null;

	const scheduleLoopData = await scheduleComponent.getScheduleLoopById(scheduleLoopId);

	if (scheduleLoopData) {
		const scheduleData = await scheduleComponent.getScheduleDataById(scheduleLoopData.schedule_id);
		const calendar = await calendarComponent.getCalendarById(scheduleData.calendar_id);

		scheduleLoopData.repeat = scheduleData.repeat;
		scheduleLoopData.repeat_endtime = scheduleData.repeat_endtime;
		scheduleLoopData.calendar_title = calendar.title;
		scheduleLoopData.calendar_id = calendar.id;

		response = scheduleLoopData;
	}

	return response;
};

/** @description 수정 삭제 권한 확인 */
export const deleteScheduleLoop = async (memberId: number, calendarId: number, scheduleLoopId: number, deleteType: string, scheduleLoopParam: scheduleInterface.ScheduleLoopParam) => {
	// 달력 삭제 권한 확인
	const calendarData = await calendarComponent.getCalendarById(calendarId);

	if (calendarData && calendarData.write_auth === 'MASTER') if (calendarData.member_id !== memberId) throw new Error('Invalid calendar auth');

	await sequelize.transaction(async (t) => {
		if (deleteType === 'THIS') await scheduleComponent.patchScheduleLoop({ id: scheduleLoopId }, scheduleLoopParam, t);
		else if (deleteType === 'NEXT') {
			const scheduleLoopData = await scheduleComponent.getScheduleLoopById(scheduleLoopId);

			await scheduleComponent.patchScheduleLoop({ schedule_id: scheduleLoopData.schedule_id, start_time: { [Op.gte]: scheduleLoopData.start_time } }, scheduleLoopParam, t);
		}
	});

	return null;
};

/** @description 일정 인덱스로 메모 조회 */
export const getMemoByLoopId = async (scheduleLoopId: number) => {
	const response = await scheduleComponent.getMemoByLoopId(scheduleLoopId);
	return response;
};

/** @description 회원 인덱스로 소유 달력 일정 조회 */
export const getScheduleLoopsBymemberId = async (memberId: number, searchField: scheduleInterface.GetScheduleLoopsBymemberId) => {
	const response = await scheduleComponent.getScheduleLoopsBymemberId(memberId, searchField);
	return response;
};

/** @description 일정 인덱스로 태그 목록 조회 */
export const getScheduleLoopTagsByScheduleLoopId = async (scheduleLoopId: number) => {
	const response = await tagComponent.getScheduleLoopTagsByScheduleLoopId(scheduleLoopId);
	return response;
};

/** @description 제목, 태그로 일정 검색 */
export const getScheduleLoopsByTitleTag = async (memberId: number, searchWord: string) => {
	const response = await scheduleComponent.getScheduleLoopsByTitleTag(memberId, searchWord);
	return response;
};

/** @description 일정 인덱스로 알람 조회 */
export const getAlarmByLoopId = async (loopId: number) => {
	const response = await scheduleComponent.getAlarmByLoopId(loopId);
	return response;
};
