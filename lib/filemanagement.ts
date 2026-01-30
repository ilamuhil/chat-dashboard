import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function mustGetEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

/**
 * Creates an S3Client configured for Cloudflare R2.
 * R2 is S3-compatible, so we can use the AWS SDK with R2's endpoint.
 */
function createR2Client(): S3Client {
  const baseUrl = mustGetEnv('CLOUDFLARE_R2_BASE_URL')
  const accessKeyId = mustGetEnv('ACCESS_KEY_ID')
  const secretAccessKey = mustGetEnv('SECRET_ACCESS_KEY')

  return new S3Client({
    region: 'auto',
    endpoint: baseUrl,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true, // Use path-style URLs: /bucket/key instead of bucket.s3.amazonaws.com/key
  })
}

/**
 * Creates a presigned URL for Cloudflare R2 (S3-compatible) using AWS SDK.
 *
 * Requires:
 * - CLOUDFLARE_R2_BASE_URL (e.g. https://<accountid>.r2.cloudflarestorage.com)
 * - ACCESS_KEY_ID
 * - SECRET_ACCESS_KEY
 */
export function getPresignedUrl(params: {
  method: 'GET' | 'PUT' | 'HEAD' | 'DELETE'
  bucket: string
  key: string
  expiresInSeconds?: number
}): string {
  const { method, bucket, key, expiresInSeconds = 60 * 15 } = params

  const client = createR2Client()

  let command
  switch (method) {
    case 'GET':
      command = new GetObjectCommand({ Bucket: bucket, Key: key })
      break
    case 'PUT':
      command = new PutObjectCommand({ Bucket: bucket, Key: key })
      break
    case 'HEAD':
      command = new HeadObjectCommand({ Bucket: bucket, Key: key })
      break
    case 'DELETE':
      command = new DeleteObjectCommand({ Bucket: bucket, Key: key })
      break
    default:
      throw new Error(`Unsupported method: ${method}`)
  }

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}

/**
 * Uploads a `File` to Cloudflare R2 using AWS SDK PutObjectCommand.
 */
export async function uploadFile(file: File, key: string, bucket: string) {
  const client = createR2Client()
  const buffer = Buffer.from(await file.arrayBuffer())

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: file.type || 'application/octet-stream',
    ContentLength: buffer.byteLength,
  })

  try {
    await client.send(command)
    const baseUrl = mustGetEnv('CLOUDFLARE_R2_BASE_URL')
    const base = new URL(baseUrl)
    const url = `${base.origin}/${bucket}/${key}`
    return { success: true as const, key, url }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'unknown error'
    throw new Error(`R2 upload failed: ${errorMessage}`)
  }
}

/**
 * Downloads an object from R2 using AWS SDK GetObjectCommand.
 * Returns the file data and metadata.
 */
export async function getFile(bucket: string, key: string) {
  const client = createR2Client()
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  try {
    const response = await client.send(command)
    
    if (!response.Body) {
      throw new Error('No body in response')
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of response.Body as any) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    // Get presigned URL for reference
    const getUrl = await getPresignedUrl({
      method: 'GET',
      bucket,
      key,
      expiresInSeconds: 60 * 5,
    })

    return {
      data: buffer,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      url: getUrl,
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'unknown error'
    throw new Error(`R2 get failed: ${errorMessage}`)
  }
}

/**
 * Deletes an object from R2 using AWS SDK DeleteObjectCommand.
 */
export async function deleteFile(bucket: string, key: string) {
  const client = createR2Client()
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  try {
    await client.send(command)
    return { success: true as const }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'unknown error'
    throw new Error(`R2 delete failed: ${errorMessage}`)
  }
}

/**
 * Constructs a public URL for an R2 object.
 * Assumes the bucket is public or a custom domain is configured.
 * For private buckets, use getPresignedUrl with method 'GET' instead.
 */
export function getPublicUrl(bucket: string, key: string): string {
  const baseUrl = mustGetEnv('CLOUDFLARE_R2_BASE_URL')
  const base = new URL(baseUrl)
  const basePath = base.pathname && base.pathname !== '/' ? base.pathname : ''
  // Encode each path segment separately
  const encodedKey = key
    .split('/')
    .filter(Boolean)
    .map(seg => encodeURIComponent(seg))
    .join('/')
  const encodedBucket = encodeURIComponent(bucket)
  return `${base.origin}${basePath}/${encodedBucket}/${encodedKey}`
}

/**
 * Gets a presigned GET URL for displaying images/files in the browser.
 * Use this for private buckets or when you need time-limited access.
 */
export async function getPresignedGetUrl(bucket: string, key: string, expiresInSeconds: number = 60 * 60 * 24): Promise<string> {
  return getPresignedUrl({
    method: 'GET',
    bucket,
    key,
    expiresInSeconds,
  })
}