const crypto = require('crypto');

const COOKIE_NAME = 'bcr_admin';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

function getSecret() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error('ADMIN_SECRET is not configured');
  return secret;
}

function hmac(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

function makeToken() {
  const expires = String(Date.now() + MAX_AGE_SECONDS * 1000);
  return `${expires}.${hmac(expires)}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [value, sig] = parts;
  let expected;
  try {
    expected = hmac(value);
  } catch (e) {
    return false;
  }
  const sigBuf = Buffer.from(sig, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;
  return Date.now() < Number(value);
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

function isAuthed(event) {
  const header = event.headers.cookie || event.headers.Cookie;
  const cookies = parseCookies(header);
  return verifyToken(cookies[COOKIE_NAME]);
}

function setCookieHeader(token) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}`;
}

function clearCookieHeader() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

module.exports = { makeToken, verifyToken, isAuthed, setCookieHeader, clearCookieHeader };
