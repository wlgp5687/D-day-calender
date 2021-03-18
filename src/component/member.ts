import bcrypt from 'bcryptjs';
import { getModel, sequelize, Op, QueryTypes } from '../database';
import * as memberInterface from '../interface/member';

/** @todo db 삭제 된게 있어서  코드 수정 필요 */
const Member = getModel('Member');
const MemberExternal = getModel('MemberExternal');
const MemberCalendar = getModel('MemberCalendar');
const MemberSetting = getModel('MemberSetting');
const MemberTag = getModel('MemberTag');
const MemberColor = getModel('MemberColor');
const Color = getModel('Color');
const Calendar = getModel('Calendar');
const Tag = getModel('Tag');
// const CalendarShare = getModel('CalendarShare');

/** @description member_id로 회원 조회 */
export const getMemberById = async (memberId: number) => {
	const response = await Member.findOne({ where: { id: memberId } });
	return response;
};

/** @description userId로 회원 조회 */
export const getMemberByUserId = async (userId: string) => {
	const response = await Member.findOne({ where: { email: userId } });
	return response;
};

/** @description channel, token으로 외부 회원 조회 */
export const getMemberByChannelAndToken = async (Channel: string, token: number) => {
	const response = await MemberExternal.findOne({ where: { channel: Channel, token } });
	return response;
};

export const getMemberExternalById = async (memberId) => {
	const response = await MemberExternal.findOne({ where: { member_id: memberId } });
	return response;
};

/** @description 조건 설정으로 회원 달력 조회 */
export const getMemberCalendarByMemberId = async (searchField) => {
	let response = null;
	const values = {
		member_id: searchField.member_id,
		is_default: searchField.is_default,
		is_secret: searchField.is_secret,
		is_deleted: searchField.is_deleted,
	};

	const sql = [
		'SELECT ',
		'`member_calendars`.`id`, ',
		'`member_calendars`.`member_id`, ',
		'`member_calendars`.`calendar_id`, ',
		'`member_calendars`.`status`, ',
		'`member_calendars`.`is_master`, ',
		'`member_calendars`.`is_display`, ',
		'`member_calendars`.`created_at`, ',
		'`member_calendars`.`updated_at`, ',
		'`calendars`.`id` AS `calendars_id`, ',
		'`calendars`.`member_id` AS `calendars_member_id`, ',
		'`calendars`.`title` AS `calendars_title`, ',
		'`calendars`.`is_deleted` AS `calendars_is_deleted`, ',
		'`calendars`.`write_auth` AS `calendars_write_auth`, ',
		'`calendars`.`is_secret` AS `calendars_is_secret`, ',
		'`calendars`.`is_default` AS `calendars_is_default`, ',
		'`calendars`.`created_at` AS `calendars_created_at`, ',
		'`calendars`.`updated_at` AS `calendars_updated_at` ',
		'FROM `member_calendars` ',
		'INNER JOIN `calendars` ON `calendars`.`id` = `member_calendars`.`calendar_id` ',
		'WHERE `member_calendars`.`member_id` = :member_id ',
		values.is_default ? 'AND `calendars`.`is_default` = :is_default ' : ' ',
		values.is_secret ? 'AND `calendars`.`is_secret` = :is_secret ' : ' ',
		values.is_deleted ? 'AND `calendars`.`is_deleted` = :is_deleted ' : ' ',
		'ORDER BY `member_calendars`.`is_master` ASC , `member_calendars`.`status` DESC, `calendars`.`created_at` DESC ',
	].join(' ');

	const memberCalendarData = <memberInterface.MemberCalendarData[]>await sequelize.query(sql, { type: QueryTypes.SELECT, replacements: values });

	if (memberCalendarData && memberCalendarData.length > 0) {
		const memberCalendars = [];

		for (let i = 0; i < memberCalendarData.length; i += 1) {
			const tmpMemberCalendar = {
				id: memberCalendarData[i].id,
				member_id: memberCalendarData[i].member_id,
				calendar_id: memberCalendarData[i].calendar_id,
				is_master: memberCalendarData[i].is_master,
				is_display: memberCalendarData[i].is_display,
				status: memberCalendarData[i].status,
				created_at: memberCalendarData[i].created_at,
				updated_at: memberCalendarData[i].updated_at,
				calendar: {
					id: memberCalendarData[i].calendars_id,
					title: memberCalendarData[i].calendars_title,
					is_deleted: memberCalendarData[i].calendars_is_deleted,
					write_auth: memberCalendarData[i].calendars_write_auth,
					is_secret: memberCalendarData[i].calendars_is_secret,
					is_default: memberCalendarData[i].calendars_is_default,
					created_at: memberCalendarData[i].calendars_created_at,
					updated_at: memberCalendarData[i].calendars_updated_at,
				},
			};
			memberCalendars.push(tmpMemberCalendar);
		}
		response = memberCalendars;
	}
	return response;
};
export const getMemberSettingById = async (memberId) => {
	const response = await MemberSetting.findOne({ where: { member_id: memberId } });
	return response;
};

/** @todo 코드 수정 필요 */
// export const getMemberCalendarByMemberId = async (memberId) => {
// 	const response = await MemberCalendar.findAll({
// 		where: { member_id: memberId, is_deleted: 'N' },
// 		include: [{ model: Calendar, as: 'calendar', where: { is_deleted: 'N' } }],
// 	});
// 	return response;
// };

export const isExistMemberEmail = async (memberEmail) => {
	const isExistEmail = await Member.count({ where: { email: memberEmail } });
	return isExistEmail > 0;
};

/** @description 회원 소유 달력 수정 */
export const patchMemberCalendar = async (memberCalendarAttr, memberCalendarData, t) => {
	const response = await MemberCalendar.update(memberCalendarData, { where: memberCalendarAttr, transaction: t });
	return response;
};

export const addMember = async (memberData, t: Object) => {
	const member = memberData;
	if (member.password !== '' && member.password != null) member.password = bcrypt.hashSync(member.password, parseInt(process.env.PASSWORD_DEFAULT, 10));

	const response = await Member.create(
		{
			user_id: member.user_id,
			password: member.password,
			profile: member.profile,
			nickname: member.nickname,
			email: member.email,
			join_site: member.join_site,
		},
		{ transaction: t },
	);

	// Return
	return response.dataValues.id;
};

export const addMemberExternal = async (memberExternal, isGetId = false, t) => {
	const response = await MemberExternal.create(
		{
			member_id: memberExternal.member_id,
			channel: memberExternal.channel,
			token: memberExternal.token,
		},
		{ transaction: t },
	);
	// Return
	return isGetId ? response.dataValues.member_id : null;
};

/** @todo 로그인 로그 삭제 되서 코드 수정 필요 */
// export const addMemberLoginLog = async (memberLoginLog, isGetId = false, t) => {
// 	const response = await MemberLoginLog.create({ member_id: memberLoginLog.member_id, login_site: memberLoginLog.login_site }, { transaction: t });
// 	// Return
// 	return isGetId ? response.dataValues.member_id : null;
// };

// 	// Return
// 	return response;
// };

/** @todo 코드 수정 필요 */
// export const addMemberVersion = async (memberId, versionId, t) => {
// 	const response = await MemberVersion.create({ member_id: memberId, version_id: versionId }, { transaction: t });

// 	// Return
// 	return response;
// };

/** @description 이메일로 회원 조회 */
export const getMembersByEmail = async (email: string) => {
	let response = null;
	const members = await Member.findAll({ where: { [Op.or]: [{ email: { [Op.like]: `${email}%` } }, { email }] } });

	if (members && members.length > 0) response = members;

	return response;
};

export const addMemberSetting = async (memberId, versionId, t) => {
	const response = await MemberSetting.create({ member_id: memberId, version_id: versionId, theme_id: 1 }, { transaction: t });
	// Return
	return response;
};

export const patchMember = async (memberParam, memberId) => {
	const memberData = memberParam;
	if (memberData.password) memberData.password = bcrypt.hashSync(memberData.password, parseInt(process.env.PASSWORD_DEFAULT, 10));
	const response = Member.update(memberData, { where: { id: memberId } });
	return response;
};

/** @description 이메일로 임시 비밀번호 생성 */
export const postPasscodeByEmail = async (email: string, passcodeParam: string, t: any) => {
	const passcode = bcrypt.hashSync(passcodeParam, parseInt(process.env.PASSWORD_DEFAULT, 10));
	await Member.update({ passcode }, { where: { email }, transaction: t });
	return null;
};

export const patchMemberSetting = async (memberSettingData, memberId) => {
	const response = MemberSetting.update(memberSettingData, { where: { member_id: memberId } });
	return response;
};

/** @description 회원 태그 목록 조회 */
export const getMemberTagsByMemberId = async (memberId: number) => {
	let response = null;

	const memberTagData = await MemberTag.findAll({
		where: { member_id: memberId },
		include: [{ model: Tag, as: 'tag', required: true }],
		order: [
			[{ model: Tag, as: 'tag' }, 'tag', 'ASC'],
			[{ model: Tag, as: 'tag' }, 'created_at', 'DESC'],
		],
	});

	if (memberTagData && memberTagData.length > 0) {
		const memberTag = [];
		for (let i = 0; i < memberTagData.length; i += 1) {
			const tmpMemberTag = {
				id: memberTagData[i].tag.id,
				tag: memberTagData[i].tag.tag,
				created_at: memberTagData[i].tag.created_at,
			};
			memberTag.push(tmpMemberTag);
		}
		response = memberTag;
	}

	return response;
};

/** @description 회원 색상 목록 조회 */
export const getMembrColorsByMemberId = async (memberId: number) => {
	let response = null;

	const memberColorData = await MemberColor.findAll({
		where: { member_id: memberId },
		include: [{ model: Color, as: 'color', required: true }],
		order: [
			[{ model: Color, as: 'color' }, 'is_premium', 'DESC'],
			['count', 'DESC'],
			['sort_no', 'DESC'],
			['id', 'DESC'],
		],
	});

	if (memberColorData && memberColorData.length > 0) {
		const memberColor = [];
		for (let i = 0; i < memberColorData.length; i += 1) {
			const tmpMemberColor = {
				id: memberColorData[i].id,
				member_id: memberColorData[i].member_id,
				color_id: memberColorData[i].color_id,
				sort_no: memberColorData[i].sort_no,
				count: memberColorData[i].count,
				created_at: memberColorData[i].created_at,
				updated_at: memberColorData[i].updated_at,
				color: {
					id: memberColorData[i].color.id,
					color: memberColorData[i].color.color,
					is_premium: memberColorData[i].color.is_premium,
				},
			};
			memberColor.push(tmpMemberColor);
		}
		response = memberColor;
	}

	return response;
};

/** @description 회원 색상 생성  */
export const postMemberColors = async (memberId: number, colorId: number, sortNo: number, count: number, t) => {
	const response = await MemberColor.create({ member_id: memberId, color_id: colorId, sort_no: sortNo, count }, { transaction: t });
	return response;
};

/** @description 회원 푸시알림 상태 조회 */
export const pushOnOff = async (memberId: number) => {
	const memberData = await MemberSetting.findOne({ where: { member_id: memberId }, attributes: ['push_alarm'] });
	let response = null;

	if (memberData && memberData.push_alarm === 'Y') response = true;

	return response;
};
