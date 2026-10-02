// Customer-facing account endpoint — requires a logged-in Netlify Identity
// session. Netlify verifies the Authorization: Bearer <jwt> header itself and
// only populates context.clientContext.user when that token is valid, so we
// can trust the user id (sub) it gives us without checking it ourselves.
// Lets a logged-in customer save their checkout details for next time and see
// their own order history — never anyone else's.
const { getProfile, saveProfile, listOrderSummaries, getOrder } = require('./_lib/blobs');

function json(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(data)
  };
}

function str(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max || 200) : '';
}

function sanitizeProfile(input) {
  return {
    name: str(input.name, 200),
    phone: str(input.phone, 60),
    country: str(input.country, 100),
    city: str(input.city, 100),
    address: str(input.address, 300),
    zip: str(input.zip, 30),
    updatedAt: new Date().toISOString()
  };
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return json(401, { error: 'Not authenticated' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Bad JSON' });
  }

  if (body.action === 'get-profile') {
    const profile = await getProfile(user.sub);
    return json(200, { ok: true, profile: profile || null });
  }

  if (body.action === 'save-profile') {
    const profile = sanitizeProfile(body.profile || {});
    await saveProfile(user.sub, profile);
    return json(200, { ok: true, profile });
  }

  if (body.action === 'my-orders') {
    const all = await listOrderSummaries();
    const mine = all.filter((o) => o.userId === user.sub);
    return json(200, { ok: true, orders: mine });
  }

  if (body.action === 'get-order') {
    const order = await getOrder(body.id);
    // Ownership check: a customer can only ever see their own order, even if
    // they guess another order's id.
    if (!order || order.userId !== user.sub) return json(404, { error: 'Not found' });
    return json(200, { ok: true, order });
  }

  return json(400, { error: 'Unknown action' });
};
