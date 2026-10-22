import { isAuthenticated, readBody, readContent, sameOrigin, saveContent, send } from '../lib/server.js'

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { content, sha, source } = await readContent()
      return send(res, 200, { content, ...(isAuthenticated(req) ? { sha, source } : {}) })
    }
    if (req.method !== 'PUT') return send(res, 405, { error: 'Method not allowed.' })
    if (!isAuthenticated(req)) return send(res, 401, { error: 'Sign in to save changes.' })
    if (!sameOrigin(req)) return send(res, 403, { error: 'Invalid request origin.' })
    const { content, sha } = await readBody(req)
    if (!content || typeof content !== 'object' || Array.isArray(content) || !content.brand || !content.hero || !Array.isArray(content.services) || !Array.isArray(content.projects)) return send(res, 400, { error: 'Website content is incomplete.' })
    if (typeof sha !== 'string' || !sha) return send(res, 409, { error: 'Refresh the editor before saving.' })
    const newSha = await saveContent(content, sha)
    return send(res, 200, { saved: true, sha: newSha })
  } catch (error) {
    return send(res, 500, { error: error.message || 'Something went wrong.' })
  }
}
