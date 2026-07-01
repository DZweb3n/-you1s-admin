const { createServer } = require('http')
const { parse } = require('url')
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const next = require('next')

// Empêche Node de tuer le process sur une erreur non gérée (stabilité Hostinger)
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection (ignored):', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception (ignored):', err && err.message)
})

// IMPORTANT — Hostinger / LiteSpeed fournit PORT qui peut être :
//   - un NUMÉRO de port (ex: "3000")
//   - un CHEMIN DE SOCKET Unix (ex: "/usr/local/lsws/extapp-sock/....sock")
// On ne fait PAS de parseInt (ça casse les chemins de socket). Et on ne force
// SURTOUT PAS un port fixe : plusieurs instances sur le même port 3000 se
// disputent le port -> EADDRINUSE -> boucle de crash -> 503.
const rawPort = process.env.PORT
const listenTarget = rawPort && String(rawPort).length ? String(rawPort) : '3000'
const isSocket = listenTarget.includes('/') || listenTarget.includes('.sock')

// Filet de sécurité : construit .next s'il manque (normalement fait au déploiement)
const buildDir = path.join(__dirname, '.next')
if (!fs.existsSync(buildDir)) {
  console.log('> .next introuvable — build en cours...')
  try {
    execSync('npx next build', { stdio: 'inherit', cwd: __dirname })
    console.log('> Build terminé')
  } catch (err) {
    console.error('[server] Build échoué:', err.message)
    process.exit(1)
  }
}

const app = next({ dev: false })
const handle = app.getRequestHandler()

app.prepare()
  .then(() => {
    const server = createServer((req, res) => {
      handle(req, res, parse(req.url, true)).catch((err) => {
        console.error('[server] Request error:', req.url, err)
        if (!res.headersSent) {
          res.statusCode = 500
          res.end('Internal Server Error')
        }
      })
    })

    server.on('error', (err) => {
      console.error('[server] Erreur listen sur', listenTarget, '-', err.code || err.message)
      process.exit(1)
    })

    if (isSocket) {
      // Nettoie un socket périmé avant de réécouter dessus
      try { if (fs.existsSync(listenTarget)) fs.unlinkSync(listenTarget) } catch (e) {}
      server.listen(listenTarget, () => {
        console.log('> Prêt (socket) sur', listenTarget)
      })
    } else {
      server.listen(Number(listenTarget), () => {
        console.log('> Prêt sur le port', listenTarget)
      })
    }
  })
  .catch((err) => {
    console.error('[server] Next.js prepare a échoué:', err)
    process.exit(1)
  })
