import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => ({
  plugins: [{
    name: 'local-admin-api',
    configureServer(server) {
      Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
      const routes = {
        '/session': () => import('./api/session.js'),
        '/content': () => import('./api/content.js'),
        '/upload': () => import('./api/upload.js'),
        '/media': () => import('./api/media.js'),
      }
      server.middlewares.use('/api', async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost')
        const route = routes[url.pathname]
        if (!route) return next()
        req.query = Object.fromEntries(url.searchParams)
        try { await (await route()).default(req, res) } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: error.message }))
        }
      })
    },
  }],
  build: { outDir: 'dist' },
}))
