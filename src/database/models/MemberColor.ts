'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize, DataTypes) => {
	class MemberColor extends Model {
		static associate(models) {
			MemberColor.belongsTo(models.Member, { as: 'member', foreignKey: 'member_id', targetKey: 'id', constraints: false });
			MemberColor.belongsTo(models.Color, { as: 'color', foreignKey: 'color_id', targetKey: 'id', constraints: false });
		}
	}

	MemberColor.init(
		// fields
		{
			id: field(DataTypes.BIGINT.UNSIGNED, 'PK', false, { unique: true, primaryKey: true, autoIncrement: true }),
			member_id: field(DataTypes.BIGINT.UNSIGNED, 'members.id(fk)', false),
			color_id: field(DataTypes.INTEGER(11).UNSIGNED, 'colors.id(fk)', false),
			sort_no: field(DataTypes.INTEGER(11).UNSIGNED, '기본 정렬 순서', false),
			count: field(DataTypes.INTEGER(11).UNSIGNED, '색상 사용 횟수', false),
		},
		{
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			tableName: 'member_colors',
			comment: '회원 색상 카운트',
			indexes: [
				{ name: 'ik_member_color_member_id', fields: ['member_id'] },
				{ name: 'ik_member_color_color_id', fields: ['color_id'] },
				{ name: 'uk_member_color_member_color_id', fields: ['member_id', 'color_id'], unique: true },
			],
			sequelize,
		},
	);

	return MemberColor;
};
