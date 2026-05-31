const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token || token === 'null' || token === 'undefined') {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_for_hackathon_demo');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    // If the token is invalid/expired in optional auth context, we treat them as guest instead of throwing a 401
    next();
  }
};
