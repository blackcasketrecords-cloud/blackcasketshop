// Public-facing order creation, called from the checkout page right alongside
// the existing Netlify Forms submission. This is what actually turns an order
// into queryable data (for the admin Orders tab, and later a customer's order
// history) instead of it only ever existing as a form-submission email.
const crypto = require('crypto');
const { saveOrder } = require('./_lib/blobs');

function json(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(data)
  };
}

function str(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max || 500) : '';
}

function num(v) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function sanitizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 50).map((it) => ({
    id: str(it && it.id, 100),
    title: str(it && it.title, 200),
    qty: Math.max(1, Math.min(3, Math.round(num(it && it.qty)) || 1)),
    unitPrice: num(it && it.unitPrice),
    lineTotal: num(it && it.lineTotal)
  }));
}

function sanitizeOrder(body, userId) {
  const customer = body.customer || {};
  const shipping = body.shipping || {};
  return {
    id: crypto.randomUUID(),
    status: 'new',
    createdAt: new Date().toISOString(),
    // Taken from the verified Identity JWT (if the request was authenticated),
    // never from the client-supplied body — a guest checkout leaves this null.
    userId: userId || null,
    items: sanitizeItems(body.items),
    subtotal: num(body.subtotal),
    shippingCost: num(body.shippingCost),
    discountCode: str(body.discountCode, 24).toUpperCase(),
    discountAmount: num(body.discountAmount),
    total: num(body.total),
    paymentMethod: str(body.paymentMethod, 60),
    customer: {
      name: str(customer.name, 200),
      email: str(customer.email, 200),
      phone: str(customer.phone, 60)
    },
    shipping: {
      country: str(shipping.country, 100),
      city: str(shipping.city, 100),
      address: str(shipping.address, 300),
      zip: str(shipping.zip, 30)
    },
    notes: str(body.notes, 1000)
  };
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  // Netlify verifies the Identity JWT itself (when the request carries an
  // Authorization: Bearer <token> header) and only then populates this —
  // so it's safe to trust, unlike anything the client sends in the body.
  const identityUser = context.clientContext && context.clientContext.user;
  const userId = identityUser ? identityUser.sub : null;

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Bad JSON' });
  }

  if (body.action !== 'create') {
    return json(400, { error: 'Unknown action' });
  }

  if (!body.customer || !body.customer.email) {
    return json(400, { error: 'Missing customer email' });
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return json(400, { error: 'Order has no items' });
  }

  const order = sanitizeOrder(body, userId);

  try {
    await saveOrder(order);
    return json(200, { ok: true, orderId: order.id });
  } catch (err) {
    // Best-effort: the checkout flow treats this as non-blocking (the Netlify
    // Forms submission + mailto fallback is still the primary order record),
    // so a storage hiccup here shouldn't stop the customer's order from going
    // through — just report it so the caller can log/ignore it.
    return json(500, { error: err.message });
  }
};
