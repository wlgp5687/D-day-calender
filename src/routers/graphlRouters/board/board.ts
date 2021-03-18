import * as boardService from '../../../services/board';

export default {
	Query: {
		boards: async (root, args, context, info) => {
			const searchField = { board_type: args.board_type, is_deleted: 'N' };

			const boards = await boardService.getBoards(searchField);

			return boards;
		},
		boardByBoardId: async (root, args, context, info) => {
			const response = await boardService.getBoardByBoardId(args.board_id);

			return response;
		},
	},
};
