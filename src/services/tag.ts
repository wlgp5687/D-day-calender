import * as tagComponent from '../component/tag';
import { sequelize } from '../database';

export const postTag = async (memberId: number, tagParam: string) => {
	let response = null;

	await sequelize.transaction(async (t) => {
		// tag 추가
		const tag = await tagComponent.postTag(tagParam, t);

		// 회원 태그 목록 추가
		await tagComponent.postMemberTag(memberId, tag.id, t);

		response = tag;
	});

	return response;
};

/** @description 태그 이름으로 태그 검색 */
export const getTagsByTag = async (memberId: number, tag: string) => {
	let response = null;

	const likeTag = await tagComponent.getTagsByTagLike(memberId, tag);
	const exactTag = await tagComponent.getTagByTagExact(memberId, tag);

	if (likeTag || exactTag) response = { tag: likeTag, exact_tag: exactTag };

	return response;
};
