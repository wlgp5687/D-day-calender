'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize: any, DataTypes: any) => {
	class PushAlarm extends Model {
		static associate(models) {
			PushAlarm.belongsTo(models.ScheduleLoop, { as: 'schedule_loop', foreignKey: 'schedule_loop_id', targetKey: 'id', constraints: false });
			PushAlarm.belongsTo(models.FirebaseToken, { as: 'firebase_token', foreignKey: 'firebase_token_id', targetKey: 'id', constraints: false });
		}
	}

	PushAlarm.init(
		// fields
		{
			id: field(DataTypes.BIGINT.UNSIGNED, 'PK', false, { unique: true, primaryKey: true, autoIncrement: true }),
			firebase_token_id: field(DataTypes.BIGINT.UNSIGNED, 'firebase_token.id(fk)', false),
			schedule_loop_id: field(DataTypes.BIGINT.UNSIGNED, 'schedule_loop.id(fk)', false),
			category: field(DataTypes.ENUM('PATCH', 'ALARM'), '알림 카테고리', false),
			title: field(DataTypes.STRING(100), '알림 제목', false),
			body: field(DataTypes.STRING(255), '알림 내용', false),
		},
		// options
		{
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			tableName: 'push_alarms',
			comment: '푸시알람 목록',
			sequelize,
		},
	);

	return PushAlarm;
};
