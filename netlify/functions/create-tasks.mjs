const CONTENT_FIELD_ID = '354e29f0-fa22-471c-a538-00028bd41447'

async function createTask(listId, name, parentId, content, description, dueDate, token) {
  const body = { name }
  if (parentId) body.parent = parentId
  if (content) body.custom_fields = [{ id: CONTENT_FIELD_ID, value: content }]
  if (description) body.description = description
  if (dueDate) body.due_date = dueDate
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

  const { listId, weekLabel, startDate, emailHtml, subjectLine } = body
  if (!listId || !weekLabel) return Response.json({ error: 'Missing listId or weekLabel' }, { status: 400 })

  const dateObj = new Date((startDate || '') + 'T12:00:00Z')
  const dateStr = startDate
    ? dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }).toUpperCase()
    : weekLabel.replace('Week of ', '').toUpperCase()
  const parentName = `CAMPS WEEK OF ${dateStr}`

  // Due date = 5 days before camp week start (milliseconds for ClickUp)
  const dueDateMs = startDate
    ? new Date(startDate + 'T12:00:00Z').getTime() - (5 * 24 * 60 * 60 * 1000)
    : null

  const parent = await createTask(listId, parentName, null, null, null, dueDateMs, CLICKUP_TOKEN)
  if (!parent.id) return Response.json({ error: 'Failed to create parent task: ' + (parent.err || JSON.stringify(parent)) }, { status: 500 })

  // Email subtask: HTML in Content field, subject line in description (TEXT field)
  const emailTask = await createTask(listId, 'Email', parent.id, emailHtml || '', subjectLine || '', null, CLICKUP_TOKEN)

  return Response.json({
    parentName,
    parentUrl: parent.url || `https://app.clickup.com/t/${parent.id}`,
    subtasks: [
      { name: 'Email', url: emailTask.url || `https://app.clickup.com/t/${emailTask.id}` }
    ]
  })
}

export const config = { path: '/api/create-tasks' }
