import nodeSchedule from 'node-schedule';
import * as redis from '../redis';
import * as firebaseService from '../services/firebase';
import * as firebaseComponent from '../component/firebase';
import { getModel, sequelize, QueryTypes } from '../database';
import * as scheduleInterface from '../interface/schedule';

const Schedule = getModel('Schedule');
const ScheduleLoop = getModel('ScheduleLoop');
const ScheduleLoopMemo = getModel('ScheduleLoopMemo');
const Alarm = getModel('Alarm');

// 입력받은 시간에 추가분을 추가하여 반환
export const getDatePlusTime = async (input, plusTime) => {
	const date = new Date(input);
	date.setMinutes(date.getMinutes() + plusTime);
	return `${date.toISOString().split('T')[0]} ${date.toTimeString().split(' ')[0]}`;
};

// 입력받은 날짜에 일자를 추가하여 반환
export const getDatePlusDate = async (input, plusDate) => {
	const date = new Date(input);
	date.setDate(date.getDate() + plusDate);
	return `${date.toISOString().split('T')[0]} ${date.toTimeString().split(' ')[0]}`;
};

/** @description 일정 생성 */
export const postSchedule = async (scheduleData, t) => {
	const response = await Schedule.create(scheduleData, { transaction: t });
	return response;
};

/** @description 일정 수정 */
export const patchSchedule = async (scheduleData, scheduleId, t) => {
	const response = await Schedule.update(scheduleData, { where: { id: scheduleId } }, { transaction: t });
	return response;
};

/** @description 반복 일정 생성 */
export const postScheduleLoop = async (scheduleLoopData, t: any) => {
	const response = await ScheduleLoop.create(scheduleLoopData, { transaction: t });
	return response;
};

/** @description 마지막 반복 일정 조회 */
export const getLastLoopData = async (scheduleLoopData) => {
	const response = await ScheduleLoop.findOne({ where: scheduleLoopData, order: [['start_time', 'DESC']] });
	return response;
};

/** @description 메모 생성 */
export const postMemo = async (scheduleLoopId, scheduleLoopData, t: any) => {
	const response = await ScheduleLoopMemo.create({ memo: scheduleLoopData.memo, schedule_loop_id: scheduleLoopId }, { transaction: t });
	return response;
};

/** @description 일정 인덱스로 상세 조회 */
export const getScheduleLoopById = async (scheduleLoopId: number) => {
	const response = await ScheduleLoop.findOne({ where: { id: scheduleLoopId } });
	return response;
};

/** @description 일정 인덱스로 일정 상세 조회 */
export const getScheduleDataById = async (scheduleId: number) => {
	const response = await Schedule.findOne({ where: { id: scheduleId } });
	return response;
};

/** @description 일정 인덱스로 알람 조회 */
export const getAlarmByLoopId = async (scheduleLoopId: number) => {
	const response = await Alarm.findOne({ where: { schedule_loop_id: scheduleLoopId } });
	return response;
};

/** @description 일정 인덱스로 다음 일정 조회 */
export const getScheduleLoopNextById = async (scheduleData: object) => {
	const response = await ScheduleLoop.findAll({ where: scheduleData });
	return response;
};

/** @description 일정 수정 */
export const patchScheduleLoop = async (scheduleLoopAttr: object, scheduleLoopData: scheduleInterface.ScheduleLoopParam, t) => {
	const response = await ScheduleLoop.update(scheduleLoopData, { where: scheduleLoopAttr, transaction: t });
	return response;
};

/** @description 메모 수정 */
export const patchMemo = async (scheduleLoopId: number, memoData, t) => {
	const response = await ScheduleLoopMemo.update({ memo: memoData.memo }, { where: { schedule_loop_id: scheduleLoopId }, transaction: t });
	return response;
};

export const getMemoByLoopId = async (scheduleLoopId: number) => {
	const response = await ScheduleLoopMemo.findOne({ where: { schedule_loop_id: scheduleLoopId } });
	return response;
};

/** @description 메모 삭제 */
export const deleteMemo = async (scheduleLoopId: number, t) => {
	const response = await ScheduleLoopMemo.destroy({ where: { schedule_loop_id: scheduleLoopId }, transaction: t });
	return response;
};

/** @description 알람 시간 */
export const alarmTime = async (alarmAttr, alarmStartTime) => {
	let alarmTimeAt = null;
	switch (alarmAttr) {
		case 'NONE':
			alarmTimeAt = null;
			break;
		case '0':
			alarmTimeAt = alarmStartTime;
			break;
		case '5':
			alarmTimeAt = await getDatePlusTime(alarmStartTime, -5);
			break;
		case '60':
			alarmTimeAt = await getDatePlusTime(alarmStartTime, -60);
			break;
		case '24':
			alarmTimeAt = await getDatePlusDate(alarmStartTime, -1);
			break;
		default:
			break;
	}
	return alarmTimeAt;
};

/** @description 알람 생성 */
export const postAlarm = async (scheduleLoopData, alarmStartTime, scheduleLoopId, firebaseData, t: any) => {
	const alarmAt = await alarmTime(scheduleLoopData.alarm, alarmStartTime);
	const response = await Alarm.create({ alarm: scheduleLoopData.alarm, alarm_at: alarmAt, schedule_loop_id: scheduleLoopId }, { transaction: t });
	if (alarmAt !== null && firebaseData && Object.keys(firebaseData).length > 0) {
		nodeSchedule.scheduleJob(`scheduleLoopId${scheduleLoopId}`, alarmAt, async () => {
			firebaseService.sendNotification(firebaseData.title, firebaseData.body, firebaseData.token);
			for (let j = 0; j < firebaseData.token.length; j += 1)
				// eslint-disable-next-line no-await-in-loop
				await firebaseComponent.postPushAlarm(firebaseData.title, firebaseData.body, firebaseData.tokenids[j], 'Alarm', scheduleLoopId, t);
		});
	}

	return response;
};

/** @description 알람 수정 */
export const patchAlarm = async (alarmAttr, alarmStartTime, scheduleLoopId, firebaseData, t: any) => {
	const alarmAt = await alarmTime(alarmAttr, alarmStartTime);
	const response = await Alarm.update({ alarm: alarmAttr, alarm_at: alarmAt }, { where: { schedule_loop_id: scheduleLoopId } }, { transaction: t });
	const deleteJob = nodeSchedule.scheduledJobs[`scheduleLoopId${scheduleLoopId}`];
	if (deleteJob && Object.keys(deleteJob).length > 0) deleteJob.cancel();
	if (alarmAt !== null && firebaseData && Object.keys(firebaseData).length > 0) {
		nodeSchedule.scheduleJob(alarmAt, async () => {
			firebaseService.sendNotification(firebaseData.title, firebaseData.body, firebaseData.token);
			for (let j = 0; j < firebaseData.token.length; j += 1)
				// eslint-disable-next-line no-await-in-loop
				await firebaseComponent.postPushAlarm(firebaseData.title, firebaseData.body, firebaseData.tokenids[j], 'Alarm', scheduleLoopId, t);
		});
	}
	return response;
};

export const getScheduleIdByLoopId = async (scheduleLoopId) => {
	const response = await ScheduleLoop.findOne({ where: { id: scheduleLoopId } });
	return response.schedule_id;
};

export const getCalendarIdByScheduleId = async (scheduleId) => {
	const response = await Schedule.findOne({ where: { id: scheduleId } });
	return response.calendar_id;
};

// 날짜 차이 반환
export const getBetweenDate = async (startDate, endDate) => {
	const endDateArray = new Date(endDate);
	const startDateArray = new Date(startDate);
	const response = endDateArray.getTime() - startDateArray.getTime();
	return response;
};

// 날짜 형태 반환
export const getDateFormat = async (input) => {
	const response = `${input.getFullYear()}-${input.getMonth() + 1}-${input.getDate()}`;
	return response;
};

// 날짜 형태 반환
export const getTimeFormat = async (input) => {
	const date = new Date(input);
	const response = date.getTime();
	return response;
};

// 시간 더하기
export const getDatePlusFullTime = async (dateParam, input) => {
	const date = await getTimeFormat(dateParam);
	const newTime = date + input;
	const response = new Date(newTime);
	return `${response.toISOString().split('T')[0]} ${response.toTimeString().split(' ')[0]}`;
};

// 날짜 형태 반환
export const getDateTimeFormat = async (input) => {
	const date = new Date(input);
	date.setDate(date.getDate());
	return `${date.toISOString().split('T')[0]} ${date.toTimeString().split(' ')[0]}`;
};

export const isSameMonth = async (startDate, endDate) => {
	let response = null;
	const startDateAtt = new Date(startDate);
	const endDateAtt = new Date(endDate);
	const startMonth = startDateAtt.getMonth() + 1;
	const endMonth = endDateAtt.getMonth() + 1;
	if (startMonth === endMonth) response = startMonth;
	return response;
};

export const getDatePlusMonth = async (dateparam, month) => {
	const date = new Date(dateparam);
	date.setMonth(date.getMonth() + month);
	return `${date.toISOString().split('T')[0]} ${date.toTimeString().split(' ')[0]}`;
};

// 입력받은 날짜에 추가년을 추가하여 반환
export const getDatePlusYear = async (input, plusYear) => {
	const date = new Date(input);
	date.setFullYear(date.getFullYear() + plusYear);
	return `${date.toISOString().split('T')[0]} ${date.toTimeString().split(' ')[0]}`;
};

/** @description 회원 인덱스로 소유 달력 일정 조회 */
export const getScheduleLoopsBymemberId = async (memberId: number, searchField: scheduleInterface.GetScheduleLoopsBymemberId) => {
	let response = null;

	const values = {
		calendar_is_deleted: searchField.calendar_is_deleted,
		schedule_loop_is_deleted: searchField.schedule_loop_is_deleted,
		is_display: searchField.is_display,
		start_time: searchField.start_time,
		end_time: searchField.end_time,
		member_id: memberId,
	};

	const sql = [
		'SELECT `*`',
		'FROM `schedule_loops` ',
		'WHERE `schedule_loops`.`schedule_id` IN ( ',
		'	SELECT `id` FROM `schedules` ',
		'	WHERE `calendar_id` IN ( ',
		'		SELECT `calendar_id` ',
		'		FROM `member_calendars` ',
		'		INNER JOIN `calendars` ON `calendars`.`id` = `member_calendars`.`calendar_id` ',
		'		WHERE `member_calendars`.`id` IS NOT NULL ',
		'		AND `member_calendars`.`member_id` = :member_id',
		values.is_display ? '		AND `member_calendars`.`is_display` = :is_display ' : ' ',
		values.calendar_is_deleted ? '		AND `calendars`.`is_deleted` = :calendar_is_deleted ' : ' ',
		'	)',
		') ',
		values.schedule_loop_is_deleted ? 'AND `schedule_loops`.`is_deleted` = :schedule_loop_is_deleted' : ' ',
		'AND ( ',
		'	DATE_FORMAT(`schedule_loops`.`start_time`, "%Y%m%d") IN ( ',
		'		SELECT REPLACE(`date`.`date`, "-", "") AS `date` ',
		'		FROM ( ',
		'			SELECT :end_time - INTERVAL (`a`.`a` + (10 * `b`.`a`) + (100 * `c`.`a`) + (1000 * `d`.`a`) ) DAY AS `date` ',
		'			FROM ( ',
		'				SELECT 0 AS `a` UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS `a` ',
		'				CROSS JOIN (SELECT 0 AS `a` UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS `b` ',
		'				CROSS JOIN (SELECT 0 AS `a` UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS `c` ',
		'				CROSS JOIN (SELECT 0 AS `a` UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS `d` ',
		'		) `date` ',
		'		WHERE `date`.`date` BETWEEN :start_time AND :end_time',
		'	) ',
		'	OR ',
		'	DATE_FORMAT(`schedule_loops`.`end_time`, "%Y%m%d") IN ( ',
		'		SELECT REPLACE(`date`.`date`, "-", "") AS `date` ',
		'		FROM ( ',
		'			SELECT :end_time - INTERVAL (`a`.`a` + (10 * `b`.`a`) + (100 * `c`.`a`) + (1000 * `d`.`a`) ) DAY AS `date` ',
		'			FROM (SELECT 0 AS `a` UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS `a` ',
		'			CROSS JOIN (SELECT 0 AS `a` UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS `b` ',
		'			CROSS JOIN (SELECT 0 AS `a` UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS `c` ',
		'			CROSS JOIN (SELECT 0 AS `a` UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS `d` ',
		'		) `date` ',
		'		WHERE `date`.`date` BETWEEN :start_time AND :end_time',
		'	)',
		'	OR ',
		'	( DATE_FORMAT(`schedule_loops`.`start_time`, "%Y%m%d") < REPLACE(:start_time, "-", "") AND DATE_FORMAT(`schedule_loops`.`end_time`, "%Y%m%d") > REPLACE(:end_time, "-", "") )',
		') ',
		'ORDER BY `schedule_loops`.`start_time` ASC, `schedule_loops`.`id` DESC',
	].join(' ');

	const scheduleLoops = await sequelize.query(sql, { type: QueryTypes.SELECT, replacements: values });

	if (scheduleLoops && scheduleLoops.length > 0) response = scheduleLoops;

	return response;
};

/** @description 제목, 태그로 일정 검색 */
export const getScheduleLoopsByTitleTag = async (memberId: number, searchWord: string) => {
	let response = null;

	const values = { search_word: `${searchWord}%`, calendar_is_deleted: 'N', schedule_loop_is_deleted: 'N', member_id: memberId };

	const sql = [
		'SELECT ',
		'LEFT(`schedule_loops`.`start_time`, 10) AS `start_time`, ',
		'group_concat(`schedule_loops`.`id` ORDER BY `schedule_loops`.`id`) AS `schedule_loop_ids`, ',
		'group_concat(`schedule_loops`.`schedule_id` ORDER BY `schedule_loops`.`id`) AS `schedule_loop_schedule_ids`, ',
		'group_concat(`schedule_loops`.`title` ORDER BY `schedule_loops`.`id`) AS `schedule_loop_titles`, ',
		'group_concat(`schedule_loops`.`start_time` ORDER BY `schedule_loops`.`id`) AS `schedule_loop_start_times`, ',
		'group_concat(`schedule_loops`.`end_time` ORDER BY `schedule_loops`.`id`) AS `schedule_loop_end_times`, ',
		'group_concat(`schedule_loops`.`color_id` ORDER BY `schedule_loops`.`id`) AS `schedule_loop_color_ids`, ',
		'group_concat(`schedule_loops`.`is_deleted` ORDER BY `schedule_loops`.`id`) AS `schedule_loop_is_deleted`, ',
		'group_concat(`schedule_loops`.`created_at` ORDER BY `schedule_loops`.`id`) AS `schedule_loop_created_at`, ',
		'group_concat(`schedule_loops`.`updated_at` ORDER BY `schedule_loops`.`id`) AS `schedule_loop_updated_at` ',
		'FROM `schedule_loops` ',
		'INNER JOIN `schedule_loop_tags` ON `schedule_loop_tags`.`schedule_loop_id` = `schedule_loops`.`id` ',
		'LEFT JOIN `tags` ON `tags`.`id` = `schedule_loop_tags`.`tag_id` ',
		'WHERE `schedule_loops`.`schedule_id` IN ( ',
		'	SELECT `id` FROM `schedules` ',
		'	WHERE `calendar_id` IN ( ',
		'		SELECT `calendar_id` ',
		'		FROM `member_calendars` ',
		'       INNER JOIN `calendars` ON `calendars`.`id` = `member_calendars`.`calendar_id` ',
		'		WHERE `member_calendars`.`id` IS NOT NULL ',
		'		AND `member_calendars`.`member_id` = :member_id ',
		'        AND `calendars`.`is_deleted` = :calendar_is_deleted ',
		'	) ',
		') ',
		'AND `schedule_loops`.`is_deleted` = :schedule_loop_is_deleted ',
		'AND ( ',
		'	`tags`.`tag` LIKE :search_word ',
		'    OR ',
		'    `schedule_loops`.`title` LIKE :search_word ',
		') ',
		'GROUP BY LEFT(`schedule_loops`.`start_time`, 10) ',
		'ORDER BY `start_time` DESC; ',
	].join(' ');

	const scheduleLoopsData = <scheduleInterface.getScheduleLoopsByTitleTag[]>await sequelize.query(sql, { type: QueryTypes.SELECT, replacements: values });

	if (scheduleLoopsData && scheduleLoopsData.length > 0) {
		const scheduleLoops = [];
		for (let i = 0; i < scheduleLoopsData.length; i += 1) {
			const scheduleIdsCheck = [];

			const scheduleLoopsDate = { date: scheduleLoopsData[i].start_time, schedule_loop: [] };
			const tmpScheduleLoopIds = scheduleLoopsData[i].schedule_loop_ids.split(',');
			const tmpScheduleLoopScheduleIds = scheduleLoopsData[i].schedule_loop_schedule_ids.split(',');
			const tmpScheduleLoopTitles = scheduleLoopsData[i].schedule_loop_titles.split(',');
			const tmpScheduleLoopStartTime = scheduleLoopsData[i].schedule_loop_start_times.split(',');
			const tmpScheduleLoopEndTime = scheduleLoopsData[i].schedule_loop_end_times.split(',');
			const tmpScheduleLoopColorIds = scheduleLoopsData[i].schedule_loop_color_ids.split(',');
			const tmpScheduleLoopIsDeleted = scheduleLoopsData[i].schedule_loop_is_deleted.split(',');
			const tmpScheduleLoopCreatedAt = scheduleLoopsData[i].schedule_loop_created_at.split(',');
			const tmpScheduleLoopUpdatedAt = scheduleLoopsData[i].schedule_loop_updated_at.split(',');

			for (let j = 0; j < tmpScheduleLoopIds.length; j += 1) {
				if (scheduleIdsCheck.indexOf(tmpScheduleLoopIds[j]) >= 0) continue;

				const tmpScheduleLoop = {
					id: tmpScheduleLoopIds[j],
					schedule_id: tmpScheduleLoopScheduleIds[j],
					title: tmpScheduleLoopTitles[j],
					start_time: tmpScheduleLoopStartTime[j],
					end_time: tmpScheduleLoopEndTime[j],
					color_id: tmpScheduleLoopColorIds[j],
					is_deleted: tmpScheduleLoopIsDeleted[j],
					created_at: tmpScheduleLoopCreatedAt[j],
					updated_at: tmpScheduleLoopUpdatedAt[j],
				};

				scheduleLoopsDate.schedule_loop.push(tmpScheduleLoop);
				scheduleIdsCheck.push(tmpScheduleLoopIds[j]);
			}

			scheduleLoops.push(scheduleLoopsDate);
		}
		response = scheduleLoops;
	}
	return response;
};

/** @description 일정 데이터로 하위 일정 조회 */
export const getScheduleLoopsByScheduleId = async (scheduleParam: any) => {
	let response = null;

	const scheduleLoopsData = await ScheduleLoop.findAll({ where: scheduleParam, order: [['id', 'DESC']] });

	if (scheduleLoopsData && scheduleLoopsData.length > 0) response = scheduleLoopsData;

	return response;
};
