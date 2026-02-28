/**
 * GitHub-backed storage for portfolio holdings.
 * Uses the GitHub Contents API to read/write portfolio.config.json.
 *
 * Reading: uses token if available, caches in sessionStorage as fallback.
 * Writing: requires a fine-grained PAT with "Contents: Read and write".
 */

const REPO = 'frutixu/bloomberg-lite'
const FILE_PATH = 'portfolio.config.json'
const API_BASE = 'https://api.github.com'
const TOKEN_KEY = 'bloomberg-lite-gh-token'
const CACHE_KEY = 'bloomberg-lite-config-cache'

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
}

export function setToken(token) {
  try { localStorage.setItem(TOKEN_KEY, String(token || '').trim()) } catch { /* noop */ }
}

export function hasToken() {
  return getToken().length > 0
}

/** Cache config in sessionStorage (survives refresh, clears on tab close) */
function cacheConfig(config) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(config))
  } catch { /* noop */ }
}

/** Read cached config from sessionStorage */
function getCachedConfig() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && Array.isArray(parsed.holdings)) return parsed
  } catch { /* noop */ }
  return null
}

/**
 * Read portfolio.config.json from the repo.
 * Returns { holdings: [...], _sha } where _sha is needed for updates.
 * Falls back to sessionStorage cache if API call fails.
 */
export async function readConfig() {
  const token = getToken()
  if (!token) throw new Error('No GitHub token configured')

  try {
    const res = await fetch(`${API_BASE}/repos/${REPO}/contents/${FILE_PATH}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message || `GitHub API ${res.status}`)
    }

    const data = await res.json()
    let content
    try {
      content = JSON.parse(atob(data.content))
    } catch {
      throw new Error('portfolio.config.json is not valid JSON')
    }

    if (!content || !Array.isArray(content.holdings)) {
      throw new Error('portfolio.config.json has invalid format')
    }

    const result = { ...content, _sha: data.sha }
    cacheConfig(result) // cache for fallback
    return result
  } catch (err) {
    // Try sessionStorage cache before giving up
    const cached = getCachedConfig()
    if (cached) {
      console.warn('[githubStorage] API failed, using cached config:', err.message)
      return cached
    }
    throw err
  }
}

/**
 * Write portfolio.config.json to the repo.
 * Auto-fetches sha if not provided. Commits directly to main.
 */
export async function writeConfig(holdings, sha) {
  const token = getToken()
  if (!token) throw new Error('No GitHub token configured')

  // Auto-fetch sha if missing
  let currentSha = sha || null
  if (!currentSha) {
    try {
      const current = await readConfig()
      currentSha = current._sha
    } catch {
      currentSha = null // file may not exist yet
    }
  }

  const config = { holdings }
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(config, null, 2) + '\n')))

  const body = { message: 'Update portfolio config', content }
  if (typeof currentSha === 'string' && currentSha.length > 0) {
    body.sha = currentSha
  }

  const res = await fetch(`${API_BASE}/repos/${REPO}/contents/${FILE_PATH}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (res.status === 403) {
      throw new Error('Token lacks write permission. Create a fine-grained token with Contents: Read & Write on frutixu/bloomberg-lite')
    }
    if (res.status === 409) {
      throw new Error('Config was modified elsewhere. Refresh the page and try again.')
    }
    throw new Error(err.message || `GitHub API ${res.status}`)
  }

  const data = await res.json()
  const result = { holdings, _sha: data?.content?.sha ?? null }
  cacheConfig(result) // update cache after successful write
  return result._sha
}
