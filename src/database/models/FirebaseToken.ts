'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize, DataTypes) => {
	class FirebaseToken extends Model {
		static associate(models) {
			FirebaseToken.belongsTo(models.Member, { as: 'member', foreignKey: 'member_id', targetKey: 'id', constraints: false });
		}
	}

	FirebaseToken.init(
		// fields
		{
			id: field(DataTypes.BIGINT.UNSIGNED, 'PK', false, { unique: true, primaryKey: true, autoIncrement: true }),
			member_id: field(DataTypes.BIGINT.UNSIGNED, 'members.id(fk', false),
			token: field(DataTypes.STRING(255), '클라이언트 토큰', false),
			division: field(DataTypes.ENUM('WEB', 'APP'), '웹앱 여부', false, { defaultValue: 'APP' }),
			device_name: field(DataTypes.STRING(100), '기기명', true),
		},
		// options
		{
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			tableName: 'firebase_tokens',
			comment: '파이어베이스 토큰',
			indexes: [{ name: 'uk_firebase_tokens_member_id_token', unique: true, fields: ['member_id', 'token'] }],
			sequelize,
		},
	);

	return FirebaseToken;
};
