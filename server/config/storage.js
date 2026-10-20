// =============================================================================
// [IS216 Project Addition: Neon Object Storage Client]
// Technology: @aws-sdk/client-s3 (S3-compatible API for Neon Object Storage)
//
// Follows Neon Object Storage best practices: path-style addressing & SigV4.
// =============================================================================

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { cleanEnvVar } from './neon.js'

export const BUCKET_NAME = 'assets'

let s3ClientInstance = null

export function getS3Client() {
  const endpoint = cleanEnvVar(process.env.AWS_ENDPOINT_URL_S3, 'AWS_ENDPOINT_URL_S3')
  const region = cleanEnvVar(process.env.AWS_REGION, 'AWS_REGION') || 'ap-southeast-1'
  const accessKeyId = cleanEnvVar(process.env.AWS_ACCESS_KEY_ID, 'AWS_ACCESS_KEY_ID')
  const secretAccessKey = cleanEnvVar(process.env.AWS_SECRET_ACCESS_KEY, 'AWS_SECRET_ACCESS_KEY')

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null
  }

  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for Neon Object Storage
    })
  }

  return s3ClientInstance
}

/**
 * Uploads an object to the Neon assets bucket
 */
export async function uploadAsset(key, content, contentType = 'text/plain') {
  const client = getS3Client()
  if (!client) throw new Error('Neon Object Storage environment variables are not configured')

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: contentType,
  })

  return client.send(command)
}

/**
 * Lists objects in the Neon assets bucket
 */
export async function listAssets() {
  const client = getS3Client()
  if (!client) throw new Error('Neon Object Storage environment variables are not configured')

  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
  })

  const response = await client.send(command)
  return response.Contents || []
}

/**
 * Retrieves an object from the Neon assets bucket
 */
export async function getAsset(key) {
  const client = getS3Client()
  if (!client) throw new Error('Neon Object Storage environment variables are not configured')

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  const response = await client.send(command)
  return response.Body.transformToString()
}
