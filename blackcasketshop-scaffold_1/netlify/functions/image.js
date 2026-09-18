const { imageStore } = require('./_lib/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) return { statusCode: 400, body: 'Missing id' };

  const store = imageStore();
  const blob = await store.getWithMetadata(id, { type: 'arrayBuffer' });
  if (!blob) return { statusCode: 404, body: 'Not found' };

  const contentType = (blob.metadata && blob.metadata.contentType) || 'application/octet-stream';
  return {
    statusCode: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable'
    },
    isBase64Encoded: true,
    body: Buffer.from(blob.data).toString('base64')
  };
};
