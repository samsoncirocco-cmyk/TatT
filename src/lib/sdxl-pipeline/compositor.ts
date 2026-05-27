/**
 * Compositor — ports agents/compositor.py to TypeScript.
 *
 * Downloads generated images, stitches them side-by-side with a 50px black
 * gutter using `sharp`, then uploads the composite PNG to Cloudflare R2 via
 * the S3-compatible API (@aws-sdk/client-s3).
 *
 * Returns the public R2 URL of the composite.
 */

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';

const GUTTER_PX = 50;

interface R2Config {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    publicBase: string;
}

function r2Config(): R2Config {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET_GENERATIONS ?? 'tatt-generations';
    const publicBase =
        process.env.R2_PUBLIC_BASE ?? 'https://pub-2d5367a44a2a4c8e988b42363ac2ffac.r2.dev';
    if (!accountId || !accessKeyId || !secretAccessKey) {
        throw new Error(
            'Missing R2 env vars (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)'
        );
    }
    return { accountId, accessKeyId, secretAccessKey, bucket, publicBase };
}

let s3Cache: S3Client | null = null;
function s3Client(): S3Client {
    if (s3Cache) return s3Cache;
    const cfg = r2Config();
    s3Cache = new S3Client({
        region: 'auto',
        endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: cfg.accessKeyId,
            secretAccessKey: cfg.secretAccessKey,
        },
    });
    return s3Cache;
}

async function downloadBuffer(url: string): Promise<Buffer> {
    const r = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!r.ok) throw new Error(`download failed ${r.status}: ${url}`);
    return Buffer.from(await r.arrayBuffer());
}

async function stitchSideBySide(buffers: Buffer[]): Promise<Buffer> {
    const metas = await Promise.all(
        buffers.map(async (b) => {
            const img = sharp(b);
            const meta = await img.metadata();
            return { buffer: b, width: meta.width ?? 0, height: meta.height ?? 0 };
        })
    );
    const maxH = Math.max(...metas.map((m) => m.height));

    const resized = await Promise.all(
        metas.map(async (m) => {
            if (m.height === maxH) {
                return { buffer: m.buffer, width: m.width, height: m.height };
            }
            const newW = Math.round(m.width * (maxH / m.height));
            const buf = await sharp(m.buffer)
                .resize(newW, maxH, { kernel: 'lanczos3' })
                .png()
                .toBuffer();
            return { buffer: buf, width: newW, height: maxH };
        })
    );

    const totalW = resized.reduce((s, r) => s + r.width, 0) + GUTTER_PX * (resized.length - 1);

    const composites: sharp.OverlayOptions[] = [];
    let x = 0;
    for (const r of resized) {
        composites.push({ input: r.buffer, left: x, top: 0 });
        x += r.width + GUTTER_PX;
    }

    return sharp({
        create: {
            width: totalW,
            height: maxH,
            channels: 3,
            background: { r: 0, g: 0, b: 0 },
        },
    })
        .composite(composites)
        .png()
        .toBuffer();
}

async function uploadPng(buffer: Buffer, key: string): Promise<string> {
    const cfg = r2Config();
    await s3Client().send(
        new PutObjectCommand({
            Bucket: cfg.bucket,
            Key: key,
            Body: buffer,
            ContentType: 'image/png',
        })
    );
    return `${cfg.publicBase}/${key}`;
}

/**
 * Download `imageUrls`, composite side-by-side (or pass through if len===1),
 * upload to R2, return public URL.
 */
export async function composite(imageUrls: string[]): Promise<string> {
    if (imageUrls.length === 0) {
        throw new Error('composite() requires at least one image_url');
    }
    const buffers = await Promise.all(imageUrls.map(downloadBuffer));
    const out = buffers.length === 1 ? buffers[0] : await stitchSideBySide(buffers);
    const key = `composite-${randomUUID()}.png`;
    return uploadPng(out, key);
}
