import * as boardComponent from '../component/board';

/** @description 게시판 목록 조회 */
export const getBoards = async (searchField) => {
	const response = await boardComponent.getBoards(searchField);

	return response;
};

/** @description board.id로 게시물 상세 조회 */
export const getBoardByBoardId = async (boardId: number) => {
	const response = await boardComponent.getBoardByBoardId(boardId);

	return response;
};
