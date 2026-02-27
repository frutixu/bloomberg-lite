/**
 * GitHub-backed storage for portfolio holdings.
 * Uses the GitHub Contents API to read/write portfolio.config.json
 * directly to the repo — no localStorage dependency for portfolio data.
 *
 * Requires a GitHub Personal Access Token (fine-grained) with
 * "Contents: Read and write" permission on the repo.
 */

const REPO = 'frutixu/bloomberg-lite'
const FILE_PATH = 'portfolio.config.json'
const API_BASE = 'https://api.github.com'
const TOKEN_KEY = 'bloomberg-lite-gh-token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token.trim())
}

export function hasToken() {
  return !!getToken()
}

/**
 * Read portfolio.config.json from the repo.
 * Returns { holdings: [...], sha } where sha is needed for updates.
 */
export async function readConfig() {
  const token = getToken()
  if (!token) throw new Error('No GitHub token configured')

  const res = await fetch(`${API_BASE}/repos/${REPO}/contents/${FILE_PATH}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `GitHub API error: ${res.status}`)
  }

  const data = await res.json()
  const content = JSON.parse(atob(data.content))
  return { ...content, _sha: data.sha }
}

/**
 * Write portfolio.config.json to the repo.
 * Commits the change directly to main.
 */
export async function writeConfig(holdings, sha) {
  const token = getToken()
  if (!token) throw new Error('No GitHub token configured')

  const config = { holdings }
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(config, null, 2) + '\n')))

  const res = await fetch(`${API_BASE}/repos/${REPO}/contents/${FILE_PATH}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Update portfolio config',
      content,
      sha,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `GitHub API error: ${res.status}`)
  }

  const data = await res.json()
  return data.content.sha // new sha for subsequent updates
}
