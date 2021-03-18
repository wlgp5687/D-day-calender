import fs from 'fs';
import path from 'path';
import { Sequelize, Op as sequelizeOp, QueryTypes as sequelizeQueryTypes } from 'sequelize';

const env = process.env.NODE_ENV || 'development';

const replication = process.env.MYSQL_REPLICATION || false;

const config = replication
	? {
			username: null,
			password: null,
			database: process.env.MYSQL_DATABASE,
			port: process.env.MYSQL_PORT,
			timezone: '+09:00',
			dialect: 'mysql',
			replication: {
				read: [],
				write: { host: process.env.MYSQL_HOST, username: process.env.MYSQL_USERNAME, password: process.env.MYSQL_PASSWORD },
			},
	  }
	: {
			username: process.env.MYSQL_USERNAME,
			password: process.env.MYSQL_PASSWORD,
			database: process.env.MYSQL_DATABASE,
			host: process.env.MYSQL_HOST,
			port: process.env.MYSQL_PORT,
			timezone: '+09:00',
			dialect: 'mysql',
	  };

if (replication) {
	if (process.env.MYSQL_HOST_READ_1) {
		config.replication.read = [{ host: process.env.MYSQL_HOST_READ_1, username: process.env.MYSQL_USERNAME_READ_1, password: process.env.MYSQL_PASSWORD_READ_1 }];
	}
}

export const sequelize = new Sequelize(config.database, config.username, config.password, config as any);

export const transaction = sequelize.transaction.bind(sequelize);

export const Op = sequelizeOp;

export const QueryTypes = sequelizeQueryTypes;

const models = {};

const importDirectory = (directory: string) => {
	fs.readdirSync(directory)
		.filter((file) => file.endsWith(env === 'production' ? '.js' : '.ts'))
		.forEach((file) => {
			const name = file.replace(env === 'production' ? /\.js$/ : /\.ts$/, '');
			const model = sequelize.import(path.join(directory, file));
			models[name] = model;
		});
};

const importFile = (filepath: string) => {
	const name = path.basename(filepath).replace(env === 'production' ? /\.js$/ : /\.ts$/, '');
	const model = sequelize.import(filepath);
	models[name] = model;
};

const associate = () => {
	// eslint-disable-next-line consistent-return
	fs.readdirSync(path.join(__dirname, 'models'), { withFileTypes: true }).forEach((file) => {
		if (file.isDirectory()) return importDirectory(path.join(__dirname, 'models', file.name));
		if (file.name.endsWith(env === 'production' ? '.js' : '.ts')) importFile(path.join(__dirname, 'models', file.name));
	});

	Object.keys(models)
		.filter((name) => 'associate' in models[name])
		.forEach((name) => models[name].associate(models));

	console.log('- associated database models...');
};

export const getModel = (name: string) => {
	if (name in models) return models[name];
	return sequelize.import(path.join(__dirname, 'models', env === 'production' ? `${name}.js` : `${name}.ts`));
};

export const field = (type: any, comment: string, allowNull: boolean = true, options = {}) => {
	return { type, comment, allowNull, ...options };
};

associate();
