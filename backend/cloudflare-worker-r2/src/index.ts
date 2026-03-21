export interface Env {
  UPLOAD_BUCKET: R2Bucket;
  ALLOWED_ORIGIN?: string;
  MAX_FILE_SIZE_MB?: string;
  PUBLIC_BASE_URL?: string;
}

const json = (data: unknown, status = 200, origin = '*') =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'Content-Type,Authorization',
    },
  });

const normalizeOrigin = (origin: string | null, allowed: string) => {
  if (!origin) return '*';
  if (allowed === '*') return '*';
  return origin === allowed ? origin : '';
};

const getMaxBytes = (env: Env) => {
  const mb = Number(env.MAX_FILE_SIZE_MB || '8');
  const safeMb = Number.isFinite(mb) && mb > 0 ? mb : 8;
  return safeMb * 1024 * 1024;
};

const buildFileKey = (filename: string, kind: string) => {
  const ext = (filename.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeExt = ext || 'jpg';
  const date = new Date();
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const rand = crypto.randomUUID();
  return `${kind}/${yyyy}/${mm}/${dd}/${rand}.${safeExt}`;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';
    const requestOrigin = request.headers.get('origin');
    const corsOrigin = normalizeOrigin(requestOrigin, allowedOrigin);
    const { pathname } = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return json({ ok: true }, 200, corsOrigin || '*');
    }

    if (request.method === 'GET' && pathname === '/health') {
      return json({ ok: true, service: 'cf-worker-r2-upload' }, 200, corsOrigin || '*');
    }

    // 通过 Worker 代理读取文件，避免依赖公开 bucket URL
    if (request.method === 'GET' && pathname.startsWith('/files/')) {
      const key = decodeURIComponent(pathname.replace('/files/', ''));
      if (!key) return json({ message: 'Missing file key' }, 400, corsOrigin || '*');
      const object = await env.UPLOAD_BUCKET.get(key);
      if (!object) return json({ message: 'File not found' }, 404, corsOrigin || '*');

      const headers = new Headers();
      headers.set('access-control-allow-origin', corsOrigin || '*');
      headers.set('cache-control', 'public, max-age=31536000, immutable');
      if (object.httpMetadata?.contentType) {
        headers.set('content-type', object.httpMetadata.contentType);
      } else {
        headers.set('content-type', 'application/octet-stream');
      }
      return new Response(object.body, { status: 200, headers });
    }

    if (request.method === 'POST' && pathname === '/upload') {
      if (!corsOrigin && allowedOrigin !== '*') {
        return json({ message: 'CORS origin not allowed' }, 403, '*');
      }

      const contentType = request.headers.get('content-type') || '';
      if (!contentType.includes('multipart/form-data')) {
        return json({ message: 'Content-Type must be multipart/form-data' }, 400, corsOrigin || '*');
      }

      const form = await request.formData();
      const file = form.get('file');
      const type = String(form.get('type') || 'settlement');
      if (!(file instanceof File)) {
        return json({ message: 'Missing file' }, 400, corsOrigin || '*');
      }
      if (!file.type.startsWith('image/')) {
        return json({ message: 'Only image files are allowed' }, 400, corsOrigin || '*');
      }
      const maxBytes = getMaxBytes(env);
      if (file.size > maxBytes) {
        return json({ message: `File too large (>${Math.floor(maxBytes / 1024 / 1024)}MB)` }, 413, corsOrigin || '*');
      }

      const key = buildFileKey(file.name, type === 'proof' ? 'proof' : 'settlement');
      const body = await file.arrayBuffer();
      await env.UPLOAD_BUCKET.put(key, body, {
        httpMetadata: {
          contentType: file.type,
        },
      });

      const base = env.PUBLIC_BASE_URL?.trim() || new URL(request.url).origin;
      const url = `${base}/files/${encodeURIComponent(key)}`;
      return json(
        {
          message: '上传成功',
          data: { url },
        },
        200,
        corsOrigin || '*',
      );
    }

    return json({ message: 'Not found' }, 404, corsOrigin || '*');
  },
};
