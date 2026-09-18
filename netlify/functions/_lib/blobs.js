const { getStore } = require('@netlify/blobs');

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

module.exports = { productsStore, imageStore, getCatalog, saveCatalog };
