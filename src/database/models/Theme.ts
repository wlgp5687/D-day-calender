'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize, DataTypes) => {
	class Theme extends Model {
		static associate(models) {}
	}

	Theme.init(
		// fields
		{
			id: field(DataTypes.INTEGER(11).UNSIGNED, 'PK', false, { unique: true, primaryKey: true, autoIncrement: true }),
			theme: field(DataTypes.STRING(50), '테마 정보', false),
		},
		{
			timestamps: true,
			createdAt: 'created_at',
			tableName: 'themes',
			comment: '태그',
			sequelize,
		},
	);

	return Theme;
};
