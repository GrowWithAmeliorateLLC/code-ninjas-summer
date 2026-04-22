import { useState } from 'react'

const LIME = '#adef32'
const BLUE = '#338fbf'

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d0d0d; font-family: 'DM Sans', sans-serif; color: #e2e8f0; }
  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); }
  @keyframes spin { to { transform: rotate(360deg); } }
`

function Spinner({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', margin: '0 auto 14px', border: '3px solid #2a2a2a', borderTopColor: BLUE, animation: 'spin 0.75s linear infinite' }} />
      <p style={{ color: '#888', fontSize: 14 }}>{message}</p>
    </div>
  )
}

function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{ background: copied ? '#1a5c35' : BLUE, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}

export default function App() {
  const [listName, setListName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [generating, setGenerating] = useState(false)
  const [revising, setRevising] = useState(false)
  const [saving, setSaving] = useState(false)
  const [genMsg, setGenMsg] = useState('')
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [savedTasks, setSavedTasks] = useState(null)
  const [emailPreview, setEmailPreview] = useState(false)
  const [revisionText, setRevisionText] = useState('')

  const genMessages = ['Fetching camps from ClickUp...', 'Reading task details...', 'Generating email...', 'Almost done...']

  async function handleGenerate() {
    if (!listName.trim() || !startDate) { setError('Please enter a ClickUp list name and a start date.'); return }
    setError(null); setResult(null); setSavedTasks(null); setRevisionText(''); setGenerating(true); setGenMsg(genMessages[0])
    let mi = 0
    const interval = setInterval(() => { mi = (mi + 1) % genMessages.length; setGenMsg(genMessages[mi]) }, 3000)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listName: listName.trim(), startDate })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setResult(data); setEmailPreview(false)
    } catch (err) { setError(err.message) }
    finally { clearInterval(interval); setGenerating(false) }
  }

  async function handleRevise() {
    if (!revisionText.trim() || !result) return
    setError(null); setRevising(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listName: listName.trim(),
          startDate,
          revisionInstructions: revisionText.trim(),
          currentEmailHtml: result.email_html,
          preservedData: { location: result.location, week_label: result.week_label, camps: result.camps, listId: result.listId, schedule_url: result.schedule_url, subject_line: result.subject_line }
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Revision failed')
      setResult(prev => ({ ...prev, email_html: data.email_html, subject_line: data.subject_line || prev.subject_line }))
      setRevisionText('')
      setEmailPreview(false)
    } catch (err) { setError(err.message) }
    finally { setRevising(false) }
  }

  async function handleSaveToClickUp() {
    if (!result) return
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/create-tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listName: listName.trim(), listId: result.listId, weekLabel: result.week_label, startDate, emailHtml: result.email_html, subjectLine: result.subject_line })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save to ClickUp')
      setSavedTasks(data)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <>
      <style>{styles}</style>
      <div style={{ minHeight: '100vh', background: '#0d0d0d' }}>

        <div style={{ background: '#000', borderBottom: `3px solid ${BLUE}`, padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="https://www.codeninjas.com/hubfs/Group%201.svg" alt="Code Ninjas" style={{ height: 32 }} />
          <div style={{ borderLeft: '1px solid #222', paddingLeft: 16 }}>
            <p style={{ fontSize: 10, color: LIME, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 2 }}>Ameliorate</p>
            <p style={{ fontSize: 17, color: '#fff', fontWeight: 700 }}>Camp Email Generator</p>
          </div>
        </div>

        <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px' }}>

          <div style={{ background: '#181818', borderRadius: 12, border: '1px solid #2a2a2a', padding: '24px 28px', marginBottom: 24 }}>
            <p style={{ fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 18 }}>Generate Camp Email</p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7 }}>ClickUp List Name</label>
                <input
                  type="text" placeholder="e.g. CN_Draper" value={listName}
                  onChange={e => setListName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                  style={{ width: '100%', background: '#0d0d0d', color: '#fff', border: `1.5px solid ${listName ? BLUE : '#333'}`, borderRadius: 8, padding: '11px 14px', fontSize: 14, outline: 'none' }}
                />
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label style={{ display: 'block', fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7 }}>Camp Week Start Date</label>
                <input
                  type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  style={{ width: '100%', background: '#0d0d0d', color: '#fff', border: `1.5px solid ${startDate ? BLUE : '#333'}`, borderRadius: 8, padding: '11px 14px', fontSize: 14, outline: 'none', colorScheme: 'dark' }}
                />
              </div>
              <button
                onClick={handleGenerate} disabled={generating || revising || saving}
                style={{ background: (generating || revising || saving) ? '#222' : `linear-gradient(135deg, ${LIME}, ${BLUE})`, color: (generating || revising || saving) ? '#555' : '#000', border: 'none', borderRadius: 8, padding: '11px 26px', fontSize: 14, fontWeight: 700, cursor: (generating || revising || saving) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
            {error && (
              <div style={{ marginTop: 14, padding: '11px 14px', background: '#2a1010', border: '1px solid #7a2a2a', borderRadius: 8 }}>
                <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>
              </div>
            )}
          </div>

          {generating && (
            <div style={{ background: '#181818', borderRadius: 12, border: '1px solid #2a2a2a' }}>
              <Spinner message={genMsg} />
            </div>
          )}

          {!result && !generating && (
            <div style={{ background: '#181818', borderRadius: 12, border: '1px dashed #2a2a2a', padding: '52px 24px', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg, ${LIME}, ${BLUE})`, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#000', fontSize: 16, fontWeight: 900 }}>CN</span>
              </div>
              <p style={{ fontSize: 16, color: '#fff', fontWeight: 700, marginBottom: 6 }}>Ready to generate</p>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>
                Enter a ClickUp list name and the Monday of the camp week,<br />
                then hit Generate to build the email.
              </p>
            </div>
          )}

          {result && !generating && (
            <div style={{ background: '#181818', borderRadius: 12, border: '1px solid #2a2a2a', overflow: 'hidden' }}>

              <div style={{ background: '#000', padding: '16px 22px', borderBottom: '1px solid #222' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 11, color: LIME, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 }}>{result.week_label}</p>
                    <p style={{ fontSize: 16, color: '#fff', fontWeight: 700 }}>Code Ninjas {result.location} &mdash; {result.camps?.length || 0} camp{result.camps?.length !== 1 ? 's' : ''}</p>
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {result.camps?.map((c, i) => (
                        <span key={i} style={{ background: '#111', border: `1px solid ${BLUE}44`, color: BLUE, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{c.name}</span>
                      ))}
                    </div>
                    {result.schedule_url && (
                      <p style={{ marginTop: 8, fontSize: 11, color: '#555' }}>
                        Schedule link: <a href={result.schedule_url} target="_blank" rel="noopener noreferrer" style={{ color: LIME, textDecoration: 'none' }}>{result.schedule_url.length > 60 ? result.schedule_url.slice(0, 60) + '...' : result.schedule_url}</a>
                      </p>
                    )}
                  </div>

                  {savedTasks ? (
                    <div style={{ background: '#0d2a1a', border: '1px solid #1a5c35', borderRadius: 8, padding: '12px 16px', maxWidth: 240 }}>
                      <p style={{ fontSize: 12, color: '#4ade80', fontWeight: 700, marginBottom: 6 }}>Saved to ClickUp</p>
                      <a href={savedTasks.parentUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 12, color: BLUE, textDecoration: 'none', marginBottom: 4 }}>{savedTasks.parentName}</a>
                      {savedTasks.subtasks?.map((st, i) => (
                        <a key={i} href={st.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 11, color: '#888', textDecoration: 'none', marginBottom: 2, paddingLeft: 10 }}>{st.name}</a>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={handleSaveToClickUp} disabled={saving}
                      style={{ background: saving ? '#1a1a1a' : '#0d1f2d', border: `1px solid ${saving ? '#333' : BLUE}`, color: saving ? '#555' : BLUE, borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      {saving ? (
                        <><span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #333', borderTopColor: BLUE, display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Saving...</>
                      ) : 'Save to ClickUp'}
                    </button>
                  )}
                </div>
              </div>

              {/* Subject line bar */}
              {result.subject_line && (
                <div style={{ background: '#0f1a0f', borderBottom: '1px solid #1a2a1a', padding: '12px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 10, color: '#555', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Subject</span>
                    <span style={{ fontSize: 14, color: LIME, fontWeight: 600 }}>{result.subject_line}</span>
                  </div>
                  <CopyBtn text={result.subject_line} label="Copy Subject" />
                </div>
              )}

              <div style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <p style={{ fontSize: 12, color: '#666' }}>Paste into Mailchimp as a custom code block.</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setEmailPreview(p => !p)} style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {emailPreview ? 'View Code' : 'Preview'}
                    </button>
                    <CopyBtn text={result.email_html} label="Copy HTML" />
                  </div>
                </div>
                {emailPreview
                  ? <div style={{ border: '1px solid #333', borderRadius: 8, overflow: 'hidden', background: '#fff' }}><iframe srcDoc={result.email_html} style={{ width: '100%', minHeight: 560, border: 'none', display: 'block' }} title="Email Preview" /></div>
                  : <textarea readOnly value={result.email_html} style={{ width: '100%', height: 280, background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 8, color: '#7dd3fc', fontSize: 11, fontFamily: 'monospace', padding: 14, resize: 'vertical', outline: 'none', lineHeight: 1.5 }} />
                }
              </div>

              <div style={{ borderTop: '1px solid #2a2a2a', padding: '20px 22px', background: '#141414' }}>
                <p style={{ fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Request Revisions</p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <textarea
                    value={revisionText}
                    onChange={e => setRevisionText(e.target.value)}
                    placeholder="e.g. Make the intro shorter. Change the CTA to Register Now. Try a different subject line."
                    style={{ flex: 1, background: '#0d0d0d', color: '#e2e8f0', border: `1.5px solid ${revisionText ? LIME : '#333'}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, outline: 'none', resize: 'none', height: 68, lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif' }}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRevise() }}
                  />
                  <button
                    onClick={handleRevise}
                    disabled={revising || !revisionText.trim()}
                    style={{ background: (revising || !revisionText.trim()) ? '#1a1a1a' : `linear-gradient(135deg, ${LIME}, ${BLUE})`, color: (revising || !revisionText.trim()) ? '#555' : '#000', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 13, fontWeight: 700, cursor: (revising || !revisionText.trim()) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0, height: 68 }}
                  >
                    {revising ? 'Revising...' : 'Apply Revisions'}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: '#444', marginTop: 8 }}>Cmd+Enter to apply. You can also ask to try a different subject line.</p>
              </div>

              <div style={{ borderTop: '1px solid #222', padding: '12px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <p style={{ fontSize: 11, color: '#444' }}>New camp week? Update inputs above and regenerate.</p>
                <button onClick={handleGenerate} disabled={generating} style={{ background: 'transparent', border: `1px solid ${LIME}`, color: LIME, borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
