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

async function getCatalog() {
  const data = await productsStore().get('catalog', { type: 'json' });
  return data || [];
}

async function saveCatalog(catalog) {
  await productsStore().setJSON('catalog', catalog);
}

// Site content: homepage news text + banner carousel slides.
// Stored as one JSON blob under key "site-content" in the same store as the catalog.
async function getSiteContent() {
  const data = await productsStore().get('site-content', { type: 'json' });
  return data || { news: '', banners: [] };
}

async function saveSiteContent(content) {
  await productsStore().setJSON('site-content', content);
}

module.exports = { productsStore, imageStore, getCatalog, saveCatalog, getSiteContent, saveSiteContent };
