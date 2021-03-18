import * as memberService from '../../../services/member';
import * as calendarService from '../../../services/calendar';
import * as versionService from '../../../services/version';

export default {
	Query: {
		member: async (root, args, context, info) => {
			const memberId = context.decoded_token.data.member_id;
			const member = await memberService.getMemberById(memberId);
			return member;
		},

		/** @description */
		membersByEmail: async (_, args, context, __) => {
			const members = await memberService.getMembersByEmail(args.email);
			return members;
		},
		isExistMemberEmail: async (root, args, { req }, info) => {
			const isexistMemberEmail = await memberService.isExistMemberEmail(args.email);
			return isexistMemberEmail;
		},
	},
	Mutation: {
		/** @description 달력 사용자 초대 */
		inviteCalendarMember: async (_, args, context, __) => {
			const memberIds = args.member_id.split('|');
			const calendarId = args.calendar_id;

			const memberCalendarData = { calendar_id: calendarId, is_master: 'N', is_display: 'Y', status: 'REQUEST' };

			const members = await calendarService.inviteCalendarMember(memberIds, memberCalendarData);

			return members;
		},
		/** @description 달력 사용자 내보내기 */
		banCalendarMember: async (_, args, context, __) => {
			// 마스터 권한 확인
			const isMaster = await calendarService.getIsMasterByMemberId(context.decoded_token.data.member_id, args.calendar_id);
			if (!isMaster) throw new Error('Invalid calendar auth');

			await memberService.banCalendarMember(args.member_id, args.calendar_id);

			return null;
		},
		/** @description 회원 설정 수정 */
		patchMemberSetting: async (root, args, context, info) => {
			const memberId = context.decoded_token.data.member_id;
			const memberSettingData = {
				version_id: args.version ? await versionService.getVersionIdByVersionName(args.version) : undefined,
				theme_id: args.theme_id,
				start_display: args.start_display,
				start_day: args.start_day,
				holiday_display: args.holiday_display,
				tag_display: args.tag_display,
				push_alarm: args.push_alarm,
				alarm: args.alarm,
			};

			await memberService.patchMemberSetting(memberSettingData, memberId);

			return null;
		},
		/** @description 회원 정보 수정 */
		patchMember: async (root, args, context, info) => {
			const memberId = context.decoded_token.data.member_id;
			const memberData = { password: args.password, nickname: args.nickname };

			await memberService.patchMember(memberData, memberId);

			return null;
		},
		uploadProfile: async (root, args, context, info) => {
			const memberId = context.decoded_token.data.member_id;
			const file = await args.file;

			await memberService.uploadProfile(file, memberId);

			return null;
		},
	},
};
