import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const fallbackPath = fileURLToPath(new URL('../content/site.json', import.meta.url))
const owner = process.env.GITHUB_OWNER || 'nerveanalyticsofficial-stack'
const repo = process.env.GITHUB_REPO || 'nerveFlow'
const branch = process.env.GITHUB_BRANCH || 'main'
const contentPath = 'content/site.json'

export function send(res, status, data, extra = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra })
  res.end(JSON.stringify(data))
}

export function readBody(req, limit = 350_000) {
  return new Promise((resolve, reject) => {
    let size = 0
    let body = ''
    req.on('data', chunk => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('Request is too large.'))
        req.destroy()
        return
      }
      body += chunk
    })
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')) } catch { reject(new Error('Invalid JSON.')) }
    })
    req.on('error', reject)
  })
}

export function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try {
    const requested = new URL(origin)
    const host = req.headers['x-forwarded-host'] || req.headers.host
    return requested.host === host && requested.protocol === 'https:' || (requested.host === host && host?.startsWith('localhost:'))
  } catch { return false }
}

const secret = () => process.env.SESSION_SECRET || ''
const sign = value => createHmac('sha256', secret()).update(value).digest('base64url')

export function makeSession() {
  if (secret().length < 32) throw new Error('SESSION_SECRET must have at least 32 characters.')
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 7 * 24 * 60 * 60 * 1000, nonce: randomBytes(12).toString('hex') })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function isAuthenticated(req) {
  if (secret().length < 32) return false
  const cookie = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('nerve_admin='))
  const token = cookie?.slice('nerve_admin='.length)
  const [payload, signature] = token?.split('.') || []
  if (!payload || !signature) return false
  const expected = sign(payload)
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now() } catch { return false }
}

export function matchesPassword(candidate) {
  const expected = process.env.ADMIN_PASSWORD || ''
  if (!expected || typeof candidate !== 'string') return false
  const a = createHmac('sha256', 'nerve-password-check').update(candidate).digest()
  const b = createHmac('sha256', 'nerve-password-check').update(expected).digest()
  return timingSafeEqual(a, b)
}

export function cookieHeader(token, req) {
  const secure = !String(req.headers.host || '').startsWith('localhost:')
  return `nerve_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${secure ? '; Secure' : ''}`
}

async function github(path, options = {}) {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN is not configured.')
  const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || `GitHub returned ${response.status}.`)
  return body
}

export async function readContent() {
  if (process.env.GITHUB_TOKEN) {
    const file = await github(`${contentPath}?ref=${encodeURIComponent(branch)}`)
    return { content: JSON.parse(Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8')), sha: file.sha, source: 'github' }
  }
  return { content: JSON.parse(await readFile(fallbackPath, 'utf8')), sha: null, source: 'local' }
}

export async function saveContent(content, sha) {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is not configured.')
  const result = await github(contentPath, {
    method: 'PUT',
    body: JSON.stringify({ message: 'Update website content from admin', content: Buffer.from(JSON.stringify(content, null, 2) + '\n').toString('base64'), sha, branch }),
  })
  return result.content.sha
}

export async function uploadImage(filename, bytes, mime) {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is not configured.')
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }[mime]
  if (!ext) throw new Error('Use a JPG, PNG, WebP, or AVIF image.')
  const clean = filename.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'image'
  const path = `public/uploads/${clean}-${Date.now()}.${ext}`
  await github(path, { method: 'PUT', body: JSON.stringify({ message: `Upload ${clean} from admin`, content: bytes.toString('base64'), branch }) })
  return `/api/media?file=${encodeURIComponent(path)}`
}

export async function readImage(path) {
  if (typeof path !== 'string' || !/^public\/uploads\/[a-z0-9-]+-\d+\.(jpg|png|webp|avif)$/.test(path)) throw new Error('Invalid image path.')
  const file = await github(`${path}?ref=${encodeURIComponent(branch)}`)
  const type = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' }[path.split('.').at(-1)]
  return { bytes: Buffer.from(file.content.replace(/\n/g, ''), 'base64'), type }
}
