'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize, DataTypes) => {
	class MemberCalendar extends Model {
		static associate(models) {
			MemberCalendar.belongsTo(models.Member, { as: 'member', foreignKey: 'member_id', targetKey: 'id', constraints: false });
			MemberCalendar.belongsTo(models.Calendar, { as: 'calendar', foreignKey: 'calendar_id', targetKey: 'id', constraints: false });
		}
	}

	MemberCalendar.init(
		// fields
		{
			id: field(DataTypes.BIGINT.UNSIGNED, 'PK', false, { unique: true, primaryKey: true, autoIncrement: true }),
			member_id: field(DataTypes.BIGINT.UNSIGNED, 'members.id(fk)', false),
			calendar_id: field(DataTypes.BIGINT.UNSIGNED, 'calendars.id(fk)', false),
			is_master: field(DataTypes.ENUM('Y', 'N'), '달력 주인 여부', false, { defaultValue: 'Y' }),
			is_display: field(DataTypes.ENUM('Y', 'N'), '캘린더 표기 여부', false, { defaultValue: 'N' }),
			status: field(DataTypes.ENUM('REQUEST','JOIN'), '상태', false, { defaultValue: 'REQUEST' }),
		},
		{
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			tableName: 'member_calendars',
			comment: '회원 소유 달력',
			indexes: [
				{ name: 'ik_member_calendars_member_id', fields: ['member_id'] },
				{ name: 'ik_member_calendars_calendar_id', fields: ['calendar_id'] },
				{ name: 'uk_member_calendars_member_calendar_id', fields: ['member_id', 'calendar_id'], unique: true },
			],
			sequelize,
		},
	);

	return MemberCalendar;
};
