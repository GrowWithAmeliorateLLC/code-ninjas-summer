const SPACE_ID = '901313618762'
const CONTENT_FIELD_ID = '354e29f0-fa22-471c-a538-00028bd41447'
const BOOKING_URL_FIELD_ID = '93af8cc2-fa4a-4b54-b482-8451264eb4a2'

async function findListByName(listName, token) {
  const headers = { Authorization: token }
  const lower = listName.toLowerCase()
  try {
    const r = await fetch(`https://api.clickup.com/api/v2/space/${SPACE_ID}/list?archived=false`, { headers })
    const d = await r.json()
    const found = (d.lists || []).find(l => l.name.toLowerCase() === lower)
    if (found) return found.id
  } catch (_) {}
  try {
    const fr = await fetch(`https://api.clickup.com/api/v2/space/${SPACE_ID}/folder?archived=false`, { headers })
    const fd = await fr.json()
    for (const folder of (fd.folders || [])) {
      const lr = await fetch(`https://api.clickup.com/api/v2/folder/${folder.id}/list?archived=false`, { headers })
      const ld = await lr.json()
      const found = (ld.lists || []).find(l => l.name.toLowerCase() === lower)
      if (found) return found.id
    }
  } catch (_) {}
  return null
}

function getFieldValue(task, fieldId) {
  return ((task.custom_fields || []).find(f => f.id === fieldId) || {}).value || ''
}

const SYSTEM_PROMPT = `You are a Code Ninjas marketing content specialist.

Given camp data, produce THREE marketing assets. Respond ONLY with valid JSON — no markdown fences, no extra text.

BRAND RULES:
- Colors: black #000000, CN blue #338fbf
- CN logo: https://www.codeninjas.com/hubfs/Group%201.svg
- All links: target="_blank" rel="noopener noreferrer"
- Tone: engaging, parent-friendly — not salesy
- Rewrite descriptions in your own words
- No specific dates in email/SMS — use week label only
- Avoid: unleash, ignite, unlock, fluff

EMAIL: Full self-contained HTML. Black header with CN logo + location in blue. One card per camp: black header with name + price, blue time badge, description, blue CTA button. No footer.

OUTPUT (valid JSON only):
{
  "location": "title case dojo name",
  "week_label": "Week of Month Day",
  "camps": [{"name":"","time":"","session":"","price":"","admin_fee":"","description":"","booking_url":""}],
  "email_html": "...",
  "sms": "under 160 chars with dojo, week, camps summary, CTA + booking URL",
  "social_caption": "3-5 sentences, emoji-forward, conversational, CTA, no generic hashtags"
}`

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const CLICKUP_TOKEN = Netlify.env.get('CLICKUP_API_KEY')
  const ANTHROPIC_KEY = Netlify.env.get('ANTHROPIC_API_KEY')

  if (!CLICKUP_TOKEN || !ANTHROPIC_KEY) {
    return Response.json({ error: 'Missing API keys — check Netlify env vars: CLICKUP_API_KEY and ANTHROPIC_API_KEY' }, { status: 500 })
  }

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }

  const { listName, startDate } = body
  if (!listName || !startDate) return Response.json({ error: 'Missing listName or startDate' }, { status: 400 })

  const listId = await findListByName(listName, CLICKUP_TOKEN)
  if (!listId) return Response.json({ error: `List "${listName}" not found in the CODE NINJAS space.` }, { status: 404 })

  const tasksRes = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?archived=false&subtasks=false&include_closed=false`, { headers: { Authorization: CLICKUP_TOKEN } })
  const tasksData = await tasksRes.json()
  const allTasks = tasksData.tasks || []

  const startMs = new Date(startDate + 'T00:00:00Z').getTime()
  const endMs = startMs + 9 * 24 * 60 * 60 * 1000

  const campTasks = allTasks.filter(t => {
    const url = getFieldValue(t, BOOKING_URL_FIELD_ID)
    if (!url || !url.startsWith('http')) return false
    if (!t.due_date) return true
    const due = parseInt(t.due_date)
    return due >= (startMs - 24 * 60 * 60 * 1000) && due <= endMs
  })

  if (campTasks.length === 0) {
    return Response.json({ error: `No camp tasks found in "${listName}" for the week of ${startDate}. Tasks need booking URLs in the Text field.` }, { status: 404 })
  }

  const camps = campTasks.map(t => ({
    name: t.name,
    description: getFieldValue(t, CONTENT_FIELD_ID).replace(/&nbsp;/g, ' ').trim(),
    booking_url: getFieldValue(t, BOOKING_URL_FIELD_ID),
    price: t.name.toLowerCase().includes('full day') ? '$499' : '$299',
    admin_fee: t.name.toLowerCase().includes('full day') ? '$13.78' : '$8.34'
  }))

  const dateObj = new Date(startDate + 'T12:00:00Z')
  const weekLabel = 'Week of ' + dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
  const location = listName.replace(/^CN_/i, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const userMsg = `List: "${listName}" | Location: "${location}" | Week: "${weekLabel}"\n\nCamps (${camps.length}):\n${JSON.stringify(camps, null, 2)}\n\nGenerate the full content package as JSON.`

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 8000, system: SYSTEM_PROMPT, messages: [{ role: 'user', content: userMsg }] })
  })

  const anthropicData = await anthropicRes.json()
  if (anthropicData.error) return Response.json({ error: 'Anthropic: ' + anthropicData.error.message }, { status: 500 })

  const raw = (anthropicData.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
  const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  let parsed
  try { parsed = JSON.parse(clean) } catch { return Response.json({ error: 'Failed to parse AI response — please try again.' }, { status: 500 }) }

  return Response.json({ ...parsed, listId })
}

export const config = { path: '/api/generate' }
