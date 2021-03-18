import bcrypt from 'bcryptjs';
import nodeSchedule from 'node-schedule';
import fs from 'fs';
import path from 'path';
import { sequelize, Op } from '../database';
import * as firebaseService from './firebase';
import * as memberComponent from '../component/member';
import * as calendarComponent from '../component/calendar';
import * as versionComponent from '../component/version';
import * as commonComponent from '../component/common';
import * as fileUploadComponent from '../component/fileUpload';
import * as colorComponent from '../component/color';
import * as scheduleComponent from '../component/schedule';
import * as firebaseComponent from '../component/firebase';
import * as redis from '../redis';
import * as awsInterface from '../interface/aws';
import * as scheduleInterface from '../interface/schedule';
import { throwErr } from './decorator';

export const getMemberById = async (memberId) => {
	const response = memberComponent.getMemberById(memberId);
	return response;
};

export const getMemberExternalById = async (memberId) => {
	const response = memberComponent.getMemberExternalById(memberId);
	return response;
};

export const getMemberSettingById = async (memberId) => {
	const response = memberComponent.getMemberSettingById(memberId);
	return response;
};

export const isExistMemberEmail = async (memberEmail) => {
	const response = memberComponent.isExistMemberEmail(memberEmail);
	return response;
};

export const doRegisterMember = async (member, memberExternal, memberVersion) => {
	let response = null;
	await sequelize.transaction(async (t) => {
		// 회원 기본 정보 추가
		const memberId = await memberComponent.addMember(member, t);

		// 회원 외부 연동 정보 추가
		if (memberExternal.channel && memberExternal.token) await memberComponent.addMemberExternal({ ...memberExternal, member_id: memberId }, false, t);

		// 회원 색상 정보 추가
		const colors = await colorComponent.getColors();
		for (let i = 0; i < colors.length; i += 1)
			// eslint-disable-next-line no-await-in-loop
			await memberComponent.postMemberColors(memberId, colors[i].id, i + 1, 0, t);

		/** @todo 기기 정보 추가 작업 필요 */
		// 회원 로그인 기기 추가
		// const loginDeviceId = await memberComponent.addDevice({})

		// 회원 버전 검색
		const versionId = (await versionComponent.getVersionIdByVersionName(memberVersion)) || (await versionComponent.getRecentVersionId());

		// 회원 개인 설정 추가
		await memberComponent.addMemberSetting(memberId, versionId, t);

		// 회원 기본 달력 추가
		const calendarData = { title: 'default', member_id: memberId, is_display: 'Y' };
		const calendar = await calendarComponent.postCalendar(calendarData, t);
		await calendarComponent.postMemberCalendar({ member_id: memberId, calendar_id: calendar.id, status: 'JOIN' }, t);

		response = memberId;
	});

	// Return
	return response;
};

/** @description site 회원 인증 */
export const verifyMember = async (userId, password) => {
	// 일치 회원 검사
	const member = await memberComponent.getMemberByUserId(userId);
	if (!member) throwErr('Invalid Member', 400);

	if (!member.passcode) {
		// 비밀번호 일치 검사
		return bcrypt.compareSync(password, member.password) ? member.id : throwErr('Invalid Password', 400);
	}

	if (bcrypt.compareSync(password, member.passcode)) {
		// 임시 비밀번호 일치 검사
		await memberComponent.patchMember({ password, passcode: null }, member.id);
		return bcrypt.compareSync(password, member.passcode) ? member.id : throwErr('Invalid Password', 400);
	}

	return bcrypt.compareSync(password, member.password) ? member.id : throwErr('Invalid Password', 400);
};

/** @description sns 회원 인증 */
export const verifySnsMember = async (channel: string, externalId: number) => {
	const member = await memberComponent.getMemberByChannelAndToken(channel, externalId);
	return member ? member.member_id : null;
};

/** @description 로그인 */
export const doLogin = async (userId: string, password: string, channel: string, externalData, memberVersion: string) => {
	let memberId = null;
	// site 회원 검사
	if (channel === 'NORMAL') memberId = await verifyMember(userId, password);
	else {
		if (!externalData.external_id) throwErr('Internal Error', 500);

		// sns 회원 검사
		memberId = await verifySnsMember(channel, externalData.external_id);
	}

	// 회원 가입 절차
	if (!memberId && channel !== 'NORMAL') {
		const nowData = new Date();
		const snsPrefix = channel === 'NAVER' ? 'N' : 'G';
		// 요청 변수 정리
		const member = {
			user_id: `${snsPrefix}${nowData.getMilliseconds() * 10000}${await commonComponent.getRandomInteger('00000', '99999')}`,
			password: '',
			profile: externalData.thumbnail || process.env.DEFAULT_PROFILE,
			nickname: externalData.nickname || `사용자${snsPrefix}${nowData.getMilliseconds() * 10000}${await commonComponent.getRandomInteger('00000', '99999')}`,
			email: `${externalData.email}(${snsPrefix}${nowData.getMilliseconds() * 10000}${await commonComponent.getRandomInteger('00000', '99999')})`,
			join_site: channel,
		};

		const memberAccess = { channel, token: externalData.external_id };
		memberId = await doRegisterMember(member, memberAccess, memberVersion);
	} else if (memberId) {
		/** @todo 로그인 정보 업데이트 작업 필요 */
		// 로그인 정보 업데이트
	}
	return memberId;
};

/** @description 조건 설정으로 회원 달력 조회 */
export const getMemberCalendarByMemberId = async (searchField) => {
	const memberCalendar = await memberComponent.getMemberCalendarByMemberId(searchField);
	let response = null;

	if (memberCalendar && memberCalendar.length > 0) response = memberCalendar;

	return response;
};

/** @description 이메일로 회원 조회 */
export const getMembersByEmail = async (email: string) => {
	const response = memberComponent.getMembersByEmail(email);
	return response;
};

/** @description 참여자 내보내기 */
export const banCalendarMember = async (member_id: number, calendarId: number) => {
	await sequelize.transaction(async (t) => {
		await calendarComponent.deleteCalendarByUser(member_id, calendarId, t);

		// 달력 하위 일정 조회
		const scheduleIds = [];
		const schedules = await calendarComponent.getScheduleByCalendarId(calendarId);
		const todayDate = new Date();
		let scheduleLoops = null;

		if (schedules && schedules.length > 0) {
			for (let i = 0; i < schedules.length; i += 1) scheduleIds.push(schedules[i].id);

			scheduleLoops = await scheduleComponent.getScheduleLoopsByScheduleId({ [Op.and]: [{ schedule_id: { [Op.in]: scheduleIds } }, { start_time: { [Op.gte]: todayDate } }] });

			// 알람 생성 푸시 알림 보내기
			const firebaseTokens = await firebaseComponent.getFirebaseTokenByCalendarId(calendarId);
			const firebaseData = <scheduleInterface.postScheduleFirebaseData>{};
			if (firebaseTokens && firebaseTokens.length > 0) {
				const tokens = [];
				for (let i = 0; i < firebaseTokens.length; i += 1) {
					// eslint-disable-next-line no-await-in-loop
					const pushOnOff = await memberComponent.pushOnOff(firebaseTokens[i].member_id);
					if (pushOnOff) tokens.push(firebaseTokens[i].token);
				}
				firebaseData.title = `[일정 알람] - `;
				firebaseData.body = `${scheduleLoops[0].title}`;
				firebaseData.token = tokens;
			}

			for (let i = 0; i < scheduleLoops.length; i += 1) {
				const scheduleLoopId = scheduleLoops[i].id;
				// eslint-disable-next-line no-await-in-loop
				const alarmData = await scheduleComponent.getAlarmByLoopId(scheduleLoopId);
				if (alarmData) {
					const timer = alarmData.alarm === '24' ? '하루 전' : `${alarmData.alarm}분 전`;
					firebaseData.title += timer;

					if (alarmData.alarm_at) {
						const scheduleJob = nodeSchedule.scheduleJob(alarmData.alarm_at, async () => {
							firebaseService.sendNotification(firebaseData.title, firebaseData.body, firebaseData.token);
							for (let j = 0; j < firebaseData.token.length; j += 1)
								// eslint-disable-next-line no-await-in-loop
								await firebaseComponent.postPushAlarm(firebaseData.title, firebaseData.body, firebaseTokens[j].id, 'Alarm', scheduleLoopId, t);

							redis.redisSetKeyValue(`scheduleLoopId${scheduleLoopId}`, scheduleJob);
						});
					}
				}
			}
		}
	});

	return null;
};

export const patchMember = async (memberData, memberId) => {
	const response = await memberComponent.patchMember(memberData, memberId);
	return response;
};

export const patchMemberSetting = async (memberSettingParam, memberId) => {
	const response = await memberComponent.patchMemberSetting(memberSettingParam, memberId);
	return response;
};

/** @description 회원 프로필 업로드 */
export const uploadProfile = async (fileParam, memberId: number) => {
	const file = fileParam;
	const { createReadStream } = file;
	const fileStream = createReadStream();

	const awsPath = `member/${memberId}`;

	// 기존 프로필 확인

	// 파일 이름 암호화
	file.filename = await fileUploadComponent.encryptFileName(file.filename);

	// s3 업로드
	const awsFile = <awsInterface.AwsFile>await fileUploadComponent.uploadS3(file, awsPath, fileStream);

	// 회원 프로필 업데이트
	await memberComponent.patchMember({ profile: awsFile.Location }, memberId);

	/** @todo 프로필 삭제 기능 논의 */
	// s3 이전 프로필 이미지 삭제

	return awsFile.Location;
};

/** @description 회원 태그 목록 조회 */
export const getMemberTagsByMemberId = async (memberId: number) => {
	const response = memberComponent.getMemberTagsByMemberId(memberId);

	return response;
};

/** @description 회원 색상 목록 조회 */
export const getMembrColorsByMemberId = async (memberId: number) => {
	const response = memberComponent.getMembrColorsByMemberId(memberId);

	return response;
};
