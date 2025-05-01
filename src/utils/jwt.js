const jwt = require('jsonwebtoken');

/**
 * JWT 토큰 생성 함수
 * @param {string} id - 사용자 ID
 * @returns {string} - 생성된 JWT 토큰
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = { generateToken }; 