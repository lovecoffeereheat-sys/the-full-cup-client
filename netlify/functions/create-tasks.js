const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  const NOTION_KEY = process.env.NOTION_API_KEY;
  const DB_ID = '6476e38d-65b1-4379-a962-87d9633ebe26';

  if (!NOTION_KEY) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Notion key not configured' }) };

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { tasks } = body;
  if (!tasks || !tasks.length) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'No tasks provided' }) };

  const today = new Date();

  function getDate(timeframe) {
    const d = new Date(today);
    if (timeframe === 'today') {
      return d.toISOString().split('T')[0];
    } else if (timeframe === 'this_week') {
      const day = d.getDay();
      const daysLeft = 5 - day;
      if (daysLeft <= 0) {
        d.setDate(d.getDate() + 1);
      } else {
        d.setDate(d.getDate() + Math.floor(Math.random() * daysLeft) + 1);
      }
      return d.toISOString().split('T')[0];
    } else {
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const daysLeft = lastDay - d.getDate();
      if (daysLeft <= 0) {
        return d.toISOString().split('T')[0];
      }
      d.setDate(d.getDate() + Math.floor(Math.random() * daysLeft) + 1);
      return d.toISOString().split('T')[0];
    }
  }

  const results = { ok: 0, failed: 0, errors: [] };

  for (const task of tasks) {
    const dueDate = getDate(task.timeframe);
    const properties = {
      task: { title: [{ text: { content: task.name } }] },
      status: { select: { name: 'Brain Dump' } },
      priority: { select: { name: task.priority || 'Medium' } },
      'day-to-day': { checkbox: false },
      due: { date: { start: dueDate } },
    };

    try {
      const res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + NOTION_KEY,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({ parent: { database_id: DB_ID }, properties }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        results.failed++;
        results.errors.push(err.message || 'Notion error ' + res.status);
      } else {
        results.ok++;
      }
    } catch (err) {
      results.failed++;
      results.errors.push(err.message);
    }
  }

  return { statusCode: 200, headers: CORS, body: JSON.stringify(results) };
};
