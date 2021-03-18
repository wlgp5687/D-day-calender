import { getModel } from '../database';

const Calendar = getModel('Calendar');
const Schedule = getModel('Schedule');
const MemberCalendar = getModel('MemberCalendar');
// const CalendarShare = getModel('CalendarShare');
const Member = getModel('Member');

/** @description 달력 생성 */
export const postCalendar = async (calendarData, t) => {
	const response = Calendar.create(calendarData, { transaction: t });
	return response;
};

export const postMemberCalendar = async (memberCalendarParam, t: any) => {
	const response = MemberCalendar.create(memberCalendarParam, { transaction: t });
	return response;
};

/** @description calendar_id로 달력 조회 */
export const getCalendarById = async (calendarId: number) => {
	const response = Calendar.findOne({ where: { id: calendarId } });
	return response;
};

/** @description calendar_id로 참여자 목록 조회 */
export const getCalendarMemberByCalendarId = async (calendarId: number) => {
	const response = MemberCalendar.findAll({ where: { calendar_id: calendarId } });
	return response;
};

/** @description 참여자 달력 삭제 */
export const deleteCalendarByUser = async (memberId: number, calendarId: number, t: any) => {
	const response = MemberCalendar.destroy({ where: { member_id: memberId, calendar_id: calendarId } }, { transaction: t });
	return response;
};

/** @description 달력 주인 달력 삭제 */
export const deleteCalendarByMaster = async (calendarId: number, t: any) => {
	const response = MemberCalendar.destroy({ where: { calendar_id: calendarId } }, { transaction: t });
	return response;
};

export const getIsMasterByMemberId = async (memberId, calendarId) => {
	const isMaster = await MemberCalendar.count({ where: { member_id: memberId, calendar_id: calendarId, is_master: 'Y' } });
	return isMaster > 0;
};

/** @description 달력 수정 */
export const patchCalendar = async (calendarId: number, memberId: number, calendarData, t: any) => {
	const response = Calendar.update(calendarData, { where: { id: calendarId, member_id: memberId }, transaction: t });
	return response;
};

/** @description 달력 초대 데이터 추가 */
export const postCalendarShare = async (memberId: number, calendarId: number, t: any) => {
	const response = null; // CalendarShare.create({ member_id: memberId, calendar_id: calendarId, status: 'request' }, { transaction: t });
	return response;
};

/** @description 달력 인덱스로 하위 일정 조회 */
export const getScheduleByCalendarId = async (calendarId: number) => {
	let response = null;
	const scheduleData = await Schedule.findAll({ where: { calendar_id: calendarId, is_deleted: 'N' }, order: [['id', 'DESC']] });

	if (scheduleData && scheduleData.length > 0) response = scheduleData;

	return response;
};
