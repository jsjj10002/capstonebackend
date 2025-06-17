const fs = require('fs');
const path = require('path');

// artStyles.json 파일에서 화풍 데이터 로드
const loadArtStyles = () => {
  try {
    const artStylesPath = path.join(__dirname, '../data/artStyles.json');
    const artStylesData = JSON.parse(fs.readFileSync(artStylesPath, 'utf8'));
    return artStylesData.artStyles;
  } catch (error) {
    console.error('artStyles.json 로드 오류:', error);
    return [];
  }
};

/**
 * ID로 화풍 스타일 조회
 * @param {string} id - 화풍 ID
 * @returns {Object|null} - 화풍 객체 또는 null
 */
const getArtStyleById = (id) => {
  const artStyles = loadArtStyles();
  return artStyles.find(style => style.id === id) || null;
};

/**
 * 기본 화풍 스타일 반환
 * @returns {Object} - 기본 화풍 객체
 */
const getDefaultArtStyle = () => {
  const artStyles = loadArtStyles();
  return artStyles.find(style => style.id === 'makoto_shinkai') || artStyles[0] || null;
};

/**
 * 모든 화풍 스타일 목록 반환
 * @returns {Array} - 화풍 객체 배열
 */
const getAllArtStyles = () => {
  return loadArtStyles();
};

module.exports = {
  getArtStyleById,
  getDefaultArtStyle,
  getAllArtStyles
}; 