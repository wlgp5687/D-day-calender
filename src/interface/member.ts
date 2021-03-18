export interface PatchMemberCalendarAttr {
	calendar_id: number;
	member_id: number;
	is_master: string;
}

export interface PatchMemberCalendarData {
	permission: string;
}

export interface GetMemberCalendar {
	member_id: number;
	is_default: string;
	is_secret: string;
	is_deleted: string;
}

export interface MemberCalendarData {
	id: number;
	member_id: number;
	calendar_id: number;
	status: string;
	is_master: string;
	is_display: string;
	created_at: Date;
	updated_at: Date;
	calendars_id: number;
	calendars_title: string;
	calendars_is_deleted: string;
	calendars_write_auth: string;
	calendars_is_secret: string;
	calendars_is_default: string;
	calendars_created_at: Date;
	calendars_updated_at: Date;
}
