const SPACE_ID = '901313618762'
const CU_BASE = 'https://api.clickup.com/api/v2'
const CONTENT_FIELD_ID = '354e29f0-fa22-471c-a538-00028bd41447'
const URL_FIELD_ID = '93af8cc2-fa4a-4b54-b482-8451264eb4a2'
const DEFAULT_SUBJECT = '\u{1F440} Summer Camps Starting Soon'

function getCampColor(name) {
  const n = name.toLowerCase()
  if (/\bjr[\s:.]/u.test(n) || n.startsWith('jr '))
    return { dark:'#1a1400', light:'#fffde7', btn:'#f57f17', accent:'#ffe082', border:'#f9a825' }
  if (n.includes('minecraft'))
    return { dark:'#0d1f0d', light:'#f0faf0', btn:'#2e7d32', accent:'#4caf50' }
  if (n.includes('roblox'))
    return { dark:'#1a0a1a', light:'#fce4ec', btn:'#c62828', accent:'#ef9a9a' }
  if (n.includes('stop motion') || n.includes('animation'))
    return { dark:'#1a0a00', light:'#fff3e0', btn:'#e65100', accent:'#ffcc80' }
  if (n.includes('3d') || n.includes('tinkercad') || n.includes('blender') || n.includes('print'))
    return { dark:'#12003a', light:'#ede7f6', btn:'#6a1b9a', accent:'#ce93d8' }
  if (/\bai\b/u.test(n) || n.includes('machine learning') || n.includes('teachable'))
    return { dark:'#1a0a2e', light:'#f3e5f5', btn:'#7b1fa2', accent:'#ce93d8' }
  if (n.includes('youtube') || n.includes('digital director') || n.includes('content studio') || n.includes('content creator'))
    return { dark:'#1a1a2e', light:'#eef4ff', btn:'#338fbf', accent:'#90caf9' }
  if (n.includes('robotics') || n.includes('robot') || n.includes('lego') || n.includes('ozobot'))
    return { dark:'#0d2000', light:'#e8f5e9', btn:'#2e7d32', accent:'#a5d6a7' }
  if (n.includes('esports') || n.includes('game coding') || n.includes('gamemaking') || n.includes('retro arcade') || n.includes('codecombat'))
    return { dark:'#0a0a1f', light:'#e8eaf6', btn:'#283593', accent:'#90caf9' }
  if (n.includes('cyber') || n.includes('codebreak') || n.includes('cryptograph'))
    return { dark:'#1a1a1a', light:'#eceff1', btn:'#37474f', accent:'#b0bec5' }
  if (n.includes('python'))
    return { dark:'#0d2a2a', light:'#e0f7fa', btn:'#00695c', accent:'#80cbc4' }
  if (n.includes('app inventor') || n.includes('app design') || n.includes('mobile app'))
    return { dark:'#0d1f3a', light:'#dbeeff', btn:'#1565c0', accent:'#90caf9' }
  if (n.includes('stem'))
    return { dark:'#0d1f2d', light:'#e8f0fe', btn:'#1565c0', accent:'#90caf9' }
  return { dark:'#1a2a3a', light:'#e8f0fe', btn:'#338fbf', accent:'#90caf9' }
}

function formatDateRange(dueDateMs) {
  const start = new Date(dueDateMs)
  const end = new Date(dueDateMs)
  end.setDate(end.getDate() + 4)
  const opts = { month: 'short', day: 'numeric' }
  const startStr = start.toLocaleDateString('en-US', opts)
  const crossMonth = end.getMonth() !== start.getMonth()
  const endStr = crossMonth ? end.toLocaleDateString('en-US', opts) : String(end.getDate())
  return `${startStr}\u2013${endStr}, ${end.getFullYear()}`
}

function buildCampCard(camp) {
  const c = getCampColor(camp.name)
  const isJR = /\bjr[\s:.]/u.test(camp.name.toLowerCase()) || camp.name.toLowerCase().startsWith('jr ')
  const borderStyle = isJR ? `border:1.5px solid ${c.border || c.btn};border-top:none;` : ''
  const rightBadge = camp.fullDay
    ? `<td valign="middle" align="right" style="padding-left:10px;white-space:nowrap;"><span style="display:inline-block;background-color:#338fbf;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;padding:3px 8px;border-radius:3px;letter-spacing:1px;text-transform:uppercase;">Full Day</span></td>`
    : '<td></td>'
  const ageStr = camp.ages ? ` &bull;&nbsp;${camp.ages}` : ''
  const dateStr = camp.dates ? `<br /><span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${c.accent};font-weight:600;">${camp.dates}</span>` : ''
  const snippetHtml = camp.snippet
    ? `<p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 14px;font-size:13px;color:#444444;line-height:1.6;">${camp.snippet}</p>`
    : ''
  const btnHtml = camp.booking_url
    ? `<a href="${camp.booking_url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:${c.btn};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;text-decoration:none;padding:9px 20px;border-radius:5px;">Register Now</a>`
    : ''
  return `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:10px;">
          <tr>
            <td bgcolor="${c.dark}" style="background-color:${c.dark};padding:14px 20px;border-radius:8px 8px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td valign="middle">
                    <p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 2px;font-size:15px;font-weight:900;color:#ffffff;">${camp.name}</p>
                    <p style="font-family:Arial,Helvetica,sans-serif;margin:0;font-size:12px;color:${c.accent};font-weight:700;">${ageStr}${dateStr}</p>
                  </td>
                  ${rightBadge}
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="${c.light}" style="background-color:${c.light};padding:16px 20px 18px;border-radius:0 0 8px 8px;${borderStyle}">
              ${snippetHtml}
              ${btnHtml}
            </td>
          </tr>
        </table>`
}

function buildEmailHtml({ location, week_label, imageUrl, camps, schedule_url, intro, subject_line }) {
  const heroBlock = imageUrl ? `
        <tr>
          <td style="padding:0;line-height:0;">
            <img src="${imageUrl}" alt="${location} Summer Camps" width="620" style="display:block;width:100%;max-width:620px;height:auto;border:0;" />
          </td>
        </tr>` : ''
  const campCards = camps.map(buildCampCard).join('\n')
  const introHtml = intro
    ? `\n        <tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:24px 32px 8px;text-align:center;"><p style="font-family:Arial,Helvetica,sans-serif;margin:0;font-size:15px;color:#444444;line-height:1.7;">${intro}</p></td></tr>`
    : ''
  const ctaHref = schedule_url || 'https://www.codeninjas.com'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject_line || week_label} &mdash; Code Ninjas ${location}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4" style="border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:24px 0 40px;">
      <table width="620" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border-collapse:collapse;max-width:620px;width:100%;background-color:#ffffff;">
        <tr>
          <td bgcolor="#000000" style="background-color:#000000;padding:24px 32px;text-align:center;">
            <img src="https://www.codeninjas.com/hubfs/Group%201.svg" alt="Code Ninjas" width="180" style="display:inline-block;height:auto;border:0;" />
            <p style="font-family:Arial,Helvetica,sans-serif;margin:12px 0 4px;font-size:13px;color:#338fbf;font-weight:700;letter-spacing:3px;text-transform:uppercase;">${location}</p>
            <h1 style="font-family:Arial,Helvetica,sans-serif;margin:6px 0;font-size:26px;color:#ffffff;font-weight:900;line-height:1.2;">${week_label}</h1>
          </td>
        </tr>
${heroBlock}
${introHtml}
        <tr>
          <td bgcolor="#ffffff" style="background-color:#ffffff;padding:20px 32px 10px;">
            <p style="font-family:Arial,Helvetica,sans-serif;margin:0;font-size:11px;color:#338fbf;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Camps This Week</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 20px;">
${campCards}
          </td>
        </tr>
        <tr>
          <td bgcolor="#ffffff" style="background-color:#ffffff;padding:12px 32px 32px;text-align:center;">
            <p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 20px;font-size:14px;color:#888888;">Spots are limited &mdash; register early.</p>
            <a href="${ctaHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#338fbf;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:6px;">View All Camps &amp; Register</a>
          </td>
        </tr>
        <tr>
          <td bgcolor="#000000" style="background-color:#000000;padding:20px 32px;text-align:center;">
            <img src="https://www.codeninjas.com/hubfs/Group%201.svg" alt="Code Ninjas" width="120" style="display:inline-block;height:auto;border:0;margin-bottom:10px;" />
            <p style="font-family:Arial,Helvetica,sans-serif;margin:0;font-size:12px;color:#666666;">Code Ninjas ${location}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

async function cuFetch(path, token) {
  const res = await fetch(`${CU_BASE}${path}`, { headers: { Authorization: token } })
  if (!res.ok) throw new Error(`ClickUp ${res.status}: ${path}`)
  return res.json()
}

function getField(task, fieldId) {
  return task.custom_fields?.find(f => f.id === fieldId)?.value || ''
}

async function findListByName(name, token) {
  const data = await cuFetch(`/space/${SPACE_ID}/list?archived=false`, token)
  const list = (data.lists || []).find(l => l.name.toLowerCase() === name.toLowerCase())
  if (!list) throw new Error(`List "${name}" not found in CODE NINJAS space.`)
  return list
}

async function getCampsForWeek(listId, startDate, token) {
  const start = new Date(startDate + 'T00:00:00.000Z')
  const end = new Date(start); end.setDate(end.getDate() + 7)
  const data = await cuFetch(
    `/list/${listId}/task?due_date_gt=${start.getTime()}&due_date_lt=${end.getTime()}&archived=false&subtasks=false`,
    token
  )
  return (data.tasks || []).filter(t => !/^CAMP(S)?\s/i.test(t.name.trim()))
}

async function getTaskDetail(taskId, token) {
  return cuFetch(`/task/${taskId}`, token)
}

async function callClaude(messages, maxTokens = 1400) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens, messages })
  })
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

async function generateSnippets(camps, location, weekLabel) {
  const campList = camps.map((c, i) =>
    `${i + 1}. ${c.name}${c.ages ? ` (${c.ages})` : ''}${c.description ? `\nDescription: ${c.description.slice(0, 400)}` : ''}`
  ).join('\n\n')
  const prompt = `You are writing copy for a Code Ninjas ${location} summer camp email for ${weekLabel}.\n\nCamps:\n${campList}\n\nReturn ONLY valid JSON, no markdown:\n{\n  "subject_line": "6-10 word subject line with a relevant emoji. No day names.",\n  "intro": "1-2 sentence email intro mentioning ${location}. No day names, no AM/PM.",\n  "camps": [\n    { "name": "exact name from input", "snippet": "1-2 sentences. Mention specific tools or projects. Active voice. No times, no day names." }\n  ]\n}\n\nSnippet rules: action-oriented, mention real tools (MCreator, Scratch, LEGO SPIKE, Blockbench, etc.) when available, 1-2 sentences max, never mention times or day names.`
  const raw = await callClaude([{ role: 'user', content: prompt }])
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    return { subject_line: DEFAULT_SUBJECT, intro: '', camps: camps.map(c => ({ name: c.name, snippet: '' })) }
  }
}

async function reviseEmail(currentHtml, instructions, preservedData) {
  const prompt = `Edit this HTML email for Code Ninjas ${preservedData?.location || ''}.\n\nInstructions: ${instructions}\n\nRules: never use day names in dates, never use AM/PM, keep all booking URLs unchanged.\n\nReturn ONLY the complete updated HTML, no explanation.\n\n${currentHtml}`
  const raw = await callClaude([{ role: 'user', content: prompt }], 8000)
  const html = raw.replace(/^```html\n?|^```\n?|```$/gm, '').trim()
  return { email_html: html, subject_line: preservedData?.subject_line }
}

export default async (req) => {
  try {
    const body = await req.json()
    const { listName, startDate, imageUrl, revisionInstructions, currentEmailHtml, preservedData } = body
    const CU_TOKEN = process.env.CLICKUP_API_KEY

    if (revisionInstructions && currentEmailHtml) {
      const revised = await reviseEmail(currentEmailHtml, revisionInstructions, preservedData)
      return Response.json(revised)
    }

    if (!listName || !startDate) {
      return Response.json({ error: 'listName and startDate are required' }, { status: 400 })
    }

    const list = await findListByName(listName, CU_TOKEN)
    const listId = list.id
    const tasks = await getCampsForWeek(listId, startDate, CU_TOKEN)
    if (!tasks.length) {
      return Response.json({ error: `No camps found in "${listName}" for the week of ${startDate}.` }, { status: 404 })
    }

    const campDetails = await Promise.all(tasks.map(async (task) => {
      try {
        const detail = await getTaskDetail(task.id, CU_TOKEN)
        const bookingUrl = getField(detail, URL_FIELD_ID)
        const description = getField(detail, CONTENT_FIELD_ID)
        const rawName = task.name
        const agesMatch = rawName.match(/\((\d[\d\-\+]*)\)/)
        const ages = agesMatch ? `Ages ${agesMatch[1]}` : ''
        const cleanName = rawName.replace(/\s*\([\d\-\+]+\)\s*/g, '').replace(/\s*\|.*$/, '').trim()
        const fullDay = /full.?day/i.test(rawName)
        return {
          id: task.id, name: cleanName, ages, fullDay,
          dates: formatDateRange(parseInt(task.due_date)),
          booking_url: bookingUrl,
          description: description?.slice(0, 500) || '',
          display_label: ''
        }
      } catch {
        return { id: task.id, name: task.name, ages: '', fullDay: false, dates: '', booking_url: '', description: '', display_label: '' }
      }
    }))

    const location = listName.replace(/^CN_/i, '').replace(/([A-Z])/g, ' $1').trim()
    const weekStart = new Date(startDate + 'T00:00:00Z')
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 4)
    const week_label = `Camps ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}\u2013${weekEnd.getDate()}, ${weekEnd.getFullYear()}`

    const aiContent = await generateSnippets(campDetails, location, week_label)

    const camps = campDetails.map(camp => {
      const aiCamp = aiContent.camps?.find(c =>
        c.name.toLowerCase().includes(camp.name.toLowerCase().slice(0, 10))
      )
      return { ...camp, snippet: aiCamp?.snippet || '' }
    })

    const email_html = buildEmailHtml({
      location, week_label,
      imageUrl: imageUrl || null,
      camps,
      schedule_url: 'https://www.codeninjas.com',
      intro: aiContent.intro || '',
      subject_line: aiContent.subject_line || DEFAULT_SUBJECT
    })

    return Response.json({
      email_html,
      subject_line: aiContent.subject_line || DEFAULT_SUBJECT,
      location, week_label,
      camps: camps.map(c => ({ name: c.name })),
      listId,
      schedule_url: ''
    })

  } catch (err) {
    console.error('Generate error:', err)
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
