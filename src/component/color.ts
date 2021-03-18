import { getModel } from '../database';

const Color = getModel('Color');
const MemberColor = getModel('MemberColor');

/** @description 색상 인덱스로 색상 조회 */
export const getColorById = async (colorId: number) => {
	const color = await Color.findOne({ where: { id: colorId } });

	return color;
};

/** @description 회원 인덱스로 색상 목록 조회 */
export const getColorsByMemberId = async (memberId: number) => {
	let response = null;

	const colorData = await MemberColor.findAll({
		where: { member_id: memberId },
		include: [{ model: Color, as: 'color', required: true }],
		order: [
			[{ model: Color, as: 'color' }, 'is_premium', 'DESC'],
			['count', 'DESC'],
			['sort_no', 'DESC'],
		],
	});

	if (colorData && colorData.length > 0) {
		const colors = [];

		for (let i = 0; i < colorData.length; i += 1) {
			const tmpColors = {
				id: colorData[i].color.id,
				color: colorData[i].color.color,
				is_premium: colorData[i].color.is_premium,
			};

			colors.push(tmpColors);
		}
		response = colors;
	}
	return response;
};

/** @description 색상 목록 조회 */
export const getColors = async () => {
	const colors = await Color.findAll({ order: [['id', 'ASC']] });
	return colors;
};
