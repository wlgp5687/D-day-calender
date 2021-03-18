import { sequelize } from '../database';
import * as authService from './auth';
import * as emailComponent from '../component/email';
import * as memberComponent from '../component/member';
import { throwErr } from './decorator';

const makeRandomPasscode = () => {
	const possible = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let randomStr = '';

	for (let i = 0; i < 8; i += 1) {
		randomStr += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return randomStr;
};

/** @description 이메일 본인 확인 전송 */
export const verifyEmail = async (email: string) => {
	const emailToken = await authService.generateToken({ member_id: null, external: null, email }, null, false);
	const title = '본인 인증 이메일';
	const html = `
        <h1>본인 인증 이메일 입니다.</h1>
        <a href="http://localhost:5000/v1/members/password?token=${emailToken.token.access_token}">링크를 클릭하세요!!</a>
    `;
	await emailComponent.sendEmail(email, title, html);
};

/** @description 비밀번호 초기화 이메일 전송 */
export const passwordEmail = async (email: string) => {
	const title = '비밀번호 초기화 이메일';
	const passcode = makeRandomPasscode();
	const html = `초기화된 비밀번호는 <b>${passcode}</b> 입니다.`;
	try {
		await emailComponent.sendEmail(email, title, html);
		await sequelize.transaction(async (t) => {
			await memberComponent.postPasscodeByEmail(email, passcode, t);
		});

		return null;
	} catch (err) {
		return throwErr(500, 'Email Server Error');
	}
};
