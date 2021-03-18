'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize, DataTypes) => {
	class ScheduleLoopTag extends Model {
		static associate(models) {
			ScheduleLoopTag.belongsTo(models.ScheduleLoop, { as: 'schedule_loop', foreignKey: 'schedule_loop_id', targetKey: 'id', constraints: false });
			ScheduleLoopTag.belongsTo(models.Tag, { as: 'tag', foreignKey: 'tag_id', targetKey: 'id', constraints: false });
		}
	}

	ScheduleLoopTag.init(
		// fields
		{
			schedule_loop_id: field(DataTypes.BIGINT.UNSIGNED, 'schedules.id(fk)', false),
			tag_id: field(DataTypes.BIGINT.UNSIGNED, 'tags.id(fk)', false),
		},
		{
			timestamps: false,
			tableName: 'schedule_loop_tags',
			comment: '일정 태그',
			indexes: [
				{ name: 'ik_schedule_loop_tags_ibfk_1', fields: ['schedule_loop_id'] },
				{ name: 'ik_schedule_loop_tags_ibfk_2', fields: ['tag_id'] },
				{ name: 'uk_schedule_loop_tags', fields: ['schedule_loop_id', 'tag_id'], unique: true },
			],
			sequelize,
		},
	);

	ScheduleLoopTag.removeAttribute('id');

	return ScheduleLoopTag;
};
