import * as colorService from '../../../services/color';

export default {
	Query: {
		colors: async (root, args, context, info) => {
			const memberId = context.decoded_token.data.member_id;

			const colors = await colorService.getColorsByMemberId(memberId);

			return colors;
		},
	},
};
