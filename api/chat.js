const NOTION_VERSION = '2026-03-11';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function notion(path, options = {}) {
  const base = 'https://' + 'api.notion.com';
  const response = await fetch(base + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || `Notion request failed (${response.status})`);
  return data;
}

async function resolveAgentId() {
  if (process.env.NOTION_AGENT_ID) return process.env.NOTION_AGENT_ID;
  const name = process.env.NOTION_AGENT_NAME || 'Nazifa Mobile';
  const list = await notion('/v1/agents/query', {
    method: 'POST',
    body: JSON.stringify({ query: name, page_size: 10 })
  });
  const match = (list.results || []).find(agent => agent.name === name) || list.results?.[0];
  if (!match?.id) throw new Error(`No accessible Notion Custom Agent named "${name}" was found.`);
  return match.id;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.NOTION_API_KEY) return res.status(503).json({ error: 'NOTION_API_KEY is not configured.' });

  const { message, sessionId } = req.body || {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'A message is required.' });

  try {
    const payload = sessionId
      ? { session_id: sessionId, message }
      : { agent_id: await resolveAgentId(), message };
    const session = await notion('/v1/sessions', { method: 'POST', body: JSON.stringify(payload) });
    const id = session.id || sessionId;

    let status = session.status;
    for (let i = 0; i < 30 && ['queued', 'in_progress'].includes(status); i++) {
      await sleep(1000);
      const current = await notion(`/v1/sessions/${id}`);
      status = current.status;
    }
    if (status !== 'completed') throw new Error(`Agent session ended with status: ${status}`);

    const events = await notion(`/v1/sessions/${id}/events/query`, {
      method: 'POST',
      body: JSON.stringify({ filter: { property: 'type', event_type: { equals: 'agent.message' } } })
    });
    const latest = [...(events.results || [])].sort((a, b) => (b.sequence || 0) - (a.sequence || 0))[0];
    const text = (latest?.content || []).filter(part => part.type === 'text').map(part => part.text).join('');
    return res.status(200).json({ message: text || 'The agent returned an empty response.', sessionId: id });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to reach Notion Agent.' });
  }
}
