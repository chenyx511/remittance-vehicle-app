#!/usr/bin/env node
/**
 * 自建服务器图片上传接口
 * 将图片保存到本地目录，通过 nginx 或同域提供访问
 * 
 * 启动：PORT=3001 UPLOAD_DIR=./uploads node server/upload-server.js
 * 或：npm run server:upload
 */
import express from 'express';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MAX_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = /^image\/(jpeg|png|gif|webp)$/;

const PORT = parseInt(process.env.PORT || '3001', 10);
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'));
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();

function cors(res, origin) {
  const o = CORS_ORIGIN === '*' ? (res.req.headers.origin || '*') : CORS_ORIGIN;
  res.setHeader('Access-Control-Allow-Origin', o);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

app.options('/upload', (req, res) => {
  cors(res);
  res.status(200).end();
});

app.post('/upload', async (req, res) => {
  cors(res);
  const form = formidable({
    maxFileSize: MAX_SIZE,
    keepExtensions: false,
  });

  let type = 'settlement';
  let file;

  try {
    const [fields, files] = await form.parse(req);
    file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      res.status(400).json({ message: 'Missing file' });
      return;
    }
    const t = Array.isArray(fields?.type) ? fields.type[0] : fields?.type;
    if (t === 'proof') type = 'proof';
  } catch (e) {
    res.status(400).json({ message: e.message || 'Parse error' });
    return;
  }

  if (file.size > MAX_SIZE) {
    res.status(413).json({ message: 'File too large (max 4MB)' });
    return;
  }
  if (file.mimetype && !ALLOWED_TYPES.test(file.mimetype)) {
    res.status(400).json({ message: 'Only image files allowed' });
    return;
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
  const relPath = path.join('uploads', type, String(y), m, d, `${id}.${safeExt}`);
  const absDir = path.join(UPLOAD_DIR, type, String(y), m, d);
  const absPath = path.join(absDir, `${id}.${safeExt}`);

  try {
    fs.mkdirSync(absDir, { recursive: true });
    fs.renameSync(file.filepath, absPath);
  } catch (e) {
    try {
      fs.unlinkSync(file.filepath);
    } catch {}
    res.status(500).json({ message: e.message || 'Save failed' });
    return;
  }

  const base = PUBLIC_URL.replace(/\/$/, '');
  const url = `${base}/${relPath}`;
  res.status(200).json({
    message: '上传成功',
    data: { url },
  });
});

app.use('/uploads', express.static(UPLOAD_DIR));

app.listen(PORT, () => {
  console.log(`Upload server: http://localhost:${PORT}`);
  console.log(`Upload dir: ${UPLOAD_DIR}`);
  console.log(`Public URL: ${PUBLIC_URL}`);
});
