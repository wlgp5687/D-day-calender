'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize, DataTypes) => {
	class Admin extends Model {
		static associate(models) {
			Admin.belongsTo(models.Member, { as: 'member', foreignKey: 'member_id', targetKey: 'id', constraints: false });
		}
	}

	Admin.init(
		// fields
		{
			id: field(DataTypes.BIGINT.UNSIGNED, 'PK', false, { unique: true, primaryKey: true, autoIncrement: true }),
			member_id: field(DataTypes.BIGINT.UNSIGNED, 'members.id(FK)', false),
			user_id: field(DataTypes.STRING(50), '아이디', false, { unique: true }),
			password: field(DataTypes.STRING(255), '비밀번호', false),
			name: field(DataTypes.STRING(50), '이름', false),
			email: field(DataTypes.STRING(100), '이메일'),
		},
		// options
		{
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			tableName: 'admins',
			comment: '관리자 기본정보',
			indexes: [{ fields: ['user_id'] }],
			sequelize,
		},
	);

	return Admin;
};
