import * as scheduleService from '../../../services/schedule';

export default {
	Query: {
		/** @description 일정 인덱스로 상세 조회 */
		scheduleLoopById: async (root, args, context, info) => {
			const schedule = await scheduleService.getScheduleLoopById(args.schedule_loop_id);
			return schedule;
		},

		scheduleLoopsByMemberId: async (root, args, context, info) => {
			const memberId = context.decoded_token.data.member_id;

			const searchField = { start_time: args.start_time, end_time: args.end_time, is_display: args.is_display, calendar_is_deleted: 'N', schedule_loop_is_deleted: 'N' };

			const schedules = await scheduleService.getScheduleLoopsBymemberId(memberId, searchField);

			return schedules;
		},
		scheduleLoopsByTitleTag: async (root, args, context, info) => {
			const memberId = context.decoded_token.data.member_id;

			const schedules = await scheduleService.getScheduleLoopsByTitleTag(memberId, args.search_word);

			return schedules;
		},
	},

	Mutation: {
		postSchedule: async (root, args, context, info) => {
			const memberId = context.decoded_token.data.member_id;
			const scheduleData = {
				calendar_id: args.calendar_id,
				repeat: args.repeat,
				member_id: memberId,
				division: args.division,
				is_deleted: 'N',
				repeat_endtime: args.repeat_endtime ? args.repeat_endtime : '',
			};

			const scheduleLoopData = {
				title: args.title,
				start_time: args.start_time,
				end_time: args.end_time,
				color_id: args.color_id,
				memo: args.memo,
				alarm: args.alarm,
				tags: args.tags.split('|'),
			};
			const response = await scheduleService.postSchedule(scheduleData, scheduleLoopData);
			return response;
		},
		patchSchedule: async (root, args, context, info) => {
			const memberId = context.decoded_token.data.member_id;
			const scheduleLoopId = args.schedule_loop_id;
			const scheduleData = { calendar_id: args.calendar_id, repeat: args.repeat, repeat_endtime: args.repeat_endtime };
			const scheduleLoopData = {
				title: args.title,
				start_time: args.start_time,
				end_time: args.end_time,
				color_id: args.color_id,
				alarm: args.alarm,
				memo: args.memo,
				tags: args.tags ? args.tags.split('|') : args.tags,
			};
			const patchType = args.patchtype;
			const schedule = { scheduleData, scheduleLoopData, patchType };
			await scheduleService.patchSchedule(schedule, memberId, scheduleLoopId);
			return null;
		},
		deleteScheduleLoop: async (root, args, context, info) => {
			const memberId = context.decoded_token.data.member_id;

			const scheduleLoopData = { is_deleted: 'Y' };

			await scheduleService.deleteScheduleLoop(memberId, args.calendar_id, args.schedule_loop_id, args.delete_type, scheduleLoopData);

			return null;
		},
	},
};
