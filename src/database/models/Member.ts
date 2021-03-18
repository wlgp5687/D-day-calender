'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize: any, DataTypes: any) => {
	class Member extends Model {
		static associate(models: any) {
			Member.hasOne(models.MemberExternal, { as: 'external', foreignKey: 'member_id', sourceKey: 'id', constraints: false });
			Member.hasMany(models.MemberCalendar, { as: 'member_calendar', foreignKey: 'member_id', sourceKey: 'id', constraints: false });
			Member.hasMany(models.MemberColor, { as: 'member_color', foreignKey: 'member_id', sourceKey: 'id', constraints: false });
			Member.hasMany(models.MemberTag, { as: 'member_tag', foreignKey: 'member_id', sourceKey: 'id', constraints: false });
			Member.hasMany(models.Calendar, { as: 'calendar', foreignKey: 'member_id', sourceKey: 'id', constraints: false });
			Member.hasMany(models.Schedule, { as: 'schedule', foreignKey: 'member_id', sourceKey: 'id', constraints: false });
			Member.hasMany(models.FirebaseToken, { as: 'firebase_token', foreignKey: 'member_id', sourceKey: 'id', constraints: false });
		}
	}

	Member.init(
		// fields
		{
			id: field(DataTypes.BIGINT.UNSIGNED, 'PK', false, { unique: true, primaryKey: true, autoIncrement: true }),
			user_id: field(DataTypes.STRING(50), '아이디', false, { unique: true }),
			password: field(DataTypes.STRING(255), '비밀번호', false),
			passcode: field(DataTypes.STRING(255), '임시 비밀번호', true),
			nickname: field(DataTypes.STRING(50), '닉네임', false, { unique: true }),
			email: field(DataTypes.STRING(100), '닉네임', false, { unique: true }),
			profile: field(DataTypes.STRING(255), '프로필 이미지', false, { defaultValue: '' }),
			join_site: field(DataTypes.ENUM('NAVER', 'GOOGLE', 'NORMAL'), '가입경로', false, { defaultValue: 'NORMAL' }),
		},
		// options
		{
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			tableName: 'members',
			comment: '회원',
			indexes: [],
			sequelize,
		},
	);

	return Member;
};
