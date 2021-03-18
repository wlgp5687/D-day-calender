import * as memberService from '../../../services/member';
import * as calendarService from '../../../services/calendar';
import * as colorService from '../../../services/color';
import * as scheduleService from '../../../services/schedule';
import * as memberInterface from '../../../interface/member';

export default {
	Member: {
		member_external: async (root) => {
			const memberExternal = await memberService.getMemberExternalById(root.id);
			return memberExternal;
		},
		/** @description 참여 달력 목록 조회 */
		member_calendar: async (root, args) => {
			const searchField = <memberInterface.GetMemberCalendar>{ member_id: root.id, is_secret: args.is_secret, is_deleted: 'N' };
			if (args.is_default) searchField.is_default = args.is_default;

			const memberCalendar = await memberService.getMemberCalendarByMemberId(searchField);
			return memberCalendar;
		},
		member_setting: async (root) => {
			const memberCalendar = await memberService.getMemberSettingById(root.id);
			return memberCalendar;
		},
		/** @description 회원 태그 목록 조회 */
		member_tag: async (root) => {
			const memberTag = await memberService.getMemberTagsByMemberId(root.id);
			return memberTag;
		},
		/** @description 회원 색상 목록 조회 */
		member_color: async (root) => {
			const memberColor = await memberService.getMembrColorsByMemberId(root.id);
			return memberColor;
		},
	},

	Calendar: {
		/** @description 달력 참여자 목록 조회 */
		calendar_member: async (root) => {
			const calendarShare = await calendarService.getCalendarMemberByCalendarId(root.id);

			return calendarShare;
		},
	},

	Board: {
		member: async (root) => {
			const member = await memberService.getMemberById(root.member_id);

			return member;
		},
	},

	Schedule: {
		schedule_loop: async (root) => {
			const scheduleLoops = await scheduleService.getScheduleLoopsByScheduleId({ schedule_id: root.id, is_deleted: 'N' });

			return scheduleLoops;
		},
	},

	ScheduleLoop: {
		color: async (root) => {
			const color = await colorService.getColorById(root.color_id);

			return color;
		},
		memo: async (root) => {
			const memo = await scheduleService.getMemoByLoopId(root.id);

			return memo;
		},
		tag: async (root) => {
			const tags = await scheduleService.getScheduleLoopTagsByScheduleLoopId(root.id);

			return tags;
		},
		alarm: async (root) => {
			const alarm = await scheduleService.getAlarmByLoopId(root.id);

			return alarm;
		},
	},
};
