const { getCatalog } = require('./_lib/blobs');
const { isAuthed } = require('./_lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const catalog = await getCatalog();
    const wantAll = event.queryStringParameters && event.queryStringParameters.all === '1';
    const authed = wantAll && isAuthed(event);
    const list = authed ? catalog : catalog.filter((p) => !p.hidden);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(list)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
