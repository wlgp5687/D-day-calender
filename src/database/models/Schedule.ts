'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize, DataTypes) => {
	class Schedule extends Model {
		static associate(models) {
			Schedule.hasMany(models.ScheduleLoop, { as: 'schedule_loop', foreignKey: 'schedule_id', sourceKey: 'id', constraints: false });
			Schedule.belongsTo(models.Member, { as: 'member', foreignKey: 'member_id', targetKey: 'id', constraints: false });
			Schedule.belongsTo(models.Calendar, { as: 'calendar', foreignKey: 'calendar_id', targetKey: 'id', constraints: false });
		}
	}

	Schedule.init(
		// fields
		{
			id: field(DataTypes.BIGINT.UNSIGNED, 'PK', false, { unique: true, primaryKey: true, autoIncrement: true }),
			calendar_id: field(DataTypes.BIGINT.UNSIGNED, 'calendars.id(fk)', false),
			member_id: field(DataTypes.BIGINT.UNSIGNED, 'members.id(fk)', false),
			repeat: field(DataTypes.ENUM('N', 'D', 'W', 'M', 'Y'), '반복 날짜 설정', false, { defaultValue: 'N' }),
			repeat_endtime: field(DataTypes.DATE, '반복 종료 일자', true, { defaultValue: null }),
			division: field(DataTypes.ENUM('WEB', 'APP'), '일정 웹앱 여부', false, { defaultValue: 'APP' }),
			is_deleted: field(DataTypes.ENUM('Y', 'N'), '삭제 여부', false, { defaultValue: 'N' }),
		},
		{
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			tableName: 'schedules',
			comment: '일정',
			indexes: [
				{ name: 'ik_schedules_calendar_id', fields: ['calendar_id'] },
				{ name: 'ik_schedules_member_id', fields: ['member_id'] },
			],
			sequelize,
		},
	);

	return Schedule;
};
