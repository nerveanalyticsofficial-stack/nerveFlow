import { isAuthenticated, readBody, sameOrigin, send, uploadImage } from '../lib/server.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' })
  if (!isAuthenticated(req)) return send(res, 401, { error: 'Sign in to upload images.' })
  if (!sameOrigin(req)) return send(res, 403, { error: 'Invalid request origin.' })
  try {
    const { name, type, data } = await readBody(req, 3_000_000)
    if (typeof name !== 'string' || typeof data !== 'string') return send(res, 400, { error: 'Choose an image first.' })
    const bytes = Buffer.from(data, 'base64')
    if (!bytes.length || bytes.length > 2_000_000) return send(res, 400, { error: 'Image must be under 2 MB.' })
    const url = await uploadImage(name, bytes, type)
    return send(res, 200, { url })
  } catch (error) { return send(res, 500, { error: error.message || 'Upload failed.' }) }
}
