import { readImage, send } from '../lib/server.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed.' })
  try {
    const { bytes, type } = await readImage(req.query?.file)
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400, immutable', 'X-Content-Type-Options': 'nosniff' })
    res.end(bytes)
  } catch { return send(res, 404, { error: 'Image not found.' }) }
}
