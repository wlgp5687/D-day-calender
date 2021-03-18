'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize, DataTypes) => {
	class Tag extends Model {
		static associate(models) {
			Tag.hasMany(models.ScheduleLoopTag, { as: 'schedule_loop_tag', foreignKey: 'tag_id', sourceKey: 'id', constraints: false });
			Tag.hasMany(models.MemberTag, { as: 'member_tag', foreignKey: 'tag_id', sourceKey: 'id', constraints: false });
		}
	}

	Tag.init(
		// fields
		{
			id: field(DataTypes.BIGINT.UNSIGNED, 'PK', false, { unique: true, primaryKey: true, autoIncrement: true }),
			tag: field(DataTypes.STRING(100), '태그명', false),
		},
		{
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			tableName: 'tags',
			comment: '태그',
			indexes: [{ name: 'ik_tag', fields: ['tag'] }],
			sequelize,
		},
	);

	return Tag;
};
