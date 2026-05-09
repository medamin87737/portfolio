/**
 * Test lecture .env + appel OpenRouter (usage: node scripts/test-openrouter.js)
 */
const path = require('path')
const fs = require('fs')
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
  override: true,
})

function hydrate() {
  const envRoot = path.join(__dirname, '..', '.env')
  let raw = fs.readFileSync(envRoot, 'utf8')
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1)
  let lastKey = ''
  raw.split(/\r?\n/).forEach((line) => {
    const h = line.indexOf('#')
    if (h >= 0) line = line.slice(0, h)
    line = line.trim()
    if (!line.includes('=')) return
    const i = line.indexOf('=')
    const k = line.slice(0, i).trim()
    let v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
    if (k === 'OPENROUTER_API_KEY' && v && v.length > 10) lastKey = v
    else if (k === 'OPENROUTER_MODEL' && v) process.env.OPENROUTER_MODEL = v
  })
  if (lastKey) process.env.OPENROUTER_API_KEY = lastKey
}
hydrate()

const key = (process.env.OPENROUTER_API_KEY || '').trim()
console.log(
  'OPENROUTER_API_KEY:',
  key ? `${key.slice(0, 12)}… (${key.length} chars)` : '(empty)'
)
const configured = !!(key && !key.startsWith('REPLACE'))
const models = [
  process.env.OPENROUTER_MODEL || 'liquid/lfm-2.5-1.2b-instruct:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'openrouter/free',
].filter((x, i, a) => a.indexOf(x) === i)

async function main() {
  if (!configured) {
    console.error('✗ Missing OPENROUTER_API_KEY in .env')
    process.exit(1)
  }
  const url = 'https://openrouter.ai/api/v1/chat/completions'
  for (const model of models) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': 'http://localhost:8080',
          'X-Title': 'portfolio-test',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Réponds par un mot : OK.' }],
          max_tokens: 24,
        }),
        signal: AbortSignal.timeout(60000),
      })
      const text = await r.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        console.error(model, 'non-JSON', text.slice(0, 160))
        continue
      }
      if (!r.ok) {
        console.error(
          model,
          'HTTP',
          r.status,
          data.error ? data.error.message || data.error : data
        )
        continue
      }
      const txt =
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content
      console.log('✓ works model:', model, '→', (txt || '').trim().slice(0, 80))
      process.exit(0)
    } catch (e) {
      console.error(model, 'fetch error:', e.message)
    }
  }
  console.error('✗ aucun modèle de la liste n’a répondu')
  process.exit(2)
}

main()
