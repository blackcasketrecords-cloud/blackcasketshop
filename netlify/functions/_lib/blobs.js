const { getStore } = require('@netlify/blobs');

function productsStore() {
  return getStore('bcr-shop');
}

function imageStore() {
  return getStore('bcr-images');
}

async function getCatalog() {
  const data = await productsStore().get('catalog', { type: 'json' });
  return data || [];
}

async function saveCatalog(catalog) {
  await productsStore().setJSON('catalog', catalog);
}

module.exports = { productsStore, imageStore, getCatalog, saveCatalog };
