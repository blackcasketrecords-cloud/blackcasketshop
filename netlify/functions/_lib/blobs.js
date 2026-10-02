const { getStore } = require('@netlify/blobs');

// On some deploy environments Netlify Blobs does not auto-detect its
// site/token context inside Functions, so we fall back to explicit config
// using a Netlify Personal Access Token (set as NETLIFY_BLOBS_TOKEN) and
// the site ID (Netlify provides SITE_ID automatically at runtime).
function openStore(name) {
  const siteID = process.env.NETLIFY_BLOBS_SITE_ID || process.env.SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name, siteID, token });
  }
  return getStore(name);
}

function productsStore() {
  return openStore('bcr-shop');
}

function imageStore() {
  return openStore('bcr-images');
}

// Orders: each order lives under its own key (its id) so two customers placing
// orders at the same moment never collide on the same write. A short summary
// (email, name, total, status, date) is saved alongside as metadata so the
// admin order list can be built from one cheap metadata-only read per order,
// without fetching every order's full body.
function ordersStore() {
  return openStore('bcr-orders');
}

async function getCatalog() {
  const data = await productsStore().get('catalog', { type: 'json' });
  return data || [];
}

async function saveCatalog(catalog) {
  await productsStore().setJSON('catalog', catalog);
}

// Site content: homepage news cards + banner carousel slides.
// Stored as one JSON blob under key "site-content" in the same store as the catalog.
async function getSiteContent() {
  const data = await productsStore().get('site-content', { type: 'json' });
  return data || { newsItems: [], banners: [], projects: {} };
}

async function saveSiteContent(content) {
  await productsStore().setJSON('site-content', content);
}

// Discount codes: stored as one JSON array under key "discounts" in the same store.
async function getDiscounts() {
  const data = await productsStore().get('discounts', { type: 'json' });
  return data || [];
}

async function saveDiscounts(discounts) {
  await productsStore().setJSON('discounts', discounts);
}

function orderMetadata(order) {
  return {
    email: (order.customer && order.customer.email) || '',
    name: (order.customer && order.customer.name) || '',
    total: typeof order.total === 'number' ? order.total : 0,
    status: order.status || 'new',
    createdAt: order.createdAt || new Date().toISOString()
  };
}

async function saveOrder(order) {
  await ordersStore().setJSON(order.id, order, { metadata: orderMetadata(order) });
}

async function getOrder(id) {
  return ordersStore().get(id, { type: 'json' });
}

// Lightweight list for the admin Orders tab: one metadata-only read per order
// (no bodies fetched), so this stays cheap even with a few hundred orders.
async function listOrderSummaries() {
  const store = ordersStore();
  const { blobs } = await store.list();
  const summaries = await Promise.all(
    blobs.map(async (b) => {
      const meta = await store.getMetadata(b.key);
      return Object.assign({ id: b.key }, meta ? meta.metadata : {});
    })
  );
  summaries.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return summaries;
}

async function updateOrderStatus(id, status) {
  const order = await getOrder(id);
  if (!order) return null;
  order.status = status;
  await saveOrder(order);
  return order;
}

module.exports = {
  productsStore,
  imageStore,
  ordersStore,
  getCatalog,
  saveCatalog,
  getSiteContent,
  saveSiteContent,
  getDiscounts,
  saveDiscounts,
  saveOrder,
  getOrder,
  listOrderSummaries,
  updateOrderStatus
};
