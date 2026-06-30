const { createServer } = require('http')
const { parse } = require('url')
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const next = require('next')

// Prevent Node.js 22 from killing the process on any unhandled rejection
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection (ignored):', reason)
})

const port = parseInt(process.env.PORT || '3001', 10)

// Auto-build if .next directory doesn't exist
const buildDir = path.join(__dirname, '.next')
if (!fs.existsSync(buildDir)) {
  console.log('> .next not found — running next build...')
  try {
    execSync('npx next build', { stdio: 'inherit', cwd: __dirname })
    console.log('> Build complete')
  } catch (err) {
    console.error('[server] Build failed:', err.message)
    process.exit(1)
  }
}

const app = next({ dev: false })
const handle = app.getRequestHandler()

console.log('> Starting server on port', port)

app.prepare()
  .then(() => {
    createServer((req, res) => {
      handle(req, res, parse(req.url, true)).catch((err) => {
        console.error('[server] Request error:', req.url, err)
        if (!res.headersSent) {
          res.statusCode = 500
          res.end('Internal Server Error')
        }
      })
    }).listen(port, (err) => {
      if (err) {
        console.error('[server] Failed to bind port:', port, err)
        process.exit(1)
      }
      console.log('> Ready on http://localhost:' + port)
    })
  })
  .catch((err) => {
    console.error('[server] Next.js failed to prepare:', err)
    process.exit(1)
  })
