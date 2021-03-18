import * as authService from './auth';
import * as jwtInterface from '../interface/jwt';
import { throwErr } from './decorator';

const graphqlContext = async (req) => {
	const accessToken = await authService.getJwtToken(req);
	const decodedToken = <jwtInterface.DecodeToken>await authService.decodeAccessToken(accessToken, false);

	if (!decodedToken.data.member_id) throwErr('Invalid Login', 401);

	console.log(decodedToken);

	return decodedToken;
};

export default graphqlContext;
