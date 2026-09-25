const crypto = require('crypto');
const { getCatalog, saveCatalog, imageStore, getSiteContent, saveSiteContent } = require('./_lib/blobs');
const { makeToken, isAuthed, setCookieHeader, clearCookieHeader } = require('./_lib/auth');
const { CATEGORIES, GENRES, PROJECTS } = require('./_lib/data');

// Side-project pages that have their own editable content block (excludes
// "blackcasket", which is the main label and has no dedicated page).
const PROJECT_PAGE_KEYS = ['ugunsvija', 'mushroom', 'perkona'];

function json(statusCode, data, extraHeaders) {
  return {
    statusCode,
    headers: Object.assign({ 'Content-Type': 'application/json' }, extraHeaders || {}),
    body: JSON.stringify(data)
  };
}

function num(v) {
  return typeof v === 'number' && !Number.isNaN(v) ? v : null;
}

function sanitizeProduct(input, existing) {
  const p = existing
    ? Object.assign({}, existing)
    : { id: crypto.randomUUID(), dateAdded: new Date().toISOString(), hidden: false };

  if (typeof input.title === 'string') p.title = input.title.trim().slice(0, 200);
  if (Array.isArray(input.categories)) {
    p.categories = input.categories.filter((c) => CATEGORIES.includes(c));
  }
  if (Array.isArray(input.genres)) {
    p.genres = input.genres.filter((g) => GENRES.includes(g)).slice(0, 2);
  }
  if (typeof input.price === 'number') p.price = input.price;
  if (typeof input.stock === 'number') p.stock = input.stock;
  if (Array.isArray(input.photos)) p.photos = input.photos.filter((u) => typeof u === 'string').slice(0, 3);
  if (typeof input.note === 'string') p.note = input.note.slice(0, 300);
  if (input.discount && typeof input.discount === 'object') {
    p.discount = { enabled: !!input.discount.enabled, price: num(input.discount.price) };
  }
  if (typeof input.isNew === 'boolean') p.isNew = input.isNew;
  if (input.preorder && typeof input.preorder === 'object') {
    p.preorder = {
      enabled: !!input.preorder.enabled,
      priceNow: num(input.preorder.priceNow),
      priceAfter: num(input.preorder.priceAfter)
    };
  }
  if (typeof input.hidden === 'boolean') p.hidden = input.hidden;
  if (typeof input.project === 'string' && PROJECTS.includes(input.project)) p.project = input.project;

  p.title = p.title || 'Untitled';
  p.categories = p.categories || [];
  p.genres = p.genres || [];
  p.price = typeof p.price === 'number' ? p.price : 0;
  p.stock = typeof p.stock === 'number' ? p.stock : 0;
  p.photos = p.photos || [];
  p.note = p.note || '';
  p.discount = p.discount || { enabled: false, price: null };
  p.isNew = !!p.isNew;
  p.preorder = p.preorder || { enabled: false, priceNow: null, priceAfter: null };
  p.project = p.project && PROJECTS.includes(p.project) ? p.project : 'blackcasket';
  return p;
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

  const action = body.action;

  if (action === 'login') {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) return json(500, { error: 'Admin password not configured' });
    if (body.password !== password) return json(401, { error: 'Wrong password' });
    const token = makeToken();
    return json(200, { ok: true }, { 'Set-Cookie': setCookieHeader(token) });
  }

  if (action === 'logout') {
    return json(200, { ok: true }, { 'Set-Cookie': clearCookieHeader() });
  }

  // Everything below requires a valid session.
  if (!isAuthed(event)) {
    return json(401, { error: 'Not authenticated' });
  }

  if (action === 'whoami') {
    return json(200, { ok: true });
  }

  if (action === 'save') {
    const catalog = await getCatalog();
    const incoming = body.payload || {};
    const idx = incoming.id ? catalog.findIndex((p) => p.id === incoming.id) : -1;
    const product = sanitizeProduct(incoming, idx >= 0 ? catalog[idx] : null);
    if (idx >= 0) catalog[idx] = product;
    else catalog.unshift(product);
    await saveCatalog(catalog);
    return json(200, { ok: true, product });
  }

  if (action === 'delete') {
    const catalog = await getCatalog();
    const next = catalog.filter((p) => p.id !== body.id);
    await saveCatalog(next);
    return json(200, { ok: true });
  }

  if (action === 'hide') {
    const catalog = await getCatalog();
    const p = catalog.find((x) => x.id === body.id);
    if (!p) return json(404, { error: 'Not found' });
    p.hidden = !!body.hidden;
    await saveCatalog(catalog);
    return json(200, { ok: true, product: p });
  }

  if (action === 'seed') {
    const catalog = await getCatalog();
    if (catalog.length > 0 && !body.force) {
      return json(400, { error: 'Catalog is not empty. Pass force:true to overwrite.' });
    }
    const seed = require('./_lib/seed-data.json');
    await saveCatalog(seed);
    return json(200, { ok: true, count: seed.length });
  }

  if (action === 'get-content') {
    const content = await getSiteContent();
    return json(200, { ok: true, content });
  }

  if (action === 'save-content') {
    const incoming = body.content || {};
    const incomingNewsItems = Array.isArray(incoming.newsItems) ? incoming.newsItems : [];
    const newsItems = [0, 1, 2].map((i) => {
      const it = incomingNewsItems[i] || {};
      return {
        image: typeof it.image === 'string' ? it.image : '',
        date: typeof it.date === 'string' ? it.date.slice(0, 20) : '',
        text: typeof it.text === 'string' ? it.text.slice(0, 2000) : '',
        project: typeof it.project === 'string' && PROJECTS.includes(it.project) ? it.project : 'blackcasket'
      };
    });
    const banners = Array.isArray(incoming.banners)
      ? incoming.banners.slice(0, 8).map((b) => ({
          image: typeof (b && b.image) === 'string' ? b.image : '',
          top: typeof (b && b.top) === 'string' ? b.top.slice(0, 80) : '',
          topColor: b && b.topColor === 'black' ? 'black' : 'white',
          bottom: typeof (b && b.bottom) === 'string' ? b.bottom.slice(0, 80) : '',
          bottomColor: b && b.bottomColor === 'black' ? 'black' : 'white'
        }))
      : [];

    const incomingProjects = (incoming.projects && typeof incoming.projects === 'object') ? incoming.projects : {};
    const projects = {};
    PROJECT_PAGE_KEYS.forEach((key) => {
      const pc = incomingProjects[key];
      if (!pc || typeof pc !== 'object') return;
      projects[key] = {
        tagline: typeof pc.tagline === 'string' ? pc.tagline.slice(0, 140) : '',
        logo: typeof pc.logo === 'string' ? pc.logo : '',
        hero: typeof pc.hero === 'string' ? pc.hero : '',
        heroMobile: typeof pc.heroMobile === 'string' ? pc.heroMobile : '',
        bio: typeof pc.bio === 'string' ? pc.bio.slice(0, 4000) : '',
        gallery: Array.isArray(pc.gallery) ? pc.gallery.filter((u) => typeof u === 'string').slice(0, 12) : [],
        socials: Array.isArray(pc.socials)
          ? pc.socials.slice(0, 8).map((s) => ({
              label: typeof (s && s.label) === 'string' ? s.label.slice(0, 40) : '',
              url: typeof (s && s.url) === 'string' ? s.url.slice(0, 300) : ''
            }))
          : [],
        mapUrl: typeof pc.mapUrl === 'string' ? pc.mapUrl.slice(0, 2000) : '',
        announcement: typeof pc.announcement === 'string' ? pc.announcement.slice(0, 2000) : ''
      };
    });

    const content = { newsItems, banners, projects };
    await saveSiteContent(content);
    return json(200, { ok: true, content });
  }

  if (action === 'upload-image') {
    const dataUrl = body.dataUrl;
    if (!dataUrl || typeof dataUrl !== 'string') return json(400, { error: 'Bad image data' });
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return json(400, { error: 'Bad image data' });
    const contentType = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) return json(400, { error: 'Image too large (max 5MB)' });
    const id = crypto.randomUUID();
    await imageStore().set(id, buffer, { metadata: { contentType } });
    return json(200, { ok: true, url: `/.netlify/functions/image?id=${id}` });
  }

  return json(400, { error: 'Unknown action' });
};
