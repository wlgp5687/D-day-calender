'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize: any, DataTypes: any) => {
	class NoticePushAlarm extends Model {
		static associate(models) {
			NoticePushAlarm.belongsTo(models.Board, { as: 'board', foreignKey: 'board_id', targetKey: 'id', constraints: false });
		}
	}

	NoticePushAlarm.init(
		// fields
		{
			id: field(DataTypes.BIGINT.UNSIGNED, 'PK', false, { unique: true, primaryKey: true, autoIncrement: true }),
			board_id: field(DataTypes.BIGINT.UNSIGNED, 'board.id(fk)', false),
			title: field(DataTypes.STRING(100), '알림 제목', false),
			body: field(DataTypes.STRING(255), '알림 내용', false),
		},
		// options
		{
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			tableName: 'notice_push_alarms',
			comment: '공지 푸시알람 목록',
			sequelize,
		},
	);

	return NoticePushAlarm;
};
