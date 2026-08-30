require('dotenv').config();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('─'.repeat(60));
  console.warn('JWT_SECRET not set — using a random secret for this run.');
  console.warn('Customer logins will be invalidated on every restart.');
  console.warn('Set JWT_SECRET in .env and in Vercel for stable sessions.');
  console.warn('─'.repeat(60));
}

function signToken(user, remember) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, {
    expiresIn: remember ? '30d' : '7d',
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

module.exports = { signToken, verifyToken };
