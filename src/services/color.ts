import * as colorComponent from '../component/color';

/** @description 색상 인덱스로 색상 조회 */
export const getColorById = async (colorId: number) => {
	const response = colorComponent.getColorById(colorId);

	return response;
};

/** @description 회원 인덱스로 색상 목록 조회 */
export const getColorsByMemberId = async (memberId: number) => {
	const response = colorComponent.getColorsByMemberId(memberId);
	return response;
};
