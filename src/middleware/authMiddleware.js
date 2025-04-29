const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// 토큰 검증 및 사용자 인증 미들웨어
const protect = async (req, res, next) => {
  let token;

  // Authorization 헤더에서 토큰 추출
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // 토큰 추출
      token = req.headers.authorization.split(' ')[1];

      // 토큰 검증
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 토큰에서 추출한 id로 사용자 조회 (비밀번호 제외)
      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: '인증에 실패했습니다. 유효하지 않은 토큰입니다.' });
    }
  }

  if (!token) {
    res.status(401).json({ message: '인증에 실패했습니다. 토큰이 없습니다.' });
  }
};

module.exports = { protect }; 