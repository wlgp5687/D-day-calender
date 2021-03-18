'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize, DataTypes) => {
	class ScheduleLoopMemo extends Model {
		static associate(models) {
			ScheduleLoopMemo.belongsTo(models.ScheduleLoop, { as: 'schedule_loop', foreignKey: 'schedule_loop_id', targetKey: 'id', constraints: false });
		}
	}

	ScheduleLoopMemo.init(
		// fields
		{
			schedule_loop_id: field(DataTypes.BIGINT.UNSIGNED, 'schedule_loops.id(fk)', false),
			memo: field(DataTypes.TEXT, '메모', false),
		},
		{
			timestamps: false,
			tableName: 'schedule_loop_memos',
			comment: '반복 메모',
			indexes: [{ name: 'ik_shcedule_memos_schedule_loop_id', fields: ['schedule_loop_id'] }],
			sequelize,
		},
	);

	ScheduleLoopMemo.removeAttribute('id');

	return ScheduleLoopMemo;
};