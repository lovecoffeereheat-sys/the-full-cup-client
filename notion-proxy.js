const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const DB_ID = '580e10408b8e4c3fa6018f52aca5fb30';
const NOTION_VERSION = '2022-06-28';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  const NOTION_KEY = process.env.NOTION_API_KEY;
  if (!NOTION_KEY) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Notion key not configured on server' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid request body' }) }; }

  const notionHeaders = {
    'Authorization': 'Bearer ' + NOTION_KEY,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };

  try {
    // ── CREATE PAGE ──────────────────────────────────────────────
    if (body.action === 'create') {
      const res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: notionHeaders,
        body: JSON.stringify({ parent: { database_id: DB_ID }, properties: body.props }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Notion create error ' + res.status);
      return { statusCode: 200, headers: CORS, body: JSON.stringify(data) };
    }

    // ── UPDATE PAGE ──────────────────────────────────────────────
    if (body.action === 'update') {
      const res = await fetch('https://api.notion.com/v1/pages/' + body.pageId, {
        method: 'PATCH',
        headers: notionHeaders,
        body: JSON.stringify({ properties: body.props }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Notion update error ' + res.status);
      return { statusCode: 200, headers: CORS, body: JSON.stringify(data) };
    }

    // ── QUERY DATABASE ───────────────────────────────────────────
    if (body.action === 'query') {
      const queryBody = { page_size: 50 };
      if (body.filter) queryBody.filter = body.filter;
      if (body.sorts) queryBody.sorts = body.sorts;
      const res = await fetch('https://api.notion.com/v1/databases/' + DB_ID + '/query', {
        method: 'POST',
        headers: notionHeaders,
        body: JSON.stringify(queryBody),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Notion query error ' + res.status);
      return { statusCode: 200, headers: CORS, body: JSON.stringify(data) };
    }

    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unknown action: ' + body.action }) };

  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
