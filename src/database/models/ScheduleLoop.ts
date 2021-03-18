'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize, DataTypes) => {
	class ScheduleLoop extends Model {
		static associate(models) {
			ScheduleLoop.hasMany(models.ScheduleLoopTag, { as: 'schedule_loop_tag', foreignKey: 'schedule_loop_id', sourceKey: 'id', constraints: false });
			ScheduleLoop.hasOne(models.ScheduleLoopMemo, { as: 'schedule_loop_memo', foreignKey: 'schedule_loop_id', sourceKey: 'id', constraints: false });
			ScheduleLoop.belongsTo(models.Schedule, { as: 'schedule', foreignKey: 'schedule_id', targetKey: 'id', constraints: false });
			ScheduleLoop.belongsTo(models.Color, { as: 'color', foreignKey: 'color_id', targetKey: 'id', constraints: false });
		}
	}

	ScheduleLoop.init(
		// fields
		{
			id: field(DataTypes.BIGINT.UNSIGNED, 'PK', false, { unique: true, primaryKey: true, autoIncrement: true }),
			schedule_id: field(DataTypes.BIGINT.UNSIGNED, 'schedules.id(fk)', false),
			title: field(DataTypes.STRING(100), '일정 제목', false),
			start_time: field(DataTypes.DATE, '일정 시작 날짜 및 시간', false),
			end_time: field(DataTypes.DATE, '일정 종료 날짜 및 시간', false),
			color_id: field(DataTypes.INTEGER(11).UNSIGNED, 'colors.id(fk)', false),
			is_deleted: field(DataTypes.ENUM('Y', 'N'), '삭제 여부', false, { defaultValue: 'N' }),
		},
		{
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			tableName: 'schedule_loops',
			comment: '반복 일정',
			indexes: [
				{ name: 'ik_color_id', fields: ['color_id'] },
				{ name: 'ik_schedule_id', fields: ['schedule_id'] },
			],
			sequelize,
		},
	);

	return ScheduleLoop;
};
