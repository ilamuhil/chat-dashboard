import crypto from 'node:crypto'
import axios from 'axios'

function mustGetEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

// AWS SigV4 wants RFC3986 encoding (encodeURIComponent is close, but not exact).
function encodeRFC3986(input: string) {
  return encodeURIComponent(input).replace(/[!'()*]/g, c =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  )
}

function encodePathSegments(path: string) {
  return path
    .split('/')
    .filter(Boolean)
    .map(seg => encodeRFC3986(seg))
    .join('/')
}

function hmac(key: Buffer | string, msg: string) {
  return crypto.createHmac('sha256', key).update(msg).digest()
}

function sha256Hex(msg: string) {
  return crypto.createHash('sha256').update(msg).digest('hex')
}

function amzNow() {
  // 20260120T123456Z (no dashes/colons/ms)
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  return { amzDate, dateStamp: amzDate.slice(0, 8) }
}

/**
 * Creates a SigV4 presigned URL for Cloudflare R2 (S3-compatible).
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
}) {
  const { method, bucket, key, expiresInSeconds = 60 * 15 } = params

  const baseUrl = mustGetEnv('CLOUDFLARE_R2_BASE_URL')
  const accessKeyId = mustGetEnv('ACCESS_KEY_ID')
  const secretAccessKey = mustGetEnv('SECRET_ACCESS_KEY')

  const base = new URL(baseUrl)
  const host = base.host

  const region = 'auto'
  const service = 's3'

  const { amzDate, dateStamp } = amzNow()
  const scope = `${dateStamp}/${region}/${service}/aws4_request`

  // Path-style request: /<bucket>/<key>
  // Preserve baseUrl pathname (for custom domains that mount R2 behind a path).
  const basePath = base.pathname && base.pathname !== '/' ? `/${encodePathSegments(base.pathname)}` : ''
  const canonicalUri = `${basePath}/${encodePathSegments(bucket)}/${encodePathSegments(key)}`

  const queryParams: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': `${expiresInSeconds}`,
    'X-Amz-SignedHeaders': 'host',
  }

  const canonicalQueryString = Object.keys(queryParams)
    .sort()
    .map(k => `${encodeRFC3986(k)}=${encodeRFC3986(queryParams[k])}`)
    .join('&')

  const canonicalHeaders = `host:${host}\n`
  const signedHeaders = 'host'
  const payloadHash = 'UNSIGNED-PAYLOAD'

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n')

  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp)
  const kRegion = hmac(kDate, region)
  const kService = hmac(kRegion, service)
  const kSigning = hmac(kService, 'aws4_request')

  const signature = crypto
    .createHmac('sha256', kSigning)
    .update(stringToSign)
    .digest('hex')

  // base.origin preserves http/https and custom host.
  return `${base.origin}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`
}

/**
 * Uploads a `File` to Cloudflare R2 using a SigV4 presigned PUT URL.
 */
export async function uploadFile(file: File, key: string, bucket: string) {
  const putUrl = getPresignedUrl({
    method: 'PUT',
    bucket,
    key,
    expiresInSeconds: 60 * 15,
  })

  // Axios in Node is happier with a Buffer than a web `File` object.
  const buf = Buffer.from(await file.arrayBuffer())
  try {
    await axios.put(putUrl, buf, {
      headers: {
        // R2 accepts missing content-type, but sending it is better.
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Length': buf.byteLength,
      },
      // Presigned URLs already encode auth; don't transform.
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: s => s >= 200 && s < 300,
    })
  } catch (err: unknown) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined
    const body =
      axios.isAxiosError(err) && err.response?.data != null
        ? typeof err.response.data === 'string'
          ? err.response.data
          : JSON.stringify(err.response.data)
        : ''
    throw new Error(
      `R2 upload failed (${status ?? 'unknown'}): ${body || (err instanceof Error ? err.message : 'unknown error')}`
    )
  }

  return { success: true as const, key, url: putUrl.split('?')[0] }
}

/**
 * Downloads an object from R2 using a SigV4 presigned GET URL.
 * Returns the fetch `Response` so callers can stream, `.arrayBuffer()`, etc.
 */
export async function getFile(bucket: string, key: string) {
  const getUrl = getPresignedUrl({
    method: 'GET',
    bucket,
    key,
    expiresInSeconds: 60 * 5,
  })

  try {
    const res = await axios.get<ArrayBuffer>(getUrl, {
      responseType: 'arraybuffer',
      validateStatus: s => s >= 200 && s < 300,
    })
    return {
      data: Buffer.from(res.data),
      contentType: (res.headers?.['content-type'] as string | undefined) ?? undefined,
      contentLength:
        typeof res.headers?.['content-length'] === 'string'
          ? Number(res.headers['content-length'])
          : undefined,
      url: getUrl,
    }
  } catch (err: unknown) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined
    const body =
      axios.isAxiosError(err) && err.response?.data != null
        ? typeof err.response.data === 'string'
          ? err.response.data
          : JSON.stringify(err.response.data)
        : ''
    throw new Error(
      `R2 get failed (${status ?? 'unknown'}): ${body || (err instanceof Error ? err.message : 'unknown error')}`
    )
  }
}

/**
 * Deletes an object from R2 using a SigV4 presigned DELETE URL.
 */
export async function deleteFile(bucket: string, key: string) {
  const deleteUrl = getPresignedUrl({
    method: 'DELETE',
    bucket,
    key,
    expiresInSeconds: 60 * 5,
  })

  try {
    await axios.delete(deleteUrl, {
      validateStatus: s => s >= 200 && s < 300,
    })
    return { success: true as const }
  } catch (err: unknown) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined
    const body =
      axios.isAxiosError(err) && err.response?.data != null
        ? typeof err.response.data === 'string'
          ? err.response.data
          : JSON.stringify(err.response.data)
        : ''
    throw new Error(
      `R2 delete failed (${status ?? 'unknown'}): ${body || (err instanceof Error ? err.message : 'unknown error')}`
    )
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
  const encodedKey = key
    .split('/')
    .filter(Boolean)
    .map(seg => encodePathSegments(seg))
    .join('/')
  return `${base.origin}${basePath}/${encodePathSegments(bucket)}/${encodedKey}`
}

/**
 * Gets a presigned GET URL for displaying images/files in the browser.
 * Use this for private buckets or when you need time-limited access.
 */
export function getPresignedGetUrl(bucket: string, key: string, expiresInSeconds: number = 60 * 60 * 24): string {
  return getPresignedUrl({
    method: 'GET',
    bucket,
    key,
    expiresInSeconds,
  })
}