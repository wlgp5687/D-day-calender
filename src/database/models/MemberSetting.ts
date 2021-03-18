'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize, DataTypes) => {
	class MemberSetting extends Model {
		static associate(models) {
			MemberSetting.belongsTo(models.Member, { as: 'member', foreignKey: 'member_id', targetKey: 'id', constraints: false });
			MemberSetting.belongsTo(models.Theme, { as: 'theme', foreignKey: 'theme_id', targetKey: 'id', constraints: false });
			MemberSetting.belongsTo(models.Version, { as: 'version', foreignKey: 'version_id', targetKey: 'id', constraints: false });
		}
	}

	MemberSetting.init(
		// fields
		{
			member_id: field(DataTypes.BIGINT.UNSIGNED, 'members.id(fk)', false),
			theme_id: field(DataTypes.INTEGER(11).UNSIGNED, 'themes.id(fk)', false),
			version_id: field(DataTypes.INTEGER(11).UNSIGNED, 'versions.id(fk)', false),
			start_display: field(DataTypes.ENUM('MONTH', 'WEEK'), '시작화면설정', false, { defaultValue: 'MONTH' }),
			start_day: field(DataTypes.ENUM('MON','TUE','WED','THU','FRI','SAT','SUN'), '시작요일설정', false, { defaultValue: 'SUN' }),
            holiday_display: field(DataTypes.ENUM('Y', 'N'), '주말 표시', false, { defaultValue: 'Y' }),
            tag_display: field(DataTypes.ENUM('Y', 'N'), '태그 표시', false, { defaultValue: 'Y' }),
            push_alarm: field(DataTypes.ENUM('Y', 'N'), '푸시 알림', false, { defaultValue: 'Y' }),
			alarm: field(DataTypes.ENUM('Y', 'N'), '알람', false, { defaultValue: 'Y' }),
		},
		{
			timestamps: false,
			tableName: 'member_settings',
			comment: '회원 개인 설정',
			indexes: [
				{ name: 'ik_member_settings_member_id', fields: ['member_id'] },
				{ name: 'ik_member_settings_theme_id', fields: ['theme_id'] },
				{ name: 'ik_member_settings_version_id', fields: ['version_id'] },
			],
			sequelize,
		},
	);

	MemberSetting.removeAttribute('id');

	return MemberSetting;
};
