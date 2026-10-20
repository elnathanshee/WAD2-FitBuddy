// =============================================================================
// [IS216 Project Addition: Neon Services Status & Testing Route]
// Tests all 3 provisioned Neon services end-to-end:
// 1. Neon Postgres (queries database)
// 2. Neon Object Storage (upload & read from S3-compatible assets bucket)
// 3. Neon Functions (invokes remote hello function)
// =============================================================================

import { Router } from 'express'
import { getDb } from '../config/neon.js'
import { uploadAsset, getAsset, listAssets, BUCKET_NAME } from '../config/storage.js'

const router = Router()

// GET /api/neon/status - Tests all 3 Neon services
router.get('/status', async (req, res) => {
  const results = {
    postgres: { status: 'pending' },
    objectStorage: { status: 'pending' },
    functions: { status: 'pending' },
  }

  // 1. Test Neon Postgres
  try {
    const sql = getDb()
    const pgRes = await sql`SELECT NOW() as current_time, current_database() as db_name, version() as pg_version`
    results.postgres = {
      status: 'ok',
      database: pgRes[0]?.db_name,
      time: pgRes[0]?.current_time,
      version: pgRes[0]?.pg_version?.slice(0, 40) + '...',
    }
  } catch (err) {
    results.postgres = { status: 'error', error: err.message }
  }

  // 2. Test Neon Object Storage
  try {
    const testKey = `healthcheck-${Date.now()}.txt`
    const testPayload = `FitBuddy Neon Object Storage verified at ${new Date().toISOString()}`
    await uploadAsset(testKey, testPayload, 'text/plain')
    const retrieved = await getAsset(testKey)
    results.objectStorage = {
      status: 'ok',
      bucket: BUCKET_NAME,
      testedKey: testKey,
      verifiedContentMatch: retrieved === testPayload,
    }
  } catch (err) {
    results.objectStorage = { status: 'error', error: err.message }
  }

  // 3. Test Neon Functions
  try {
    const functionUrl = process.env.NEON_FUNCTION_HELLO_BASE_URL
    if (!functionUrl) throw new Error('NEON_FUNCTION_HELLO_BASE_URL is not configured')
    const fnResponse = await fetch(functionUrl)
    const fnText = await fnResponse.text()
    results.functions = {
      status: 'ok',
      url: functionUrl,
      statusCode: fnResponse.status,
      response: fnText.trim(),
    }
  } catch (err) {
    results.functions = { status: 'error', error: err.message }
  }

  const allOk = Object.values(results).every((s) => s.status === 'ok')
  res.status(allOk ? 200 : 500).json({ allServicesOperational: allOk, services: results })
})

// GET /api/neon/assets - List uploaded assets in bucket
router.get('/assets', async (req, res) => {
  try {
    const assets = await listAssets()
    res.json({ bucket: BUCKET_NAME, assets })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router

