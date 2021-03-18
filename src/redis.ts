import redis from 'redis';

const redisClient = redis.createClient({ port: parseInt(process.env.REDIS_PORT, 10), host: process.env.REDIS_HOST });

/**
 * @description redis key, value 저장하기
 * @param {String} keyParam
 * @param {*} valueParam
 */
export const redisSetKeyValue = async (keyParam: string, valueParam) => {
	const value = JSON.stringify(valueParam);
	redisClient.set(keyParam, value);

	return null;
};

/**
 * @description redis key로 value 조회하기
 * @param {String} keyParam
 */
export const redisGetValue = async (keyParam: string) => {
	return new Promise((resolve, reject) => {
		redisClient.get(keyParam, (err, value) => {
			if (err) return reject(err);

			return resolve(JSON.parse(value));
		});
	});
};

/**
 * @description redis key 삭제
 * @param {String} keyParam
 */
export const redisDelKey = async (keyParam: string) => {
	redisClient.del(keyParam);

	return null;
};
