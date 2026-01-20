"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPresignedPutUrl = getPresignedPutUrl;
exports.uploadFile = uploadFile;
const cloudflare_1 = __importDefault(require("cloudflare"));
const crypto_1 = __importDefault(require("crypto"));
function encodeR2Key(key) {
    return key
        .split('/')
        .filter(Boolean)
        .map(encodeURIComponent)
        .join('/');
}
/**
 * Creates a SigV4 presigned PUT URL for R2's S3-compatible endpoint.
 * Supports optional sessionToken (temporary credentials).
 */
function getPresignedPutUrl(params) {
    const { accountId, accessKeyId, secretAccessKey, bucket, key, expiresInSeconds = 1800, sessionToken, } = params;
    const host = `${accountId}.r2.cloudflarestorage.com`;
    const region = 'auto';
    const service = 's3';
    // 20260120T123456Z
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const scope = `${dateStamp}/${region}/${service}/aws4_request`;
    const canonicalUri = `/${bucket}/${encodeR2Key(key)}`;
    const queryParams = {
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': `${accessKeyId}/${scope}`,
        'X-Amz-Date': amzDate,
        'X-Amz-Expires': `${expiresInSeconds}`,
        'X-Amz-SignedHeaders': 'host',
    };
    if (sessionToken)
        queryParams['X-Amz-Security-Token'] = sessionToken;
    const canonicalQueryString = Object.keys(queryParams)
        .sort()
        .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
        .join('&');
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';
    const payloadHash = 'UNSIGNED-PAYLOAD';
    const canonicalRequest = [
        'PUT',
        canonicalUri,
        canonicalQueryString,
        canonicalHeaders,
        signedHeaders,
        payloadHash,
    ].join('\n');
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        scope,
        crypto_1.default.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');
    const hmac = (key, msg) => crypto_1.default.createHmac('sha256', key).update(msg).digest();
    const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    const kSigning = hmac(kService, 'aws4_request');
    const signature = crypto_1.default
        .createHmac('sha256', kSigning)
        .update(stringToSign)
        .digest('hex');
    return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}
/**
 * Uploads a `File` (received by a Next.js route/server action) to Cloudflare R2.
 *
 * Uses Cloudflare SDK only to mint *temporary* R2 credentials, then uploads via
 * the S3-compatible endpoint with a SigV4 presigned PUT URL.
 */
async function uploadFile(file, key, bucket) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const apiToken = process.env.R2_API_KEY_TOKEN;
    const parentAccessKeyId = process.env.R2_PARENT_ACCESS_KEY_ID;
    if (!accountId || !apiToken) {
        throw new Error('R2_ACCOUNT_ID or R2_API_KEY_TOKEN is not set');
    }
    if (!parentAccessKeyId) {
        throw new Error('R2_PARENT_ACCESS_KEY_ID is not set');
    }
    const cf = new cloudflare_1.default({ apiToken });
    const temp = await cf.r2.temporaryCredentials.create({
        account_id: accountId,
        bucket,
        parentAccessKeyId,
        permission: 'object-read-write',
        ttlSeconds: 60 * 20,
        objects: [key],
    });
    if (!temp.accessKeyId || !temp.secretAccessKey || !temp.sessionToken) {
        throw new Error('Failed to mint temporary R2 credentials');
    }
    const putUrl = getPresignedPutUrl({
        accountId,
        accessKeyId: temp.accessKeyId,
        secretAccessKey: temp.secretAccessKey,
        sessionToken: temp.sessionToken,
        bucket,
        key,
        expiresInSeconds: 60 * 20,
    });
    const res = await fetch(putUrl, {
        method: 'PUT',
        body: file,
        headers: {
            // R2 accepts missing content-type, but sending it is better.
            'Content-Type': file.type || 'application/octet-stream',
        },
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`R2 upload failed (${res.status}): ${errText || res.statusText}`);
    }
    return { success: true, key };
}
