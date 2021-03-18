import { getModel, Op } from '../database';

const Tag = getModel('Tag');
const MemberTag = getModel('MemberTag');
const ScheduleLoopTag = getModel('ScheduleLoopTag');

/** @description 태그 추가 */
export const postTag = async (tag: string, t: any) => {
	const response = await Tag.create({ tag }, { transaction: t });
	return response;
};

/** @description 회원 태그 목록 추가 */
export const postMemberTag = async (memberId: number, tagId: number, t: any) => {
	const response = await MemberTag.create({ member_id: memberId, tag_id: tagId }, { transaction: t });
	return response;
};

/** @description 일정 태그 목록 추가 */
export const postScheduleTag = async (scheduleLoopId: number, tagId: number, t: any) => {
	const response = await ScheduleLoopTag.create({ schedule_loop_id: scheduleLoopId, tag_id: tagId }, { transaction: t });
	return response;
};

/** @description 일정 태그 수정 */
export const patchScheduleTag = async (scheduleLoopId: number, t: any) => {
	await ScheduleLoopTag.destroy({ where: { schedule_loop_id: scheduleLoopId } }, { transaction: t });
	return null;
};

/** @description 태그 이름과 비슷한 태그 목록 조회 */
export const getTagsByTagLike = async (memberId: number, tagParam: string) => {
	let response = null;

	const tagData = await MemberTag.findAll({
		where: { member_id: memberId },
		include: [{ model: Tag, as: 'tag', where: { [Op.and]: { tag: { [Op.not]: tagParam } }, tag: { [Op.like]: `${tagParam}%` } } }],
		order: [
			[{ model: Tag, as: 'tag' }, 'tag', 'ASC'],
			[{ model: Tag, as: 'tag' }, 'created_at', 'DESC'],
		],
	});

	if (tagData && tagData.length > 0) {
		const tag = [];
		for (let i = 0; i < tagData.length; i += 1) {
			const tmpTag = { id: tagData[i].tag.id, tag: tagData[i].tag.tag, created_at: tagData[i].created_at };

			tag.push(tmpTag);
		}
		response = tag;
	}

	return response;
};

/** @description 태그 이름으로 태그 조회 */
export const getTagByTagExact = async (memberId: number, tag: string) => {
	let response = null;

	const tagData = await MemberTag.findOne({ where: { member_id: memberId }, include: [{ model: Tag, as: 'tag', where: { tag }, required: true }] });

	if (tagData) response = { id: tagData.tag.id, tag: tagData.tag.tag, created_at: tagData.tag.created_at };

	return response;
};

/** @description 일정 인덱스로 태그 목록 조회 */
export const getScheduleLoopTagsByScheduleLoopId = async (scheduleLoopId: number) => {
	let response = null;

	const tagData = await ScheduleLoopTag.findAll({ where: { schedule_loop_id: scheduleLoopId }, include: [{ model: Tag, as: 'tag', required: true }] });

	if (tagData && tagData.length > 0) {
		const tags = [];

		for (let i = 0; i < tagData.length; i += 1) {
			const tmpTags = { id: tagData[i].tag.id, tag: tagData[i].tag.tag };

			tags.push(tmpTags);
		}

		response = tags;
	}

	return response;
};
