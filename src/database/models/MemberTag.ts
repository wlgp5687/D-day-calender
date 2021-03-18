'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize, DataTypes) => {
	class MemberTag extends Model {
		static associate(models) {
			MemberTag.belongsTo(models.Member, { as: 'member', foreignKey: 'member_id', targetKey: 'id', constraints: false });
			MemberTag.belongsTo(models.Tag, { as: 'tag', foreignKey: 'tag_id', targetKey: 'id', constraints: false });
		}
	}

	MemberTag.init(
		// fields
		{
			member_id: field(DataTypes.BIGINT.UNSIGNED, 'members.id(fk)', false),
			tag_id: field(DataTypes.BIGINT.UNSIGNED, 'tags.id(fk)', false),
		},
		{
			timestamps: false,
			tableName: 'member_tags',
			comment: '회원 태그',
			indexes: [
				{ name: 'ik_member_tags_member_id', fields: ['member_id'] },
				{ name: 'ik_member_tags_tag_id', fields: ['tag_id'] },
				{ name: 'uk_member_tags_member_tag_id', fields: ['member_id', 'tag_id'], unique: true },
			],
			sequelize,
		},
	);

	MemberTag.removeAttribute('id');

	return MemberTag;
};
