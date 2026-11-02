import crypto from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import { getDb } from '../config/neon.js'
import { toDateKey } from '../utils/dates.js'

const API = 'https://health.googleapis.com/v4'
const SCOPE = 'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly'

function settings() {
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET?.trim()
  const encryptionKey = process.env.HEALTH_TOKEN_ENCRYPTION_KEY?.trim()
  const appUrl = process.env.APP_URL?.trim().replace(/\/$/, '')
  const fallbackHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  const baseUrl = appUrl || (fallbackHost ? `https://${fallbackHost}` : `http://localhost:${process.env.PORT || 3000}`)
  const redirectUri = process.env.GOOGLE_HEALTH_REDIRECT_URI?.trim() || `${baseUrl}/api/health-sync/google/callback`
  const missingConfig = [
    !clientId && 'GOOGLE_HEALTH_CLIENT_ID',
    !clientSecret && 'GOOGLE_HEALTH_CLIENT_SECRET',
    !encryptionKey && 'HEALTH_TOKEN_ENCRYPTION_KEY',
  ].filter(Boolean)
  return { clientId, clientSecret, encryptionKey, redirectUri, baseUrl, configured: missingConfig.length === 0, missingConfig }
}

function oauthClient() {
  const config = settings()
  if (!config.clientId || !config.clientSecret) {
    const error = new Error('Google Health is not configured yet. Add the Google OAuth client ID and secret to the server environment.')
    error.status = 503
    throw error
  }
  return new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri)
}

function tokenKey() {
  const secret = process.env.HEALTH_TOKEN_ENCRYPTION_KEY?.trim()
  if (!secret) {
    const error = new Error('Health token encryption is not configured on the server.')
    error.status = 503
    throw error
  }
  return crypto.createHash('sha256').update(secret).digest()
}

function encryptToken(token) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', tokenKey(), iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.')
}

function decryptToken(value) {
  const [ivText, tagText, encryptedText] = value.split('.')
  const decipher = crypto.createDecipheriv('aes-256-gcm', tokenKey(), Buffer.from(ivText, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64url')), decipher.final()]).toString('utf8')
}

function publicError(message, status = 400) {
  const error = new Error(message)
  error.status = status
  return error
}

export async function getGoogleHealthStatus(req, res) {
  const config = settings()
  const sql = getDb()
  const [connection] = await sql`SELECT connected_at, last_synced_at FROM google_health_connections WHERE user_id = ${req.userId}`
  res.json({ configured: config.configured, missingConfig: config.missingConfig, connected: Boolean(connection), connectedAt: connection?.connected_at || null, lastSyncedAt: connection?.last_synced_at || null })
}

export async function startGoogleHealthConnect(req, res) {
  const config = settings()
  const client = oauthClient()
  if (!config.configured) throw publicError('Add GOOGLE_HEALTH_CLIENT_ID, GOOGLE_HEALTH_CLIENT_SECRET, and HEALTH_TOKEN_ENCRYPTION_KEY to the server environment.', 503)
  const sql = getDb()
  await sql`DELETE FROM google_health_oauth_states WHERE expires_at < NOW()`
  const state = crypto.randomBytes(32).toString('base64url')
  const stateHash = crypto.createHash('sha256').update(state).digest('hex')
  await sql`INSERT INTO google_health_oauth_states (state_hash, user_id, expires_at) VALUES (${stateHash}, ${req.userId}, NOW() + INTERVAL '10 minutes')`
  const url = client.generateAuthUrl({
    access_type: 'offline', include_granted_scopes: true, prompt: 'consent', state,
    scope: [SCOPE],
  })
  res.json({ url })
}

function appRedirect(req, res, status) {
  const baseUrl = settings().baseUrl
  const destination = new URL('/', baseUrl)
  destination.searchParams.set('googleHealth', status)
  return res.redirect(destination.toString())
}

export async function googleHealthCallback(req, res) {
  const { code, state, error: oauthError } = req.query
  if (oauthError || typeof code !== 'string' || typeof state !== 'string') return appRedirect(req, res, oauthError === 'access_denied' ? 'cancelled' : 'error')
  try {
    const sql = getDb()
    const stateHash = crypto.createHash('sha256').update(state).digest('hex')
    const [stateRow] = await sql`DELETE FROM google_health_oauth_states WHERE state_hash = ${stateHash} AND expires_at > NOW() RETURNING user_id`
    if (!stateRow) return appRedirect(req, res, 'expired')

    const client = oauthClient()
    const { tokens } = await client.getToken(code)
    if (!tokens.access_token) throw publicError('Google did not return an access token.')
    client.setCredentials(tokens)
    const identity = await googleRequest(client, '/users/me/identity')
    if (!identity.healthUserId) throw publicError('This Google account is not linked to a Google Health profile. Open the Google Health app and link this account first.')

    const [existing] = await sql`SELECT encrypted_refresh_token FROM google_health_connections WHERE user_id = ${stateRow.user_id}`
    const refreshToken = tokens.refresh_token || (existing ? decryptToken(existing.encrypted_refresh_token) : null)
    if (!refreshToken) throw publicError('Google did not grant ongoing access. Reconnect and approve the requested access.')
    const encryptedToken = encryptToken(refreshToken)
    const scopes = (tokens.scope || SCOPE).split(' ').filter(Boolean)
    await sql`INSERT INTO google_health_connections (user_id, google_health_user_id, encrypted_refresh_token, granted_scopes, connected_at)
      VALUES (${stateRow.user_id}, ${identity.healthUserId}, ${encryptedToken}, ${scopes}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET google_health_user_id = EXCLUDED.google_health_user_id,
        encrypted_refresh_token = EXCLUDED.encrypted_refresh_token, granted_scopes = EXCLUDED.granted_scopes, connected_at = NOW()`
    return appRedirect(req, res, 'connected')
  } catch (error) {
    console.error('Google Health OAuth callback failed:', error.message)
    return appRedirect(req, res, error.message.includes('not linked') ? 'not-linked' : 'error')
  }
}

async function googleRequest(client, path, init = {}) {
  const { token } = await client.getAccessToken()
  if (!token) throw publicError('Google access expired. Reconnect your Google Health account.', 401)
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = body.error?.message || body.error_description || 'Google Health could not return activity data.'
    const error = publicError(message, response.status)
    error.googleStatus = response.status
    throw error
  }
  return body
}

function civilDateTime(date) {
  const [year, month, day] = date.split('-').map(Number)
  return { date: { year, month, day }, time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 } }
}

async function dailyMetric(client, type, date) {
  const next = new Date(`${date}T12:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  const endDate = next.toISOString().slice(0, 10)
  const result = await googleRequest(client, `/users/me/dataTypes/${type}/dataPoints:dailyRollUp`, {
    method: 'POST', body: JSON.stringify({ range: { start: civilDateTime(date), end: civilDateTime(endDate) }, windowSizeDays: 1, pageSize: 1 }),
  })
  return result.rollupDataPoints?.[0] || null
}

async function readTodayMetrics(client, date) {
  const types = ['steps', 'active-minutes', 'distance', 'active-energy-burned']
  const [steps, active, distance, calories] = await Promise.all(types.map((type) => dailyMetric(client, type, date)))
  const activeMinutes = (active?.activeMinutes?.activeMinutesRollupByActivityLevel || []).reduce((sum, level) => sum + Number(level.activeMinutesSum || 0), 0)
  return {
    steps: Number(steps?.steps?.countSum || 0), stepsGoal: 10000,
    activeMinutes, activeMinutesGoal: 30,
    distanceKm: (Number(distance?.distance?.millimetersSum || 0) / 1_000_000).toFixed(2),
    caloriesBurned: Number(calories?.activeEnergyBurned?.kcalSum || 0),
    lastSynced: new Date().toISOString(),
  }
}

async function getConnectedClient(userId) {
  const sql = getDb()
  const [connection] = await sql`SELECT encrypted_refresh_token, connected_at, last_synced_at FROM google_health_connections WHERE user_id = ${userId}`
  if (!connection) throw publicError('Connect your Google Health account before syncing.', 409)
  const client = oauthClient()
  client.setCredentials({ refresh_token: decryptToken(connection.encrypted_refresh_token) })
  return { client, connection }
}

export async function getTodayMetrics(req, res) {
  const sql = getDb()
  const [connection] = await sql`SELECT last_synced_at FROM google_health_connections WHERE user_id = ${req.userId}`
  if (!connection) return res.json({ connected: false, metrics: null })
  const { client } = await getConnectedClient(req.userId)
  const metrics = await readTodayMetrics(client, toDateKey())
  res.json({ connected: true, metrics: { ...metrics, lastSynced: connection.last_synced_at || null } })
}

export async function syncGoogleHealth(req, res) {
  const { client } = await getConnectedClient(req.userId)
  const date = toDateKey()
  const metrics = await readTodayMetrics(client, date)
  const body = req.body || {}
  const mappings = Object.fromEntries(['steps', 'activeMinutes'].map((key) => [key, Array.isArray(body.mappings?.[key]) ? [...new Set(body.mappings[key].map(String))] : []]))
  const selected = new Set(Object.values(mappings).flat())
  if (selected.size > 50) throw publicError('Too many habit mappings were selected.', 400)
  const sql = getDb()
  const habits = selected.size ? await sql`SELECT id, name, target_unit FROM habits WHERE user_id = ${req.userId}` : []
  const updates = []
  const done = new Set()
  for (const habit of habits) {
    const id = String(habit.id)
    if (done.has(id)) continue
    let count
    if (mappings.steps.includes(id)) count = habit.target_unit === 'steps' ? metrics.steps : 1
    else if (mappings.activeMinutes.includes(id)) count = habit.target_unit === 'minutes' ? metrics.activeMinutes : 1
    if (count === undefined) continue
    await sql`INSERT INTO check_ins (user_id, habit_id, date, count) VALUES (${req.userId}, ${habit.id}, ${date}, ${count})
      ON CONFLICT (habit_id, date) DO UPDATE SET count = EXCLUDED.count, updated_at = NOW()`
    updates.push({ id: habit.id, name: habit.name, syncedCount: count, unit: habit.target_unit })
    done.add(id)
  }
  await sql`UPDATE google_health_connections SET last_synced_at = NOW() WHERE user_id = ${req.userId}`
  res.json({ message: 'Synced current activity from Google Health.', provider: 'Google Health', syncedAt: metrics.lastSynced, metrics, updatedHabits: updates })
}

export async function disconnectGoogleHealth(req, res) {
  const { client, connection } = await getConnectedClient(req.userId)
  try { await client.revokeToken(decryptToken(connection.encrypted_refresh_token)) } catch { /* Remove local credentials even if Google already revoked them. */ }
  const sql = getDb()
  await sql`DELETE FROM google_health_connections WHERE user_id = ${req.userId}`
  res.json({ connected: false, message: 'Google Health disconnected.' })
}
