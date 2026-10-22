import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import contentHandler from '../api/content.js'
import sessionHandler from '../api/session.js'
import mediaHandler from '../api/media.js'
import { makeSession } from '../lib/server.js'
import site from '../content/site.json' with { type: 'json' }

function request(method, body, headers = {}) {
  const req = new EventEmitter()
  req.method = method
  req.headers = { host: 'localhost:4173', ...headers }
  req.socket = { remoteAddress: '127.0.0.1' }
  if (body !== undefined) queueMicrotask(() => { req.emit('data', Buffer.from(JSON.stringify(body))); req.emit('end') })
  return req
}

function response() {
  return {
    status: 0,
    headers: {},
    body: null,
    writeHead(status, headers) { this.status = status; this.headers = headers },
    end(body) { this.body = body ? JSON.parse(String(body)) : null },
  }
}

test('public content loads from the bundled file without exposing a SHA', async () => {
  const oldToken = process.env.GITHUB_TOKEN
  delete process.env.GITHUB_TOKEN
  const res = response()
  await contentHandler(request('GET'), res)
  assert.equal(res.status, 200)
  assert.equal(res.body.content.brand.name, 'nerve analytics')
  assert.equal(res.body.sha, undefined)
  if (oldToken) process.env.GITHUB_TOKEN = oldToken
})

test('content changes and uploads reject visitors', async () => {
  const res = response()
  await contentHandler(request('PUT', { content: {}, sha: 'abc' }), res)
  assert.equal(res.status, 401)
})

test('admin login sets a signed HttpOnly cookie', async () => {
  process.env.ADMIN_PASSWORD = 'long-test-password-123'
  process.env.SESSION_SECRET = 'a-secret-longer-than-thirty-two-characters-for-tests'
  const res = response()
  await sessionHandler(request('POST', { password: process.env.ADMIN_PASSWORD }, { origin: 'http://localhost:4173' }), res)
  assert.equal(res.status, 200)
  assert.match(res.headers['Set-Cookie'], /HttpOnly/)
  const cookie = res.headers['Set-Cookie'].split(';')[0]
  const check = response()
  await sessionHandler(request('GET', undefined, { cookie }), check)
  assert.equal(check.body.authenticated, true)
  delete process.env.ADMIN_PASSWORD
  delete process.env.SESSION_SECRET
})

test('cross-origin login is rejected', async () => {
  const res = response()
  await sessionHandler(request('POST', { password: 'anything' }, { origin: 'https://other.example' }), res)
  assert.equal(res.status, 403)
})

test('media endpoint rejects paths outside uploaded assets', async () => {
  const req = request('GET')
  req.query = { file: '../content/site.json' }
  const res = response()
  await mediaHandler(req, res)
  assert.equal(res.status, 404)
})

test('an authenticated admin can save complete content through GitHub', async () => {
  process.env.SESSION_SECRET = 'a-secret-longer-than-thirty-two-characters-for-tests'
  process.env.GITHUB_TOKEN = 'test-token'
  const originalFetch = global.fetch
  let committed
  global.fetch = async (url, options) => {
    assert.match(url, /\/repos\/nerveanalyticsofficial-stack\/nerveFlow\/contents\/content\/site\.json$/)
    assert.equal(options.method, 'PUT')
    committed = JSON.parse(options.body)
    return { ok: true, json: async () => ({ content: { sha: 'new-sha' } }) }
  }
  try {
    const cookie = `nerve_admin=${makeSession()}`
    const res = response()
    await contentHandler(request('PUT', { content: site, sha: 'old-sha' }, { cookie, origin: 'http://localhost:4173' }), res)
    assert.equal(res.status, 200)
    assert.equal(res.body.sha, 'new-sha')
    assert.equal(committed.sha, 'old-sha')
    assert.equal(JSON.parse(Buffer.from(committed.content, 'base64').toString()).hero.title, site.hero.title)
  } finally {
    global.fetch = originalFetch
    delete process.env.SESSION_SECRET
    delete process.env.GITHUB_TOKEN
  }
})
