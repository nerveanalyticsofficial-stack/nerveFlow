import React, { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, ImagePlus, LockKeyhole, LogOut, Plus, Save, Trash2 } from 'lucide-react'
import fallback from '../content/site.json'

const groups = [
  { id: 'general', label: 'General', description: 'Brand, contact details, and footer' },
  { id: 'home', label: 'Homepage', description: 'Hero and introduction' },
  { id: 'services', label: 'Services', description: 'What you offer' },
  { id: 'projects', label: 'Projects', description: 'Case studies and images' },
  { id: 'approach', label: 'Approach', description: 'How you work' },
  { id: 'contact', label: 'Contact section', description: 'Closing invitation' },
]

const clone = value => JSON.parse(JSON.stringify(value))

function Field({ label, value, onChange, type = 'text', hint, multiline = false }) {
  return <label className="admin-field"><span>{label}</span>{multiline ? <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} rows={4} /> : <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} />}{hint && <small>{hint}</small>}</label>
}

function ImageField({ label, value, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  async function upload(file) {
    if (!file) return
    setError('')
    if (file.size > 2_000_000) { setError('Use an image under 2 MB.'); return }
    setUploading(true)
    try {
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file) })
      const response = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, type: file.type, data }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Upload failed.')
      onChange(result.url)
    } catch (e) { setError(e.message) } finally { setUploading(false) }
  }
  return <div className="admin-field"><span>{label}</span><div className="admin-image-row">{value ? <img src={value} alt="Preview" /> : <div className="admin-image-empty"><ImagePlus size={24}/></div>}<div><label className="admin-upload-button">{uploading ? 'Uploading…' : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e => upload(e.target.files?.[0])} disabled={uploading} hidden /></label><small>JPG, PNG, WebP, or AVIF · 2 MB max</small></div></div><input type="url" placeholder="Or paste an image URL" value={value || ''} onChange={e => onChange(e.target.value)} />{error && <small className="admin-error">{error}</small>}</div>
}

function Section({ title, description, children }) { return <section className="admin-section"><div className="admin-section-head"><h2>{title}</h2>{description && <p>{description}</p>}</div><div className="admin-form-grid">{children}</div></section> }

function Repeatable({ title, description, items, onAdd, onRemove, children }) {
  return <section className="admin-section"><div className="admin-section-head"><h2>{title}</h2>{description && <p>{description}</p>}</div><div className="admin-repeat-list">{items.map((item, index) => <div className="admin-repeat" key={item.id || index}><div className="admin-repeat-head"><strong>{item.title || item.name || `Item ${index + 1}`}</strong><button type="button" onClick={() => onRemove(index)} aria-label={`Remove item ${index + 1}`}><Trash2 size={17}/></button></div><div className="admin-form-grid">{children(item, index)}</div></div>)}</div><button className="admin-add" type="button" onClick={onAdd}><Plus size={17}/> Add {title.toLowerCase().replace(/s$/, '')}</button></section>
}

export default function Admin({ initialContent }) {
  const [authenticated, setAuthenticated] = useState(null)
  const [configured, setConfigured] = useState(true)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [content, setContent] = useState(clone(initialContent || fallback))
  const [sha, setSha] = useState(null)
  const [tab, setTab] = useState('general')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => { fetch('/api/session').then(r => r.json()).then(data => { setAuthenticated(data.authenticated); setConfigured(Boolean(data.passwordConfigured && data.sessionConfigured)); if (data.authenticated) load() }).catch(() => { setAuthenticated(false); setConfigured(false) }) }, [])
  useEffect(() => { const before = e => { if (dirty) { e.preventDefault(); e.returnValue = '' } }; window.addEventListener('beforeunload', before); return () => window.removeEventListener('beforeunload', before) }, [dirty])

  async function load() {
    try { const response = await fetch('/api/content', { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setContent(data.content); setSha(data.sha); setDirty(false) } catch (e) { setMessage(e.message || 'Could not load content.') }
  }
  async function login(e) {
    e.preventDefault(); setBusy(true); setLoginError('')
    try { const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setAuthenticated(true); setPassword(''); await load() } catch (e) { setLoginError(e.message) } finally { setBusy(false) }
  }
  async function logout() { await fetch('/api/session', { method: 'DELETE' }); setAuthenticated(false); setSha(null) }
  function change(path, value) { setContent(prev => { const next = clone(prev); let target = next; for (const key of path.slice(0, -1)) target = target[key]; target[path.at(-1)] = value; return next }); setDirty(true); setMessage('') }
  function addTo(key, item) { change([key], [...content[key], item]) }
  function removeFrom(key, index) { if (!window.confirm('Remove this item from the website?')) return; change([key], content[key].filter((_, i) => i !== index)) }
  function f(path, label, multiline = false, hint = '') { return <Field label={label} value={path.reduce((a, key) => a?.[key], content)} onChange={v => change(path, v)} multiline={multiline} hint={hint} /> }
  async function save() {
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, sha }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setSha(data.sha); setDirty(false); setMessage('Saved. Your changes are now live.')
    } catch (e) { setMessage(e.message || 'Could not save changes.') } finally { setBusy(false) }
  }

  if (authenticated === null) return <div className="admin-loading">Loading editor…</div>
  if (!authenticated) return <div className="admin-login"><a className="admin-back" href="/"><ArrowLeft size={17}/> Back to website</a><form onSubmit={login} className="login-panel"><span className="login-icon"><LockKeyhole size={24}/></span><span className="admin-kicker">NERVE ANALYTICS</span><h1>Content studio</h1><p>Sign in to update the website and projects.</p>{!configured && <div className="admin-alert">Admin sign-in needs ADMIN_PASSWORD and SESSION_SECRET. Add both in Vercel and redeploy. GITHUB_TOKEN is needed to save edits.</div>}<label>Password<div className="password-input"><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>{loginError && <div className="admin-error">{loginError}</div>}<button className="admin-primary" disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={18}/></button></form></div>

  return <div className="admin-shell"><aside className="admin-sidebar"><div className="admin-sidebar-top"><a className="admin-wordmark" href="/">nerve<span>.</span></a><span>CONTENT STUDIO</span></div><nav aria-label="Editor sections">{groups.map(group => <button key={group.id} className={tab === group.id ? 'active' : ''} onClick={() => setTab(group.id)}><span>{group.label}<small>{group.description}</small></span><ArrowRight size={16}/></button>)}</nav><div className="admin-sidebar-bottom"><a href="/" target="_blank" rel="noreferrer"><Eye size={17}/> View website</a><button onClick={logout}><LogOut size={17}/> Sign out</button></div></aside><div className="admin-main"><header className="admin-topbar"><div><span className="admin-breadcrumb">WEBSITE / {groups.find(g => g.id === tab)?.label.toUpperCase()}</span><h1>{groups.find(g => g.id === tab)?.label}</h1></div><div className="admin-top-actions"><span className={dirty ? 'unsaved' : 'saved'}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span><button className="admin-primary" onClick={save} disabled={busy || !dirty}><Save size={17}/>{busy ? 'Saving…' : 'Save changes'}</button></div></header><main className="admin-content">{message && <div className={message.startsWith('Saved') ? 'admin-success' : 'admin-alert'}>{message}</div>}
    {tab === 'general' && <><Section title="Brand" description="The name and contact information shown throughout the website.">{f(['brand','name'], 'Brand name')}{f(['brand','eyebrow'], 'Brand line')}{f(['brand','email'], 'Contact email')}{f(['brand','phone'], 'Phone number')}{f(['brand','whatsapp'], 'WhatsApp number', false, 'Include country code, for example +923001234567.')}{f(['brand','bookingUrl'], 'Booking link')}{f(['brand','location'], 'Location')}</Section><Section title="Footer">{f(['footer','tagline'], 'Tagline', true)}{f(['footer','copyright'], 'Copyright name')}</Section></>}
    {tab === 'home' && <><Section title="Hero" description="The first message visitors see.">{f(['hero','eyebrow'], 'Small label')}{f(['hero','title'], 'Main headline', true)}{f(['hero','description'], 'Description', true)}{f(['hero','primaryCta'], 'Primary button')}{f(['hero','secondaryCta'], 'Secondary link')}{f(['hero','footnote'], 'Small footer line')}{f(['hero','bottomLine'], 'Bottom banner text')}</Section><Section title="Introduction">{f(['intro','eyebrow'], 'Small label')}{f(['intro','title'], 'Heading', true)}{f(['intro','description'], 'Description', true)}{f(['intro','statement'], 'Highlighted statement', true)}</Section></>}
    {tab === 'services' && <><Section title="Section introduction">{f(['servicesIntro','eyebrow'], 'Small label')}{f(['servicesIntro','title'], 'Heading')}{f(['servicesIntro','accent'], 'Accent line')}{f(['servicesIntro','description'], 'Description', true)}</Section><Repeatable title="Services" description="Add, remove, or edit what Nerve Analytics offers." items={content.services} onAdd={() => addTo('services', { id: `service-${Date.now()}`, number: String(content.services.length + 1).padStart(2,'0'), title: 'New service', summary: '', details: '' })} onRemove={i => removeFrom('services', i)}>{(_, i) => <>{f(['services',i,'number'], 'Number')}{f(['services',i,'title'], 'Title')}{f(['services',i,'summary'], 'Short description', true)}{f(['services',i,'details'], 'More detail', true)}</>}</Repeatable></>}
    {tab === 'projects' && <><Section title="Section introduction">{f(['workIntro','eyebrow'], 'Small label')}{f(['workIntro','title'], 'Heading', true)}{f(['workIntro','description'], 'Description', true)}</Section><Repeatable title="Projects" description="Each project gets its own page automatically." items={content.projects} onAdd={() => addTo('projects', { id: `project-${Date.now()}`, slug: `new-project-${Date.now()}`, category: 'PROJECT', title: 'New project', short: '', description: '', features: [], accent: 'mint', image: '' })} onRemove={i => removeFrom('projects', i)}>{(item, i) => <>{f(['projects',i,'title'], 'Project title')}{f(['projects',i,'slug'], 'Page URL slug', false, `Preview: /projects/${item.slug}`)}{f(['projects',i,'category'], 'Category')}{f(['projects',i,'short'], 'Card summary', true)}{f(['projects',i,'description'], 'Full case study description', true)}<Field label="Highlights" value={item.features?.join('\n') || ''} onChange={v => change(['projects',i,'features'], v.split('\n').filter(Boolean))} multiline hint="One highlight per line."/><label className="admin-field"><span>Accent color</span><select value={item.accent || 'mint'} onChange={e => change(['projects',i,'accent'], e.target.value)}><option value="mint">Mint</option><option value="lavender">Lavender</option><option value="peach">Peach</option></select></label><ImageField label="Project image" value={item.image} onChange={v => change(['projects',i,'image'], v)}/></>}</Repeatable></>}
    {tab === 'approach' && <><Section title="Approach section">{f(['approach','eyebrow'], 'Small label')}{f(['approach','title'], 'Heading', true)}{f(['approach','description'], 'Description', true)}</Section><Repeatable title="Steps" items={content.approach.steps} onAdd={() => change(['approach','steps'], [...content.approach.steps, { title: 'New step', text: '' }])} onRemove={i => change(['approach','steps'], content.approach.steps.filter((_, n) => n !== i))}>{(_, i) => <>{f(['approach','steps',i,'title'], 'Title')}{f(['approach','steps',i,'text'], 'Description', true)}</>}</Repeatable></>}
    {tab === 'contact' && <Section title="Contact section" description="The final invitation shown on every page.">{f(['contact','eyebrow'], 'Small label')}{f(['contact','title'], 'Headline', true)}{f(['contact','description'], 'Description', true)}{f(['contact','button'], 'Email button text')}</Section>}
  </main></div></div>
}
