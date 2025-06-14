// 화풍 데이터 정의
const artStyles = {
  realistic: {
    id: 'realistic',
    name: '사실적 (Realistic)',
    description: '실제 사진과 같은 사실적인 스타일',
    keywords: [
      'realistic', 'photorealistic', 'detailed', 'natural lighting', 
      'high resolution', 'sharp focus', 'professional photography',
      'masterpiece', 'best quality'
    ]
  },
  makoto_shinkai: {
    id: 'makoto_shinkai',
    name: '신카이 마코토 (Makoto Shinkai)',
    description: '신카이 마코토 애니메이션 스타일',
    keywords: [
      'makoto shinkai style', 'anime style', 'beautiful lighting',
      'dramatic sky', 'detailed background', 'cinematic',
      'vibrant colors', 'atmospheric', 'masterpiece', 'best quality'
    ]
  },
  watercolor: {
    id: 'watercolor',
    name: '수채화 (Watercolor)',
    description: '부드러운 수채화 스타일',
    keywords: [
      'watercolor painting', 'soft colors', 'artistic', 'traditional art',
      'paper texture', 'flowing', 'gentle', 'pastel colors',
      'masterpiece', 'best quality'
    ]
  },
  oil_painting: {
    id: 'oil_painting',
    name: '유화 (Oil Painting)',
    description: '클래식한 유화 스타일',
    keywords: [
      'oil painting', 'classical art', 'rich colors', 'textured',
      'brush strokes', 'traditional painting', 'artistic',
      'renaissance style', 'masterpiece', 'best quality'
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