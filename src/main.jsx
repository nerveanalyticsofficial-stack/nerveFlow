import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, ExternalLink, Menu, MessageCircle, MoveUpRight, X } from 'lucide-react'
import fallback from '../content/site.json'
import Admin from './Admin.jsx'
import './styles.css'

function useContent() {
  const [content, setContent] = useState(fallback)
  useEffect(() => {
    fetch('/api/content', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(data => { if (data?.content) setContent(data.content) }).catch(() => {})
  }, [])
  return content
}

function usePath() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const update = () => { setPath(window.location.pathname); window.scrollTo(0, 0) }
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])
  return path
}

function Link({ href, children, className = '', onClick, ...props }) {
  return <a href={href} className={className} onClick={e => {
    onClick?.(e)
    if (e.defaultPrevented) return
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || href.startsWith('mailto:') || href.startsWith('https:')) return
    if (href.startsWith('#')) { document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' }); e.preventDefault(); return }
    e.preventDefault()
    history.pushState(null, '', href)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }} {...props}>{children}</a>
}

function Logo({ name }) {
  return <Link href="/" className="logo" aria-label={`${name} home`}><span className="logo-mark"><span /><span /><span /><span /></span><span>{name}</span><span className="logo-dot">.</span></Link>
}

function Header({ content }) {
  const [open, setOpen] = useState(false)
  const nav = [['What we do', '/#services'], ['Our work', '/#work'], ['About us', '/#about']]
  const go = href => { setOpen(false); if (href.includes('#') && window.location.pathname === '/') { document.querySelector(href.slice(1))?.scrollIntoView({ behavior: 'smooth' }); return true } return false }
  return <header className="site-header"><div className="container header-inner"><Logo name={content.brand.name} /><nav className={open ? 'nav open' : 'nav'} aria-label="Main navigation">{nav.map(([label, href]) => <Link key={label} href={href} onClick={e => { if (go(href)) e.preventDefault() }}>{label}</Link>)}<Link className="nav-mobile-contact" href="/#contact" onClick={e => { if (go('/#contact')) e.preventDefault() }}>Let's talk <ArrowUpRight size={16} /></Link></nav><Link className="header-cta" href="/#contact" onClick={e => { if (go('/#contact')) e.preventDefault() }}>Let's talk <ArrowUpRight size={16} /></Link><button className="menu-button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={23} /> : <Menu size={23} />}</button></div></header>
}

function SectionLabel({ children, light = false }) { return <span className={`section-label${light ? ' light' : ''}`}><span className="label-dash" />{children}</span> }

function DashboardVisual() {
  return <div className="visual-wrap" aria-label="Illustration of connected bookings, messages, and insights"><div className="visual-grid" /><div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="visual-card primary-card"><div className="visual-top"><span className="visual-brand"><span className="visual-brand-mark">n</span> workspace</span><span className="visual-period">This week <ChevronDown size={12} /></span></div><div className="visual-heading">Everything in motion<span className="online-dot" /></div><div className="visual-sub">A clearer view of your day.</div><div className="visual-chart"><div className="chart-lines"><span /><span /><span /></div><svg viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#68cdb4" stopOpacity=".27"/><stop offset="1" stopColor="#68cdb4" stopOpacity="0"/></linearGradient></defs><path d="M0 119 C35 110 50 117 78 86 S130 105 155 74 S195 85 228 56 S270 69 302 36 S355 56 400 12 L400 140 L0 140Z" fill="url(#chartFill)"/><path d="M0 119 C35 110 50 117 78 86 S130 105 155 74 S195 85 228 56 S270 69 302 36 S355 56 400 12" fill="none" stroke="#329a83" strokeWidth="3" strokeLinecap="round"/></svg></div><div className="visual-bottom"><span><span className="legend-dot green" />Bookings</span><span><span className="legend-dot blue" />Conversations</span><span><span className="legend-dot gold" />Insights</span></div></div><div className="floating-card message-card"><div className="floating-icon"><MessageCircle size={18} /></div><div><strong>Customer conversations</strong><span>Connected to your workflow</span></div><span className="message-pulse" /></div><div className="floating-card booking-card"><div className="booking-icon"><Check size={17} /></div><div><strong>Appointment confirmed</strong><span>Right on schedule</span></div></div><div className="float-stamp">A connected business<br /><strong>feels different.</strong></div></div>
}

function Hero({ content }) {
  const h = content.hero
  return <section className="hero"><div className="container hero-inner"><div className="hero-copy"><SectionLabel>{h.eyebrow}</SectionLabel><h1>{h.title}</h1><p>{h.description}</p><div className="hero-actions"><Link href="#contact" className="button button-dark">{h.primaryCta}<ArrowUpRight size={18} /></Link><Link href="#work" className="text-link">{h.secondaryCta}<ArrowRight size={18} /></Link></div><div className="hero-foot"><span className="hero-foot-line" />{h.footnote}</div></div><DashboardVisual /></div><div className="hero-bottom"><div className="container hero-bottom-inner"><span>{h.bottomLine}</span><Link href="#services" aria-label="Scroll to services"><ArrowDown size={20} /></Link></div></div></section>
}

function Intro({ content }) { const i = content.intro; return <section className="intro-section" id="about"><div className="container intro-grid"><div><SectionLabel>{i.eyebrow}</SectionLabel><h2>{i.title}</h2></div><div className="intro-right"><p>{i.description}</p><div className="intro-quote"><span>“</span>{i.statement}</div></div></div></section> }

function Services({ content }) { const s = content.servicesIntro; return <section className="services-section" id="services"><div className="container"><div className="section-head services-head"><div><SectionLabel>{s.eyebrow}</SectionLabel><h2>{s.title}<br /><em>{s.accent}</em></h2></div><p>{s.description}</p></div><div className="service-list">{content.services.map((service, index) => <div className="service-row" key={service.id || index}><span className="service-num">{service.number || String(index + 1).padStart(2, '0')}</span><div className="service-copy"><h3>{service.title}</h3><p>{service.summary}</p></div><span className="service-detail">{service.details}</span><span className="service-arrow"><ArrowUpRight size={23} /></span></div>)}</div></div></section> }

function ProjectArt({ project, number }) { return <div className={`project-art ${project.accent || 'mint'}`}>{project.image ? <img src={project.image} alt="" /> : <><div className="art-crosshair art-crosshair-1"/><div className="art-crosshair art-crosshair-2"/><span className="art-number">{number}</span><div className="art-module"><div className="art-module-top"><span className="art-module-dot" /> SYSTEM OVERVIEW <span>↗</span></div><div className="art-module-title">{project.category?.toLowerCase()}</div><div className="art-module-bars"><span/><span/><span/><span/></div></div><span className="art-caption">NERVE / SELECTED WORK</span></>}</div> }

function Work({ content }) { const w = content.workIntro; return <section className="work-section" id="work"><div className="container"><div className="section-head work-head"><div><SectionLabel>{w.eyebrow}</SectionLabel><h2>{w.title}</h2></div><p>{w.description}</p></div><div className="project-grid">{content.projects.map((project, index) => <Link href={`/projects/${project.slug}`} className="project-card" key={project.id || index}><ProjectArt project={project} number={String(index + 1).padStart(2, '0')} /><div className="project-meta"><span>{project.category}</span><ArrowUpRight size={20} /></div><h3>{project.title}</h3><p>{project.short}</p></Link>)}</div></div></section> }

function Approach({ content }) { const a = content.approach; return <section className="approach-section"><div className="container approach-grid"><div className="approach-lead"><SectionLabel light>{a.eyebrow}</SectionLabel><h2>{a.title}</h2><p>{a.description}</p><div className="approach-sigil"><span className="sigil-core"/><span className="sigil-ring ring-1"/><span className="sigil-ring ring-2"/></div></div><div className="approach-steps">{a.steps.map((step, index) => <div className="approach-step" key={index}><span>0{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div><ArrowUpRight size={19} /></div>)}</div></div></section> }

function Founders({ content }) { const f = content.foundersIntro; const visible = content.founders.filter(founder => founder.visible); return <section className="founders-section" id="founders"><div className="container founders-grid"><div className="founders-copy"><SectionLabel>{f.eyebrow}</SectionLabel><h2>{f.title}</h2><p>{f.description}</p>{visible.length > 0 && <span className="founders-note">GET TO KNOW THE PEOPLE BEHIND THE WORK <ArrowDown size={16} /></span>}</div>{visible.length ? <div className="founder-list">{visible.map((founder, index) => <Link href={`/founders/${founder.slug}`} className="founder-card" key={founder.id || index}>{founder.image ? <img src={founder.image} alt={founder.name} /> : <span className="founder-avatar">{founder.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span>}<span className="founder-card-text"><strong>{founder.name}</strong><small>{founder.role}</small></span><ArrowUpRight size={20}/></Link>)}</div> : <div className="founders-art" aria-hidden="true"><div className="founders-symbol"><span/><span/><span/></div><span>THREE MINDS. ONE DIRECTION.</span></div>}</div></section> }

function Contact({ content }) { const c = content.contact; const b = content.brand; const whats = b.whatsapp?.replace(/\D/g, ''); return <section className="contact-section" id="contact"><div className="container contact-inner"><div><SectionLabel light>{c.eyebrow}</SectionLabel><h2>{c.title}</h2><p>{c.description}</p></div><div className="contact-actions"><a className="button button-light" href={`mailto:${b.email}`}>{c.button}<ArrowUpRight size={18}/></a>{whats && <a className="contact-alt" href={`https://wa.me/${whats}`} target="_blank" rel="noreferrer">Message us on WhatsApp <ArrowUpRight size={16}/></a>}{b.bookingUrl && <a className="contact-alt" href={b.bookingUrl} target="_blank" rel="noreferrer">Book a call <ArrowUpRight size={16}/></a>}</div></div></section> }

function Footer({ content }) { const b = content.brand; return <footer className="footer"><div className="container"><div className="footer-main"><div><Logo name={b.name}/><p>{content.footer.tagline}</p></div><div className="footer-links"><div><strong>EXPLORE</strong><Link href="/#services">Services</Link><Link href="/#work">Our work</Link><Link href="/#about">About</Link><Link href="/#founders">Founders</Link></div><div><strong>CONNECT</strong><a href={`mailto:${b.email}`}>{b.email}</a>{b.phone && <a href={`tel:${b.phone}`}>{b.phone}</a>}<span>{b.location}</span></div></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} {content.footer.copyright}. All rights reserved.</span><Link href="/admin">Admin</Link><Link href="/" className="back-top">Back to top <MoveUpRight size={14}/></Link></div></div></footer> }

function DetailPage({ content, type, slug }) { const item = type === 'projects' ? content.projects.find(p => p.slug === slug) : content.founders.find(f => f.slug === slug && f.visible); if (!item) return <><Header content={content}/><main className="not-found container"><span className="section-label">PAGE NOT FOUND</span><h1>We couldn't find that page.</h1><Link href="/" className="button button-dark">Back to home <ArrowRight size={18}/></Link></main><Footer content={content}/></>; return <><Header content={content}/><main className="detail-page"><div className="container"><Link href={type === 'projects' ? '/#work' : '/#founders'} className="detail-back"><ArrowLeft size={16}/> Back to {type === 'projects' ? 'our work' : 'the team'}</Link><div className="detail-hero"><div><SectionLabel>{type === 'projects' ? item.category : item.role}</SectionLabel><h1>{item.title || item.name}</h1><p>{type === 'projects' ? item.short : item.summary}</p></div>{type === 'projects' ? <ProjectArt project={item} number="NA"/> : <div className="detail-person-art">{item.image ? <img src={item.image} alt={item.name}/> : <span>{item.name.split(' ').map(v => v[0]).slice(0,2).join('')}</span>}</div>}</div><div className="detail-body"><div><SectionLabel>{type === 'projects' ? 'THE PROJECT' : 'ABOUT'}</SectionLabel><h2>{type === 'projects' ? 'A system built around the work.' : `Meet ${item.name}.`}</h2></div><div><p>{type === 'projects' ? item.description : item.bio}</p>{type === 'projects' ? <div className="detail-features">{item.features?.map((f,i) => <span key={i}><Check size={16}/>{f}</span>)}</div> : item.linkedin && <a className="text-link" href={item.linkedin} target="_blank" rel="noreferrer">LinkedIn <ExternalLink size={16}/></a>}</div></div></div></main><Contact content={content}/><Footer content={content}/></> }

function App() { const content = useContent(); const path = usePath(); useEffect(() => { document.title = path.startsWith('/projects/') ? `${content.projects.find(p => p.slug === path.split('/')[2])?.title || 'Project'} — Nerve Analytics` : path.startsWith('/founders/') ? `${content.founders.find(f => f.slug === path.split('/')[2])?.name || 'Founder'} — Nerve Analytics` : path.startsWith('/admin') ? 'Admin — Nerve Analytics' : 'Nerve Analytics — Intelligent systems for ambitious businesses' }, [path, content]); useEffect(() => { if (path === '/' && window.location.hash) setTimeout(() => document.querySelector(window.location.hash)?.scrollIntoView(), 60) }, [path]); if (path.startsWith('/admin')) return <Admin initialContent={content}/>; if (path.startsWith('/projects/')) return <DetailPage content={content} type="projects" slug={path.split('/')[2]}/>; if (path.startsWith('/founders/')) return <DetailPage content={content} type="founders" slug={path.split('/')[2]}/>; return <><Header content={content}/><main><Hero content={content}/><Intro content={content}/><Services content={content}/><Work content={content}/><Approach content={content}/><Founders content={content}/><Contact content={content}/></main><Footer content={content}/></> }

createRoot(document.getElementById('root')).render(<App />)
