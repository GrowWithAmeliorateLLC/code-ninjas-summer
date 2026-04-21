import { useState } from 'react'

const CN_BLUE = '#338fbf'

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
      <div style={{ width: 40, height: 40, borderRadius: '50%', margin: '0 auto 14px', border: '3px solid #2a2a2a', borderTopColor: CN_BLUE, animation: 'spin 0.75s linear infinite' }} />
      <p style={{ color: '#888', fontSize: 14 }}>{message}</p>
    </div>
  )
}

function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{ background: copied ? '#1a5c35' : CN_BLUE, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}>
      {copied ? '\u2713 Copied!' : `\uD83D\uDCCB ${label}`}
    </button>
  )
}

export default function App() {
  const [listName, setListName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [genMsg, setGenMsg] = useState('')
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [savedTasks, setSavedTasks] = useState(null)
  const [activeTab, setActiveTab] = useState('email')
  const [emailPreview, setEmailPreview] = useState(false)

  const genMessages = ['Fetching camps from ClickUp\u2026', 'Reading task details\u2026', 'Generating email, SMS & caption\u2026', 'Almost done\u2026']

  async function handleGenerate() {
    if (!listName.trim() || !startDate) { setError('Please enter a ClickUp list name and a start date.'); return }
    setError(null); setResult(null); setSavedTasks(null); setGenerating(true); setGenMsg(genMessages[0])
    let mi = 0
    const interval = setInterval(() => { mi = (mi + 1) % genMessages.length; setGenMsg(genMessages[mi]) }, 3000)
    try {
      const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listName: listName.trim(), startDate }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setResult(data); setActiveTab('email'); setEmailPreview(false)
    } catch (err) { setError(err.message) }
    finally { clearInterval(interval); setGenerating(false) }
  }

  async function handleSaveToClickUp() {
    if (!result) return
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/create-tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listName: listName.trim(), listId: result.listId, weekLabel: result.week_label, startDate, emailHtml: result.email_html, sms: result.sms, socialCaption: result.social_caption }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save to ClickUp')
      setSavedTasks(data)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const tabs = [{ id: 'email', label: '\uD83D\uDCE7 Email' }, { id: 'sms', label: '\uD83D\uDCAC SMS' }, { id: 'social', label: '\uD83D\uDCF1 Social' }]
  const smsLen = result?.sms?.length || 0

  return (
    <>
      <style>{styles}</style>
      <div style={{ minHeight: '100vh', background: '#0d0d0d' }}>
        <div style={{ background: '#000', borderBottom: `3px solid ${CN_BLUE}`, padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="https://www.codeninjas.com/hubfs/Group%201.svg" alt="Code Ninjas" style={{ height: 32 }} />
          <div style={{ borderLeft: '1px solid #333', paddingLeft: 16 }}>
            <p style={{ fontSize: 10, color: CN_BLUE, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 2 }}>Ameliorate</p>
            <p style={{ fontSize: 17, color: '#fff', fontWeight: 700 }}>Camp Content Generator</p>
          </div>
        </div>

        <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>
          <div style={{ background: '#181818', borderRadius: 12, border: '1px solid #2a2a2a', padding: '24px 28px', marginBottom: 24 }}>
            <p style={{ fontSize: 11, color: '#666', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 18 }}>Generate Content Package</p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7 }}>ClickUp List Name</label>
                <input type="text" placeholder="e.g. CN_Draper" value={listName} onChange={e => setListName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                  style={{ width: '100%', background: '#0d0d0d', color: '#fff', border: `1.5px solid ${listName ? CN_BLUE : '#333'}`, borderRadius: 8, padding: '11px 14px', fontSize: 14, outline: 'none' }} />
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label style={{ display: 'block', fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7 }}>Camp Week Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  style={{ width: '100%', background: '#0d0d0d', color: '#fff', border: `1.5px solid ${startDate ? CN_BLUE : '#333'}`, borderRadius: 8, padding: '11px 14px', fontSize: 14, outline: 'none', colorScheme: 'dark' }} />
              </div>
              <button onClick={handleGenerate} disabled={generating || saving}
                style={{ background: (generating || saving) ? '#222' : `linear-gradient(135deg, ${CN_BLUE}, #2478a0)`, color: (generating || saving) ? '#555' : '#fff', border: 'none', borderRadius: 8, padding: '11px 26px', fontSize: 14, fontWeight: 700, cursor: (generating || saving) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {generating ? 'Generating\u2026' : '\u26A1 Generate'}
              </button>
            </div>
            {error && <div style={{ marginTop: 14, padding: '11px 14px', background: '#2a1010', border: '1px solid #7a2a2a', borderRadius: 8 }}><p style={{ color: '#f87171', fontSize: 13 }}>\u26A0\uFE0F {error}</p></div>}
          </div>

          {generating && <div style={{ background: '#181818', borderRadius: 12, border: '1px solid #2a2a2a' }}><Spinner message={genMsg} /></div>}

          {!result && !generating && (
            <div style={{ background: '#181818', borderRadius: 12, border: '1px dashed #2a2a2a', padding: '52px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>\uD83E\uDD77</div>
              <p style={{ fontSize: 16, color: '#fff', fontWeight: 700, marginBottom: 6 }}>Ready to generate</p>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>Enter a ClickUp list name and the Monday of the camp week,<br />then hit Generate to build your full content package.</p>
            </div>
          )}

          {result && !generating && (
            <div style={{ background: '#181818', borderRadius: 12, border: '1px solid #2a2a2a', overflow: 'hidden' }}>
              <div style={{ background: '#000', padding: '16px 22px', borderBottom: '1px solid #222' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 11, color: CN_BLUE, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 }}>{result.week_label}</p>
                    <p style={{ fontSize: 16, color: '#fff', fontWeight: 700 }}>Code Ninjas {result.location} \u2014 {result.camps?.length || 0} camp{result.camps?.length !== 1 ? 's' : ''}</p>
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {result.camps?.map((c, i) => <span key={i} style={{ background: '#1a1a1a', border: `1px solid ${CN_BLUE}44`, color: CN_BLUE, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{c.name}</span>)}
                    </div>
                  </div>
                  {savedTasks ? (
                    <div style={{ background: '#0d2a1a', border: '1px solid #1a5c35', borderRadius: 8, padding: '12px 16px', maxWidth: 280 }}>
                      <p style={{ fontSize: 12, color: '#4ade80', fontWeight: 700, marginBottom: 6 }}>\u2713 Saved to ClickUp</p>
                      <a href={savedTasks.parentUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 12, color: CN_BLUE, textDecoration: 'none', marginBottom: 4 }}>\u2192 {savedTasks.parentName}</a>
                      {savedTasks.subtasks?.map((st, i) => <a key={i} href={st.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 11, color: '#888', textDecoration: 'none', marginBottom: 2 }}>&nbsp;&nbsp;\u21B3 {st.name}</a>)}
                    </div>
                  ) : (
                    <button onClick={handleSaveToClickUp} disabled={saving}
                      style={{ background: saving ? '#1a1a1a' : '#0d1f2d', border: `1px solid ${saving ? '#333' : CN_BLUE}`, color: saving ? '#555' : CN_BLUE, borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {saving ? <><span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #333', borderTopColor: CN_BLUE, display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Saving\u2026</> : '\uD83D\uDCCC Save to ClickUp'}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', borderBottom: '2px solid #222', padding: '0 22px', background: '#111' }}>
                {tabs.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    style={{ padding: '10px 18px', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', border: 'none', borderBottom: activeTab === t.id ? `3px solid ${CN_BLUE}` : '3px solid transparent', background: 'transparent', color: activeTab === t.id ? CN_BLUE : '#666', cursor: 'pointer', marginBottom: -2 }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ padding: '22px' }}>
                {activeTab === 'email' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                      <p style={{ fontSize: 12, color: '#666' }}>Paste into Mailchimp as a custom code block.</p>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => setEmailPreview(p => !p)} style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{emailPreview ? '\uD83D\uDCDD Code' : '\uD83D\uDC41 Preview'}</button>
                        <CopyBtn text={result.email_html} label="Copy HTML" />
                      </div>
                    </div>
                    {emailPreview
                      ? <div style={{ border: '1px solid #333', borderRadius: 8, overflow: 'hidden', background: '#fff' }}><iframe srcDoc={result.email_html} style={{ width: '100%', minHeight: 540, border: 'none', display: 'block' }} title="Email Preview" /></div>
                      : <textarea readOnly value={result.email_html} style={{ width: '100%', height: 300, background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 8, color: '#7dd3fc', fontSize: 11, fontFamily: 'monospace', padding: 14, resize: 'vertical', outline: 'none', lineHeight: 1.5 }} />}
                  </div>
                )}
                {activeTab === 'sms' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                      <p style={{ fontSize: 12, color: '#666' }}>Ready to paste into your CRM or SMS platform.</p>
                      <CopyBtn text={result.sms} label="Copy SMS" />
                    </div>
                    <div style={{ background: '#0d0d0d', border: `1.5px solid ${CN_BLUE}33`, borderRadius: 10, padding: '18px 20px' }}>
                      <p style={{ fontSize: 15, color: '#e2e8f0', lineHeight: 1.75 }}>{result.sms}</p>
                      <p style={{ marginTop: 12, fontSize: 12, color: smsLen > 160 ? '#f87171' : '#555' }}>{smsLen} chars {smsLen > 160 ? '\u26A0\uFE0F over 160 \u2014 trim before sending' : '\u2713'}</p>
                    </div>
                  </div>
                )}
                {activeTab === 'social' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                      <p style={{ fontSize: 12, color: '#666' }}>Works for Instagram, Facebook, and Google Business Profile.</p>
                      <CopyBtn text={result.social_caption} label="Copy Caption" />
                    </div>
                    <div style={{ background: '#0d0d0d', border: `1.5px solid ${CN_BLUE}33`, borderRadius: 10, padding: '18px 20px' }}>
                      <p style={{ fontSize: 15, color: '#e2e8f0', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{result.social_caption}</p>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #222', padding: '12px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <p style={{ fontSize: 11, color: '#444' }}>Need changes? Update inputs and regenerate.</p>
                <button onClick={handleGenerate} disabled={generating} style={{ background: 'transparent', border: `1px solid ${CN_BLUE}`, color: CN_BLUE, borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>\u21BB Regenerate</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
