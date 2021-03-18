import { doAsync, throwErr } from '../services/decorator';
import * as authServices from '../services/auth';
import * as memberService from '../services/member';
import * as firebaseService from '../services/firebase';
import * as commonComponent from '../component/common';
import * as naverService from '../services/oauth/naver';
import * as googleService from '../services/oauth/google';
import * as emailService from '../services/email';
import * as jwtInterface from '../interface/jwt';
import { redisDelKey } from '../redis';

export default (app: any) => {
	const router = app;

	/** @description status check */
	router.get(
		'/status',
		doAsync(async (req, res) => {
			return res.send('OK');
		}),
	);

	/** @todo 토큰 기존 토큰 유지하고 내용 추가해서 재발급하도록 수정 */

	/** @description 토큰 발급 */
	router.get(
		'/v1/auth/jwt/token',
		doAsync(async (req, res) => {
			const csrfToken = req.csrfToken();
			const token = await authServices.generateToken({ member_id: null }, csrfToken, false);
			return res.json(token);
		}),
	);

	/** @description 토큰 갱신 */
	router.get(
		'/v1/auth/jwt/refresh',
		doAsync(async (req, res) => {
			const accessToken = await authServices.getJwtToken(req);
			const refreshToken = await authServices.getRefreshToken(req);
			const csrfToken = req.csrfToken();
			const token = await authServices.refreshToken(accessToken, refreshToken, csrfToken);
			return res.json(token);
		}),
	);

	/** @description */
	router.get(
		'/v1/auth/jwt/access-check',
		doAsync(async (req, res) => {
			const accessToken = await authServices.getJwtToken(req);
			const decodedToken = await authServices.decodeAccessToken(accessToken, false);

			return res.json(decodedToken);
		}),
	);

	/** @description */
	router.get(
		'/v1/auth/jwt/refresh-check',
		doAsync(async (req, res) => {
			const refreshToken = await authServices.getRefreshToken(req);
			const decodedToken = await authServices.decodeRefreshToken(refreshToken);

			return res.json(decodedToken);
		}),
	);

	/** @description 회원 이메일 체크 */
	router.get(
		'/v1/members/:user_id/existence',
		doAsync(async (req, res) => {
			const isExistMemberEmail = await memberService.isExistMemberEmail(req.params.user_id);
			return res.json(isExistMemberEmail);
		}),
	);

	// 회원 가입
	router.post(
		'/v1/members',
		doAsync(async (req, res) => {
			const nowData = new Date();
			// 요청 변수 정리
			const member = {
				user_id: req.body.email,
				password: req.body.password,
				nickname: `사용자${nowData.getMilliseconds() * 10000}${await commonComponent.getRandomInteger('00000', '99999')}`,
				profile: process.env.DEFAULT_PROFILE,
				email: req.body.email,
				join_site: 'NORMAL',
			};
			/** @todo 웹에서 버전 안받아서 추가 로직 필요 */
			const memberVersion = req.body.version || 'versionName';
			const memberExternal = {};

			// 회원 등록
			const memberRegister = await memberService.doRegisterMember(member, memberExternal, memberVersion);

			// 로그인 정보가 담긴 토큰 재발급 처리
			const refresheToken = await authServices.generateToken({ member_id: memberRegister }, req.csrfToken(), true);

			return res.json(refresheToken);
		}),
	);

	// Site 회원 로그인
	router.post(
		'/v1/login',
		doAsync(async (req, res) => {
			// 로그인 처리
			const memberId = await memberService.doLogin(req.body.email, req.body.password, 'NORMAL', {}, req.body.version);

			// 로그인 정보가 담긴 토큰 재발급 처리
			const refreshedToken = await authServices.generateToken({ member_id: memberId }, req.csrfToken(), true);
			// Return
			return res.json(refreshedToken);
		}),
	);

	/** @description sns 회원 로그인 */
	router.post(
		'/v1/members/sns-login',
		doAsync(async (req, res) => {
			const { channel } = req.body;
			const { code } = req.body;
			/** @todo 웹에서 버전 안받아서 추가 로직 필요 */
			const memberVersion = req.body.version || 'versionName';
			const redirectUrl = req.body.redirect_url;

			// snsService 로직 임포트
			let snsService = null;
			if (channel === 'NAVER') snsService = naverService;
			if (channel === 'GOOGLE') snsService = googleService;

			// sns AccessToken 발급
			const snsAccessToken = await snsService.getAccessTokenByCode(code, redirectUrl);
			if (!snsAccessToken) throwErr('Internal Server Error', 500);

			// sns 회원 정보 조회
			const snsMember = await snsService.getMemberByAccessToken(snsAccessToken);
			if (!snsMember) throwErr('Internal Server Error', 500);

			// 로그인 절차
			const memberId = await memberService.doLogin(null, null, channel, snsMember, memberVersion);

			const token = await authServices.generateToken({ member_id: memberId, external: { channel } }, req.csrfToken(), true);

			return res.json(token);
		}),
	);

	/** @description 회원 비밀번호 초기화 */
	router.post('/v1/members/password', async (req, res) => {
		await emailService.passwordEmail(req.body.email);
		return res.json(null);
	});

	/** @description 회원 본인 확인 이메일 전송 */
	router.post('/v1/members/email', async (req, res) => {
		const { email } = req.body;
		await emailService.verifyEmail(email);
		return res.json(null);
	});

	/** @todo 회원 인덱스 조회하는 미들웨어 작성 필요 */

	/** @description 회원 로그아웃 */
	router.post(
		'/v1/logout',
		doAsync(async (req, res) => {
			// redis 키삭제
			const accessToken = await authServices.getJwtToken(req);
			const decodeAccessToken = <jwtInterface.DecodeToken>await authServices.decodeAccessToken(accessToken, false);
			const memberId = decodeAccessToken.data.member_id;
			await redisDelKey(String(memberId));

			//  토큰 재발급 처리
			const refreshedToken = await authServices.generateToken({ member_id: null }, req.csrfToken(), true);

			// Return
			return res.json(refreshedToken);
		}),
	);

	/** @description 회원 파이어베이스 토큰 등록 */
	router.post(
		'/v1/members/firebase-token',
		doAsync(async (req, res) => {
			const accessToken = await authServices.getJwtToken(req);
			const decodeAccessToken = <jwtInterface.DecodeToken>await authServices.decodeAccessToken(accessToken, false);
			const memberId = decodeAccessToken.data.member_id;

			const firebaseToken = await firebaseService.postMemberFirebaseToken({ member_id: memberId, token: req.body.token, division: req.body.division, device_name: req.body.device_name });

			return res.json(firebaseToken);
		}),
	);
};
