const CONTENT_FIELD_ID = '354e29f0-fa22-471c-a538-00028bd41447'
const TEXT_FIELD_ID = '93af8cc2-fa4a-4b54-b482-8451264eb4a2'
const RANDI_ID = 82087506

async function createTask(listId, name, parentId, customFields, dueDate, token, opts = {}) {
  const body = { name }
  if (parentId) body.parent = parentId
  if (customFields?.length) body.custom_fields = customFields
  if (dueDate) body.due_date = dueDate
  if (opts.status) body.status = opts.status
  if (opts.assignees?.length) body.assignees = opts.assignees
  const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const CLICKUP_TOKEN = Netlify.env.get('CLICKUP_API_KEY')
  if (!CLICKUP_TOKEN) return Response.json({ error: 'Missing CLICKUP_API_KEY env var' }, { status: 500 })

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }

  const {
    listId, weekLabel, startDate,
    parentId: existingParentId,
    email, sms,
    emailHtml: legacyHtml, subjectLine: legacySubject, smsText: legacySms
  } = body

  if (!listId) return Response.json({ error: 'Missing listId' }, { status: 400 })

  const emailPayload = email || (legacyHtml ? { html: legacyHtml, subjectLine: legacySubject } : null)
  const smsPayload = sms || (legacySms ? { text: legacySms } : null)
  if (!emailPayload && !(smsPayload && (smsPayload.text || '').trim())) {
    return Response.json({ error: 'Nothing to save: provide email and/or sms.' }, { status: 400 })
  }

  const dateObj = new Date((startDate || '') + 'T12:00:00Z')
  const dateStr = startDate
    ? dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }).toUpperCase()
    : (weekLabel || '').replace(/^Week of /i, '').replace(/^Camps /i, '').toUpperCase()
  const parentName = `CAMPS WEEK OF ${dateStr}`

  const campStartMs = startDate ? new Date(startDate + 'T12:00:00Z').getTime() : null
  const emailDueMs = campStartMs ? campStartMs - (5 * 24 * 60 * 60 * 1000) : null
  const smsDueMs = campStartMs ? campStartMs - (3 * 24 * 60 * 60 * 1000) : null

  let parentTaskId = existingParentId || null
  let parentUrl = existingParentId ? `https://app.clickup.com/t/${existingParentId}` : null
  if (!parentTaskId) {
    const parent = await createTask(listId, parentName, null, null, campStartMs, CLICKUP_TOKEN)
    if (!parent.id) return Response.json({ error: 'Failed to create parent task: ' + (parent.err || JSON.stringify(parent)) }, { status: 500 })
    parentTaskId = parent.id
    parentUrl = parent.url || `https://app.clickup.com/t/${parent.id}`
  }

  const subtasks = []

  if (emailPayload) {
    const fields = [
      { id: CONTENT_FIELD_ID, value: emailPayload.html || '' },
      ...(emailPayload.subjectLine ? [{ id: TEXT_FIELD_ID, value: emailPayload.subjectLine }] : [])
    ]
    const t = await createTask(listId, 'Email', parentTaskId, fields, emailDueMs, CLICKUP_TOKEN)
    if (!t.id) return Response.json({ error: 'Failed to create Email task: ' + (t.err || JSON.stringify(t)), parentId: parentTaskId, parentUrl }, { status: 500 })
    subtasks.push({ name: 'Email', url: t.url || `https://app.clickup.com/t/${t.id}` })
  }

  if (smsPayload && (smsPayload.text || '').trim()) {
    const fields = [{ id: TEXT_FIELD_ID, value: smsPayload.text.trim() }]
    const t = await createTask(listId, 'SMS', parentTaskId, fields, smsDueMs, CLICKUP_TOKEN, { status: 'priority', assignees: [RANDI_ID] })
    if (!t.id) return Response.json({ error: 'Failed to create SMS task: ' + (t.err || JSON.stringify(t)), parentId: parentTaskId, parentUrl }, { status: 500 })
    subtasks.push({ name: 'SMS', url: t.url || `https://app.clickup.com/t/${t.id}` })
  }

  return Response.json({ parentId: parentTaskId, parentName, parentUrl, subtasks })
}

export const config = { path: '/api/create-tasks' }
