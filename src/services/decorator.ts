export const doAsync = (fn) => (req, res, next) => fn(req, res, next).catch(next);

export const throwErr = (message, statusCode) => {
	const err = <any>new Error(message);
	err.status = statusCode;
	throw err;
};
