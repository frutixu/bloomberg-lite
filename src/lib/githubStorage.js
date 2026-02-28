/**
 * GitHub-backed storage for portfolio holdings.
 * Uses the GitHub Contents API to read/write portfolio.config.json.
 *
 * Requires a fine-grained PAT with "Contents: Read and write" on the repo.
 */

const REPO = 'frutixu/bloomberg-lite'
const FILE_PATH = 'portfolio.config.json'
const API_BASE = 'https://api.github.com'
const TOKEN_KEY = 'bloomberg-lite-gh-token'

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
}

export function setToken(token) {
  try { localStorage.setItem(TOKEN_KEY, String(token || '').trim()) } catch { /* noop */ }
}

export function hasToken() {
  return getToken().length > 0
}

/**
 * Read portfolio.config.json from the repo.
 * Returns { holdings: [...], _sha } where _sha is needed for updates.
 */
export async function readConfig() {
  const token = getToken()
  if (!token) throw new Error('No GitHub token configured')

  const res = await fetch(`${API_BASE}/repos/${REPO}/contents/${FILE_PATH}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
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

  return { ...content, _sha: data.sha }
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
  return data?.content?.sha ?? null
}
