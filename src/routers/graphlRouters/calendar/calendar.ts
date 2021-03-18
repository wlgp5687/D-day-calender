import * as calendarService from '../../../services/calendar';

export default {
	Query: {
		calendar: async (root, args, context, info) => {
			const response = await calendarService.getCalendarById(args.calendar_id);

			return response;
		},
	},
	Mutation: {
		postCalendar: async (root, args, context, info) => {
			const memberId = context.decoded_token.data.member_id;
			const calendarData = {
				title: args.title,
				member_id: memberId,
				is_deleted: 'N',
				is_secret: 'Y',
				is_default: 'N',
				write_auth: args.write_auth,
			};

			const memberCalendarData = {
				member_id: memberId,
				is_master: 'Y',
				is_display: 'Y',
				status: 'JOIN',
			};
			const response = await calendarService.postCalendar(calendarData, memberCalendarData);

			return response;
		},
		deleteCalendar: async (root, args, context, info) => {
			const memberId = context.decoded_token.data.member_id;
			const calendarId = args.calendar_id;

			await calendarService.deleteCalendar(memberId, calendarId);

			return null;
		},
		patchCalendar: async (root, args, context, info) => {
			const memberId = context.decoded_token.data.member_id;
			const calendarId = args.calendar_id;
			const calendarData = { title: args.title, write_auth: args.write_auth };
			const memberCalendarData = { is_display: args.is_display };

			const calendar = { calendar_data: calendarData, member_calendar_data: memberCalendarData };
			await calendarService.patchCalendar(calendar, memberId, calendarId);

			return null;
		},
		joinCalendar: async (root, args, context, info) => {
			const memberId = context.decoded_token.data.member_id;

			await calendarService.patchCalendarShare(args.calendar_id, memberId, 'JOIN');

			return null;
		},
	},
};
