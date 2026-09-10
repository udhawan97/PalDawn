import { createReadStream, existsSync, cpSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin, Connect } from 'vite'

// The unreviewed pack lives outside public/. It cannot enter a normal release build.
export function anatomyPreview(enabled: boolean): Plugin {
  const pack = resolve(process.cwd(), '../output/anatomy')
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname
    const match = path.match(/\/anatomy\/(models\/(atlas(?:-female)?\.json|(?:body|female)-\d+\.bin(?:\.gz)?)|context\.json|ATTRIBUTION\.md)$/)
    if (!enabled || !match) return next()
    const file = resolve(pack, match[1])
    if (!existsSync(file)) { res.statusCode = 404; res.end('Local anatomy pack unavailable'); return }
    res.setHeader('Content-Type', file.endsWith('.json') ? 'application/json' : file.endsWith('.md') ? 'text/plain; charset=utf-8' : 'application/octet-stream')
    res.setHeader('Cache-Control', 'no-store')
    createReadStream(file).pipe(res)
  }
  return {
    name: 'paldawn-local-anatomy-preview',
    transformIndexHtml(html) {
      if (!enabled) return html
      return html.replace(/<title>.*?<\/title>/, '<title>PalDawn — Anatomy Lab</title>').replace(/(<meta name="description" content=")[^"]*/, '$1Explore male and female reference anatomy, source-linked disease pathways and recall practice. Local candidate; qualified review pending.')
    },
    configureServer(server) { server.middlewares.use(middleware) },
    configurePreviewServer(server) { server.middlewares.use(middleware) },
    closeBundle() {
      if (!enabled) return
      if (!existsSync(resolve(pack, 'models/atlas.json'))) throw new Error('Run npm run anatomy:prepare before building the local candidate.')
      cpSync(pack, resolve(process.cwd(), 'dist-anatomy/anatomy'), { recursive: true })
    },
  }
}
