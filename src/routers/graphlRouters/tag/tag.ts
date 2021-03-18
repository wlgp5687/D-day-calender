import * as tagService from '../../../services/tag';

export default {
	Query: {
		/** @description 회원 태그 검색 */
		tagsByTag: async (root, args, context, info) => {
			const memberId = context.decoded_token.data.member_id;

			const response = await tagService.getTagsByTag(memberId, args.tag);

			return response;
		},
	},
	Mutation: {
		postTag: async (root, args, context, info) => {
			const memberId = context.decoded_token.data.member_id;

			const response = await tagService.postTag(memberId, args.tag);

			return response;
		},
	},
};
