'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize, DataTypes) => {
	class Calendar extends Model {
		static associate(models) {
			Calendar.hasMany(models.Schedule, { as: 'schedule', foreignKey: 'calendar_id', sourceKey: 'id', constraints: false });
			Calendar.belongsTo(models.Member, { as: 'member', foreignKey: 'member_id', targetKey: 'id', constraints: false });
		}
	}

	Calendar.init(
		// fields
		{
			id: field(DataTypes.BIGINT.UNSIGNED, 'PK', false, { unique: true, primaryKey: true, autoIncrement: true }),
			member_id: field(DataTypes.BIGINT.UNSIGNED, 'members.id(fk)', false),
			title: field(DataTypes.STRING(100), '달력 제목', false, { defaultValue: '기본 달력' }),
			is_deleted: field(DataTypes.ENUM('Y', 'N'), '삭제 여부', false, { defaultValue: 'N' }),
			write_auth: field(DataTypes.ENUM('MASTER', 'EVERYONE'), '작성 권한', false, { defaultValue: 'MASTER' }),
			is_secret: field(DataTypes.ENUM('Y', 'N'), '공개 여부', false, { defaultValue: 'Y' }),
			is_default: field(DataTypes.ENUM('Y', 'N'), '기본달력 여부', false, { defaultValue: 'Y' }),
		},
		{
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			tableName: 'calendars',
			comment: '달력',
			indexes: [{ name: 'ik_calendars_member_id', fields: ['member_id'] }],
			sequelize,
		},
	);

	return Calendar;
};
