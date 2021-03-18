'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize, DataTypes) => {
	class Color extends Model {
		static associate(models) {
			Color.hasMany(models.ScheduleLoop, { as: 'schedule_loop', foreignKey: 'color_id', sourceKey: 'id', constraints: false });
			Color.hasMany(models.MemberColor, { as: 'member_color', foreignKey: 'color_id', sourceKey: 'id', constraints: false });
		}
	}

	Color.init(
		// fields
		{
			id: field(DataTypes.INTEGER(11).UNSIGNED, 'PK', false, { unique: true, primaryKey: true, autoIncrement: true }),
			color: field(DataTypes.STRING(50), '색상', false),
			is_premium: field(DataTypes.ENUM('Y', 'N'), '프리미엄 색', false, { defaultValue: 'N' }),
		},
		{
			timestamps: false,
			tableName: 'colors',
			comment: '색상',
			indexes: [],
			sequelize,
		},
	);

	return Color;
};
