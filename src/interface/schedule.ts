export interface ScheduleLoopParam {
	id?: number;
	schedule_id?: number | any;
	title?: string;
	start_time?: string;
	end_time?: string;
	color_id?: number;
	is_deleted?: string;
}

export interface GetScheduleLoopsBymemberId {
	schedule_loop_is_deleted: string;
	calendar_is_deleted?: string;
	is_display?: string;
	start_time?: string;
	end_time?: string;
}

export interface getScheduleLoopsByTitleTag {
	start_time: string;
	schedule_loop_ids: string;
	schedule_loop_schedule_ids: string;
	schedule_loop_titles: string;
	schedule_loop_start_times: string;
	schedule_loop_end_times: string;
	schedule_loop_color_ids: string;
	schedule_loop_is_deleted: string;
	schedule_loop_created_at: string;
	schedule_loop_updated_at: string;
}

export interface postScheduleFirebaseData {
	title: string;
	body: string;
	token: string[];
	tokenids: number[];
}

export interface Job {
	job: any;
	callback: any;
	name: any;
	trackInvocation: any;
	stopTrackginInvocation: any;
	triggeredJobs: any;
	setTriggeredJobs: any;
	cancel: any;
	cancelNext: any;
	reschedule: any;
	nexInvocation: any;
	pendingInvocations: any;
}
