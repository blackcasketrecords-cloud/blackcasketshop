// Public-facing discount code check used by the checkout page. Does not require
// admin auth (customers need to be able to validate a code), but only ever
// returns the single matching code's info — never the full list.
const { getDiscounts, saveDiscounts } = require('./_lib/blobs');

function json(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(data)
  };
}

function normalize(code) {
  return (code || '').trim().toUpperCase();
}

// Returns the matching discount record, or { error } if it exists but isn't usable,
// or null if no such code exists at all.
function lookup(discounts, code) {
  const norm = normalize(code);
  if (!norm) return null;
  const d = discounts.find((x) => x.code === norm);
  if (!d) return null;
  if (!d.enabled) return { error: 'This code is no longer active.' };
  if (d.expiresAt && new Date(d.expiresAt + 'T23:59:59') < new Date()) {
    return { error: 'This code has expired.' };
  }
  if (d.maxUses && d.usedCount >= d.maxUses) {
    return { error: 'This code has reached its usage limit.' };
  }
  return d;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Bad JSON' });
  }

  const discounts = await getDiscounts();

  if (body.action === 'validate') {
    const result = lookup(discounts, body.code);
    if (!result) return json(200, { ok: false, error: 'Invalid code.' });
    if (result.error) return json(200, { ok: false, error: result.error });
    return json(200, { ok: true, code: result.code, type: result.type, value: result.value });
  }

  if (body.action === 'redeem') {
    const result = lookup(discounts, body.code);
    if (!result || result.error) return json(200, { ok: false });
    const d = discounts.find((x) => x.code === result.code);
    d.usedCount = (d.usedCount || 0) + 1;
    await saveDiscounts(discounts);
    return json(200, { ok: true });
  }

  return json(400, { error: 'Unknown action' });
};
