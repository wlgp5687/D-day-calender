'use strict'; // eslint-disable-line strict, lines-around-directive

import { Model } from 'sequelize';
import { field } from '../index';

export default (sequelize, DataTypes) => {
	class Version extends Model {
		static associate(models) {}
	}

	Version.init(
		// fields
		{
			id: field(DataTypes.INTEGER(11).UNSIGNED, 'PK', false, { unique: true, primaryKey: true, autoIncrement: true }),
			name: field(DataTypes.STRING(50), '버전 정보', false),
			update_require: field(DataTypes.ENUM('Y', 'N'), '업데이트 강제여부', false, { defaultValue: 'N' }),
		},
		{
			timestamps: true,
			createdAt: 'created_at',
			tableName: 'versions',
			comment: '버전',
			sequelize,
		},
	);

	return Version;
};
