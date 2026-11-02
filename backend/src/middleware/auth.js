'use strict';
const jwt = require('jsonwebtoken');
const { fail } = require('../utils/response');

/**
 * Middleware: verify Bearer JWT token and attach req.user.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return fail(res, 'No token provided', 401);
  }
  const token = authHeader.split(' ')[1];
  try {
    const jwtSecret = process.env.JWT_SECRET || 'cybercafe_jwt_secret_fallback_key';
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; // { id, username, role, name }
    next();
  } catch (err) {
    return fail(res, 'Invalid or expired token', 401);
  }
}

/**
 * Middleware factory: require one of the given roles.
 * @param {...string} roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return fail(res, 'Not authenticated', 401);
    if (!roles.includes(req.user.role)) {
      return fail(res, 'Forbidden: insufficient role', 403);
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
