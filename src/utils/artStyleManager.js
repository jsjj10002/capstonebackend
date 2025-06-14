const fs = require('fs');
const path = require('path');

// 화풍 데이터 로드
const loadArtStyles = () => {
  const filePath = path.join(__dirname, '../data/artStyles.json');
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data).artStyles;
};

// 모든 화풍 가져오기
const getAllArtStyles = () => {
  return loadArtStyles();
};

// ID로 특정 화풍 가져오기
const getArtStyleById = (id) => {
  const artStyles = loadArtStyles();
  return artStyles.find(style => style.id === id);
};

// 기본 화풍 가져오기
const getDefaultArtStyle = () => {
  return getArtStyleById('realistic');
};

module.exports = {
  getAllArtStyles,
  getArtStyleById,
  getDefaultArtStyle
}; 