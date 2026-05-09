/**
 * Sert portfolio_build.html + photo.png à la racine, et proxifie OpenRouter
 * sans jamais exposer OPENROUTER_API_KEY au navigateur.
 */
const path = require('path')
const fs = require('fs')

const envVite = path.join(__dirname, '.vite', '.env')
const envRoot = path.join(__dirname, '.env')

function stripBom(text) {
  if (!text || typeof text !== 'string') return text
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function normalizeApiKey(raw) {
  if (!raw || typeof raw !== 'string') return ''
  let k = raw.trim()
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim()
  }
  return k.replace(/\r?\n/g, '').trim()
}

/** Relit `.env` à la main : BOM UTF-8, préfixes parasites sur les clés, etc. Priorité au fichier à côté de server.js */
function hydrateFromEnvFile() {
  if (!fs.existsSync(envRoot)) return
  let raw
  try {
    raw = stripBom(fs.readFileSync(envRoot, 'utf8'))
  } catch (e) {
    return
  }
  let extractedApiKey = ''
  let extractedModel = ''
  const lines = raw.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    const hashIdx = line.indexOf('#')
    if (hashIdx !== -1) line = line.slice(0, hashIdx)
    line = line.trim()
    if (!line || !line.includes('=')) continue
    const eq = line.indexOf('=')
    let key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    key = key.replace(/^\uFEFF/, '').trim()
    val = val.replace(/^["']|["']$/g, '')
    if (key === 'OPENROUTER_API_KEY') {
      if (normalizeApiKey(val)) extractedApiKey = val
    } else if (key === 'OPENROUTER_MODEL') extractedModel = val
  }
  if (normalizeApiKey(extractedApiKey))
    process.env.OPENROUTER_API_KEY = extractedApiKey
  if (extractedModel && extractedModel.trim())
    process.env.OPENROUTER_MODEL = extractedModel.trim()
}

require('dotenv').config({ path: envVite })
require('dotenv').config({ path: envRoot, override: true })
hydrateFromEnvFile()
const express = require('express')
const cors = require('cors')
const http = require('http')

const app = express()
const PORT_START = Number(process.env.PORT) || 8080
/** Port réellement utilisé après écoute (pour Referer OpenRouter) */
let listeningPort = PORT_START

app.use(cors({ origin: true }))
app.use(express.json({ limit: '512kb' }))

/** Préflight explicite (certains navigateurs / extensions sinon 404 sur OPTIONS) */
function chatRoutes(handler) {
  app.options(['/api/chat', '/api/chat/'], (_req, res) => res.sendStatus(204))
  app.post('/api/chat', handler)
  app.post('/api/chat/', handler)
}

/** Modèles gratuits actuels (les anciens slugs type gemma-2-9b renvoient souvent « No endpoints ») */
const OPENROUTER_MODEL_FALLBACKS = [
  'liquid/lfm-2.5-1.2b-instruct:free',
  'openrouter/free',
  'meta-llama/llama-3.3-70b-instruct:free',
]

function buildOpenRouterModelChain() {
  const out = []
  const push = (m) => {
    const x = String(m || '').trim()
    if (x && out.indexOf(x) === -1) out.push(x)
  }
  push(process.env.OPENROUTER_MODEL)
  OPENROUTER_MODEL_FALLBACKS.forEach(push)
  if (out.length === 0) push(OPENROUTER_MODEL_FALLBACKS[0])
  return out
}

const OPENROUTER_MODEL_CHAIN = buildOpenRouterModelChain()
const DEFAULT_OPENROUTER_MODEL = OPENROUTER_MODEL_CHAIN[0]

function openRouterErrMessage(data) {
  if (!data || !data.error) return ''
  const e = data.error
  if (typeof e === 'object' && e.message) return String(e.message).toLowerCase()
  if (typeof e === 'string') return e.toLowerCase()
  return ''
}

function shouldTryNextOpenRouterModel(status, data, attempt, total) {
  if (attempt >= total - 1) return false
  if (status === 404) return true
  if (status === 429) return true
  const msg = openRouterErrMessage(data)
  if (msg.includes('no endpoints')) return true
  if (msg.includes('not found') && msg.includes('model')) return true
  return false
}

async function aminmindChatHandler(req, res) {
  const key = normalizeApiKey(process.env.OPENROUTER_API_KEY)
  if (!key || key.startsWith('REPLACE')) {
    return res.status(503).json({
      error: 'missing_api_key',
      message:
        'Set OPENROUTER_API_KEY in .env (see .env.example). Never commit real keys.',
    })
  }

  const { messages } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'invalid_messages' })
  }

  const upstreamUrl = 'https://openrouter.ai/api/v1/chat/completions'
  const models = buildOpenRouterModelChain()

  try {
    for (let mi = 0; mi < models.length; mi++) {
      const model = models[mi]
      const r = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer':
            process.env.SITE_URL || `http://localhost:${listeningPort}`,
          'X-Title': 'AminMind Portfolio',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 640,
        }),
        signal: AbortSignal.timeout(90000),
      })

      const text = await r.text()
      let data
      try {
        data = text ? JSON.parse(text) : {}
      } catch (parseErr) {
        console.error(
          '[AminMind] Réponse non-JSON du fournisseur:',
          text.slice(0, 500)
        )
        return res.status(502).json({
          error: 'bad_upstream_response',
          message: text.slice(0, 200) || parseErr.message,
        })
      }

      if (r.ok) {
        try {
          res.setHeader('X-AminMind-Model', model)
        } catch (hErr) {}
        return res.status(r.status).json(data)
      }

      if (r.status === 401) {
        return res.status(r.status).json(data)
      }

      console.warn(
        '[AminMind] OpenRouter',
        model,
        'HTTP',
        r.status,
        openRouterErrMessage(data) || JSON.stringify(data).slice(0, 160)
      )

      if (shouldTryNextOpenRouterModel(r.status, data, mi, models.length)) {
        continue
      }
      return res.status(r.status).json(data)
    }
    return res.status(502).json({
      error: 'all_models_failed',
      message: 'Tous les modèles de secours ont échoué. Mettez à jour OPENROUTER_MODEL dans .env.',
    })
  } catch (e) {
    const detail =
      (e.cause && (e.cause.code || e.cause.message)) ||
      e.cause ||
      e.message ||
      String(e)
    console.error('[AminMind] Échec appel fournisseur IA:', detail)
    return res.status(502).json({
      error: 'upstream_unreachable',
      message: typeof detail === 'string' ? detail : String(detail),
    })
  }
}

chatRoutes(aminmindChatHandler)

app.get('/api/health', (_req, res) => {
  const k = normalizeApiKey(process.env.OPENROUTER_API_KEY || '')
  res.json({
    ok: true,
    service: 'portfolio',
    aminmind: true,
    apiKeyConfigured: Boolean(k) && !k.startsWith('REPLACE'),
    chatPostUrl: '/api/chat',
    model: DEFAULT_OPENROUTER_MODEL,
    modelFallbacks: buildOpenRouterModelChain().slice(0, 5),
  })
})

/** Évite un GET « test » qui tombait sur la SPA sans indication claire */
app.get('/api/chat', (_req, res) => {
  res.status(200).json({
    ok: true,
    hint: 'Send POST with JSON body { "messages": [...] }',
    health: '/api/health',
  })
})

const root = __dirname
app.use(express.static(root))

app.get('*', (_req, res) => {
  res.sendFile(path.join(root, 'portfolio_build.html'))
})

function startServer(port, attemptsLeft = 25) {
  const server = http.createServer(app)
  server.on('error', (err) => {
    server.close(() => {})
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.warn(`Port ${port} déjà utilisé → essai sur ${port + 1}`)
      startServer(port + 1, attemptsLeft - 1)
      return
    }
    console.error(err)
    process.exit(1)
  })
  const listenHost = (process.env.LISTEN_HOST || '').trim()
  const onListening = () => {
    listeningPort = server.address().port
    const hostLabel = listenHost || 'localhost'
    console.log(`Portfolio: http://${hostLabel}:${listeningPort}`)
    if (!listenHost || listenHost === '0.0.0.0' || listenHost === '::') {
      console.log(
        'Accès réseau local : remplacez localhost par l’IP de la machine (ex. http://192.168.x.x:' +
          listeningPort +
          ')'
      )
    }
    const k = normalizeApiKey(process.env.OPENROUTER_API_KEY || '')
    const hasKey = Boolean(k) && !k.startsWith('REPLACE')
    console.log(
      hasKey
        ? 'AminMind : OPENROUTER_API_KEY OK (' + k.length + ' car.) · modèle ' + DEFAULT_OPENROUTER_MODEL
        : 'AminMind : OPENROUTER_API_KEY absente ou vide — fichier attendu : ' + envRoot
    )
    console.log(
      `API POST → http://${hostLabel}:${listeningPort}/api/chat · GET santé → /api/health`
    )
  }
  if (listenHost) server.listen(port, listenHost, onListening)
  else server.listen(port, onListening)
}

startServer(PORT_START)
