'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize, DataTypes) => {
	class MemberExternal extends Model {
		static associate(models) {
			MemberExternal.belongsTo(models.Member, { as: 'member', foreignKey: 'member_id', targetKey: 'id', constraints: false });
		}
	}

	MemberExternal.init(
		// fields
		{
			member_id: field(DataTypes.BIGINT.UNSIGNED, 'members.id(fk', false),
			channel: field(DataTypes.ENUM('NAVER', 'GOOGLE'), '연동 사이트', false),
			token: field(DataTypes.STRING(255), '연동토큰', false, { defaultValue: '' }),
		},
		// options
		{
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			tableName: 'member_externals',
			comment: '회원 외부연동',
			indexes: [
				{ unique: true, fields: ['member_id', 'join_site'] },
				{ unique: true, fields: ['join_site', 'token'] },
			],
			sequelize,
		},
	);

	MemberExternal.removeAttribute('id');

	return MemberExternal;
};
