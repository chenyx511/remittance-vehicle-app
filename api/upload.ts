import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import fs from 'node:fs';

const MAX_SIZE = 4 * 1024 * 1024; // 4MB（Vercel 限制约 4.5MB）
const ALLOWED_TYPES = /^image\/(jpeg|png|gif|webp)$/;

function cors(res: VercelResponse, origin: string) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(
  res: VercelResponse,
  data: unknown,
  status: number,
  origin: string
) {
  cors(res, origin);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(data);
}

function parseForm(req: VercelRequest) {
  const form = formidable({
    maxFileSize: MAX_SIZE,
    keepExtensions: false,
  });
  return form.parse(req) as Promise<[formidable.Fields, formidable.Files]>;
}

function resolveCorsOrigin(req: VercelRequest): string {
  const configured = process.env.CORS_ORIGIN || 'https://chenyx511.github.io';
  if (configured === '*') return '*';
  const requestOrigin = req.headers.origin;
  if (!requestOrigin) return configured.split(',')[0]?.trim() || configured;
  const allowed = configured.split(',').map((o) => o.trim());
  return allowed.includes(requestOrigin) ? requestOrigin : allowed[0] || configured;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = resolveCorsOrigin(req);
  cors(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return json(res, { message: 'Method not allowed' }, 405, origin);
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'chenyx511/remittance-vehicle-app';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const pathPrefix = process.env.GITHUB_UPLOAD_PATH || 'uploads';

  if (!token) {
    return json(
      res,
      { message: 'Server: GITHUB_TOKEN not configured' },
      500,
      origin
    );
  }

  let file: formidable.File;
  let type = 'settlement';
  try {
    const [fields, files] = await parseForm(req);
    const fileList = files.file;
    const fileObj = Array.isArray(fileList) ? fileList[0] : fileList;
    if (!fileObj) {
      return json(res, { message: 'Missing file' }, 400, origin);
    }
    file = fileObj;
    const t = Array.isArray(fields?.type) ? fields.type[0] : fields?.type;
    if (t === 'proof') type = 'proof';
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Parse error';
    return json(res, { message: msg }, 400, origin);
  }

  if (file.size > MAX_SIZE) {
    return json(res, { message: 'File too large (max 4MB)' }, 413, origin);
  }
  if (file.mimetype && !ALLOWED_TYPES.test(file.mimetype)) {
    return json(res, { message: 'Only image files allowed' }, 400, origin);
  }

  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(file.filepath);
  } finally {
    try {
      fs.unlinkSync(file.filepath);
    } catch {
      /* ignore */
    }
  }

  const ext = (file.originalFilename || '')
    .split('.')
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '') || 'jpg';
  const safeExt = ['jpeg', 'jpg', 'png', 'gif', 'webp'].includes(ext) ? ext : 'jpg';
  const date = new Date();
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ghPath = `${pathPrefix}/${type}/${y}/${m}/${d}/${id}.${safeExt}`;
  const content = buffer.toString('base64');

  const [owner, repoName] = repo.split('/');
  const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${ghPath}`;

  const ghRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Upload: ${ghPath}`,
      content,
      branch,
    }),
  });

  if (!ghRes.ok) {
    const err = (await ghRes.json()) as { message?: string };
    return json(
      res,
      { message: err?.message || `GitHub API error: ${ghRes.status}` },
      ghRes.status >= 500 ? 502 : 400,
      origin
    );
  }

  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/${ghPath}`;
  return json(
    res,
    {
      message: '上传成功',
      data: { url: rawUrl },
    },
    200,
    origin
  );
}

export const config = {
  api: {
    bodyParser: false,
  },
};
