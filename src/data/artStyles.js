// 화풍 데이터 정의
const artStyles = {
  makoto_shinkai: {
    id: 'makoto_shinkai',
    name: '신카이 마코토 (Makoto Shinkai)',
    description: '신카이 마코토 애니메이션 스타일',
    keywords: [
      'makoto shinkai style', 'anime style', 'beautiful lighting',
      'dramatic sky', 'detailed background', 'cinematic',
      'vibrant colors', 'atmospheric', 'masterpiece', 'best quality'
    ]
  }
};

/**
 * ID로 화풍 스타일 조회
 * @param {string} id - 화풍 ID
 * @returns {Object|null} - 화풍 객체 또는 null
 */
const getArtStyleById = (id) => {
  return artStyles[id] || null;
};

/**
 * 기본 화풍 스타일 반환
 * @returns {Object} - 기본 화풍 객체
 */
const getDefaultArtStyle = () => {
  return artStyles.makoto_shinkai; // 신카이 마코토 스타일을 기본으로 사용
};

/**
 * 모든 화풍 스타일 목록 반환
 * @returns {Array} - 화풍 객체 배열
 */
const getAllArtStyles = () => {
  return Object.values(artStyles);
};

module.exports = {
  artStyles,
  getArtStyleById,
  getDefaultArtStyle,
  getAllArtStyles
};