'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize: any, DataTypes: any) => {
	class Alarm extends Model {
		static associate(models: any) {
			Alarm.belongsTo(models.ScheduleLoop, { as: 'schedule_loop', foreignKey: 'schedule_loop_id', targetKey: 'id', constraints: false });
		}
	}

	Alarm.init(
		// fields
		{
			id: field(DataTypes.BIGINT.UNSIGNED, 'PK', false, { unique: true, primaryKey: true, autoIncrement: true }),
			schedule_loop_id: field(DataTypes.BIGINT.UNSIGNED, 'schedule_loops.id(fk)', false),
			alarm: field(DataTypes.ENUM('NONE', '0', '5', '60', '24'), '알람 설정', false),
			alarm_at: field(DataTypes.DATE, '알람 시간', true),
		},
		// options
		{
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			tableName: 'alarms',
			comment: '알람',
			indexes: [{ name: 'ik_alarms_schedule_loop_id', fields: ['schedule_loop_id'] }],
			sequelize,
		},
	);

	return Alarm;
};
