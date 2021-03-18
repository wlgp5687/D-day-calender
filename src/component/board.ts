import { getModel } from '../database';

const Board = getModel('Board');

/** @description 게시판 목록 조회 */
export const getBoards = async (searchField) => {
	let response = null;

	const boardsData = await Board.findAll({ where: searchField });

	if (boardsData && boardsData.length > 0) response = boardsData;

	return response;
};

/** @description board.id로 게시물 상세 조회 */
export const getBoardByBoardId = async (boardId: number) => {
	let response = null;

	const boardData = await Board.findOne({ where: { id: boardId } });

	if (boardData) response = boardData;

	return response;
};
