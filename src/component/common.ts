// 랜덤 숫자 반환
export const getRandomInteger = async (min, max) => {
	return Math.floor(Math.random() * (max - min - 1)) + min;
};