require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
} else {
  console.warn('─'.repeat(60));
  console.warn('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set.');
  console.warn('Set them in a local .env file (see .env.example) and in');
  console.warn('your Vercel project\'s Environment Variables. Get them from');
  console.warn('Supabase: Project Settings -> API.');
  console.warn('─'.repeat(60));
}

function getClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return supabase;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPassword(password, salt, hash) {
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  const checkBuf = Buffer.from(check, 'hex');
  const hashBuf = Buffer.from(hash, 'hex');
  if (checkBuf.length !== hashBuf.length) return false;
  return crypto.timingSafeEqual(checkBuf, hashBuf);
}

module.exports = { getClient, hashPassword, verifyPassword };
