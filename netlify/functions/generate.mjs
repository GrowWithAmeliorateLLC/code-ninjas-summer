const SPACE_ID = '901313618762'
const CONTENT_FIELD_ID = '354e29f0-fa22-471c-a538-00028bd41447'
const BOOKING_URL_FIELD_ID = '93af8cc2-fa4a-4b54-b482-8451264eb4a2'
const DEFAULT_SUBJECT = '\uD83D\uDC40 Next Week\'s Camps'

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

function extractUrl(text) {
  const match = (text || '').match(/https?:\/\/[^\s<>"'\n]+/)
  return match ? match[0].trim() : null
}

function findScheduleUrl(tasks) {
  for (const task of tasks) {
    const name = (task.name || '').toLowerCase()
    if (name.includes('mystudio') || name.includes('my studio')) {
      const desc = task.description || task.text_content || ''
      const url = extractUrl(desc)
      if (url) return url
      for (const field of (task.custom_fields || [])) {
        const val = typeof field.value === 'string' ? field.value : ''
        const url2 = extractUrl(val)
        if (url2) return url2
      }
    }
  }
  for (const task of tasks) {
    const bookingUrl = getFieldValue(task, BOOKING_URL_FIELD_ID)
    if (bookingUrl) continue
    const desc = task.description || task.text_content || ''
    const url = extractUrl(desc)
    if (url && (url.includes('mystudio') || url.includes('members.codeninjas') || url.includes('bit.ly'))) {
      return url
    }
  }
  return null
}

const EMAIL_SYSTEM_PROMPT = `You are a Code Ninjas marketing content specialist.

Given camp data, produce an HTML email. Respond ONLY with valid JSON - no markdown fences, no extra text.

RULES:
- Colors: black #000000, CN blue #338fbf
- CN logo: https://www.codeninjas.com/hubfs/Group%201.svg
- All links: target="_blank" rel="noopener noreferrer"
- Tone: engaging, parent-friendly
- Rewrite descriptions in your own words (do not copy verbatim)
- NO specific dates in email body - use week label only
- NO pricing or admin fees - do not mention cost anywhere
- NO footer (Mailchimp handles that)
- Include a "View Full Summer Camp Schedule" CTA button using the schedule_url if provided
- One card per camp: black header with camp name, blue time badge, short description, blue CTA button linking to booking_url
- EMAIL must be full self-contained HTML with inline CSS (email-safe)

OUTPUT (valid JSON only):
{
  "location": "title case dojo name",
  "week_label": "Week of Month Day",
  "camps": [{"name":"","time":"","session":"","description":"","booking_url":""}],
  "email_html": "..."
}`

const REVISION_SYSTEM_PROMPT = `You are revising an HTML email for Code Ninjas.
Apply the requested revisions while keeping all links, brand colors (#000000, #338fbf), CN logo, and structure intact.
Do NOT add pricing, specific dates, or footer content.
Respond ONLY with valid JSON: {"email_html": "...revised full HTML..."}`

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const CLICKUP_TOKEN = Netlify.env.get('CLICKUP_API_KEY')
  const ANTHROPIC_KEY = Netlify.env.get('ANTHROPIC_API_KEY')

  if (!CLICKUP_TOKEN || !ANTHROPIC_KEY) {
    return Response.json({ error: 'Missing API keys - check Netlify env vars: CLICKUP_API_KEY and ANTHROPIC_API_KEY' }, { status: 500 })
  }

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }

  const { listName, startDate, revisionInstructions, currentEmailHtml, preservedData } = body

  // --- REVISION MODE ---
  if (revisionInstructions && currentEmailHtml) {
    const revRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8000,
        system: REVISION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Current email HTML:\n${currentEmailHtml}\n\nRevisions requested: ${revisionInstructions}` }]
      })
    })
    const revData = await revRes.json()
    if (revData.error) return Response.json({ error: 'Anthropic: ' + revData.error.message }, { status: 500 })
    const raw = (revData.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
    const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    let parsed
    try { parsed = JSON.parse(clean) } catch { return Response.json({ error: 'Failed to parse revision response.' }, { status: 500 }) }
    return Response.json({ ...preservedData, email_html: parsed.email_html })
  }

  // --- GENERATE MODE ---
  if (!listName || !startDate) return Response.json({ error: 'Missing listName or startDate' }, { status: 400 })

  const listId = await findListByName(listName, CLICKUP_TOKEN)
  if (!listId) return Response.json({ error: `List "${listName}" not found in the CODE NINJAS space.` }, { status: 404 })

  const tasksRes = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?archived=false&subtasks=true&include_closed=true`, { headers: { Authorization: CLICKUP_TOKEN } })
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
    return Response.json({ error: `No camp tasks found in "${listName}" for the week of ${startDate}.` }, { status: 404 })
  }

  const scheduleUrl = findScheduleUrl(allTasks)

  const camps = campTasks.map(t => ({
    name: t.name,
    description: getFieldValue(t, CONTENT_FIELD_ID).replace(/&nbsp;/g, ' ').trim(),
    booking_url: getFieldValue(t, BOOKING_URL_FIELD_ID),
    time: t.name.toLowerCase().includes('full day') ? '8:30 AM - 3:00 PM' : '8:30 AM - 11:30 AM',
    session: t.name.toLowerCase().includes('full day') ? 'Full Day' : 'Half Day'
  }))

  const dateObj = new Date(startDate + 'T12:00:00Z')
  const weekLabel = 'Week of ' + dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
  const location = listName.replace(/^CN_/i, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const userMsg = `List: "${listName}" | Location: "${location}" | Week: "${weekLabel}"
Schedule URL: ${scheduleUrl || 'not found'}

Camps (${camps.length}):
${JSON.stringify(camps, null, 2)}

Generate the email HTML as JSON.`

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 8000, system: EMAIL_SYSTEM_PROMPT, messages: [{ role: 'user', content: userMsg }] })
  })

  const anthropicData = await anthropicRes.json()
  if (anthropicData.error) return Response.json({ error: 'Anthropic: ' + anthropicData.error.message }, { status: 500 })

  const raw = (anthropicData.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
  const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  let parsed
  try { parsed = JSON.parse(clean) } catch { return Response.json({ error: 'Failed to parse AI response.' }, { status: 500 }) }

  return Response.json({ ...parsed, listId, schedule_url: scheduleUrl, subject_line: DEFAULT_SUBJECT })
}

export const config = { path: '/api/generate' }
