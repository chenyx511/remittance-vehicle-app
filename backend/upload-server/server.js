import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8787);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB || 8);
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const BASE_URL = process.env.BASE_URL || '';

const uploadPath = path.resolve(__dirname, UPLOAD_DIR);
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN,
  }),
);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadPath),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext && ext.length <= 10 ? ext : '.jpg';
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${id}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

app.use('/uploads', express.static(uploadPath));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'upload-server' });
});

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: 'Missing file' });
    return;
  }

  const urlBase = BASE_URL || `${req.protocol}://${req.get('host')}`;
  const url = `${urlBase}/uploads/${req.file.filename}`;
  res.json({
    message: '上传成功',
    data: {
      url,
    },
  });
});

app.use((err, _req, res, _next) => {
  const message = err?.message || 'Upload failed';
  const status = message.includes('File too large') ? 413 : 400;
  res.status(status).json({ message });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Upload server running on http://localhost:${PORT}`);
});
