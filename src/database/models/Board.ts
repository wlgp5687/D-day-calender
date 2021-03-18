'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize, DataTypes) => {
	class Board extends Model {
		static associate(models) {
			Board.belongsTo(models.Member, { as: 'member', foreignKey: 'member_id', targetKey: 'id', constraints: false });
		}
	}

	Board.init(
		// fields
		{
			id: field(DataTypes.BIGINT.UNSIGNED, '게시물 아이디', false, { unique: true, primaryKey: true, autoIncrement: true }),
			member_id: field(DataTypes.BIGINT.UNSIGNED, 'members.id(fk)', false),
			board_type: field(DataTypes.ENUM('NOTICE', 'QNA'), '게시물 유형', false, { defaultValue: 'NOTICE' }),
			title: field(DataTypes.STRING(100), '제목', false),
			contents: field(DataTypes.TEXT, '내용', false),
			is_deleted: field(DataTypes.ENUM('Y', 'N'), '삭제여부', false, { defaultValue: 'N' }),
		},
		// options
		{
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			tableName: 'boards',
			comment: '게시물',
			indexes: [{ name: 'boards_member_id', fields: ['member_id'] }],
			sequelize,
		},
	);

	return Board;
};
