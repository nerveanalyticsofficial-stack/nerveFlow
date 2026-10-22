import { cookieHeader, isAuthenticated, makeSession, matchesPassword, readBody, sameOrigin, send } from '../lib/server.js'

const attempts = new Map()

export default async function handler(req, res) {
  if (req.method === 'GET') return send(res, 200, { authenticated: isAuthenticated(req), configured: Boolean(process.env.ADMIN_PASSWORD && process.env.SESSION_SECRET && process.env.GITHUB_TOKEN) })
  if (!sameOrigin(req)) return send(res, 403, { error: 'Invalid request origin.' })
  if (req.method === 'DELETE') return send(res, 200, { authenticated: false }, { 'Set-Cookie': cookieHeader('', req).replace('Max-Age=604800', 'Max-Age=0') })
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' })
  try {
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0]
    const record = attempts.get(ip) || { count: 0, until: 0 }
    if (record.count >= 5 && record.until > Date.now()) return send(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' })
    const { password } = await readBody(req, 2000)
    if (!matchesPassword(password)) {
      attempts.set(ip, { count: record.count + 1, until: Date.now() + 15 * 60 * 1000 })
      return send(res, 401, { error: 'Incorrect password.' })
    }
    attempts.delete(ip)
    const token = makeSession()
    return send(res, 200, { authenticated: true }, { 'Set-Cookie': cookieHeader(token, req) })
  } catch (error) { return send(res, 400, { error: error.message }) }
}
