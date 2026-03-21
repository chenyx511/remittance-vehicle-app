import type { ApiResponse } from '@/types';

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });

const compressImageDataUrl = (dataUrl: string, maxSide = 1280, quality = 0.75) =>
  new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const longestSide = Math.max(img.width, img.height);
      const scale = longestSide > maxSide ? maxSide / longestSide : 1;
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

const getBackendUploadUrl = () => {
  const url = import.meta.env.VITE_UPLOAD_API_URL;
  return typeof url === 'string' && url.trim() ? url.trim() : '';
};

const uploadToBackend = async (file: File, type: 'settlement' | 'proof') => {
  const uploadUrl = getBackendUploadUrl();
  if (!uploadUrl) return null;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  formData.append('filename', file.name);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`上传服务异常（${response.status}）`);
  }

  const payload = (await response.json()) as {
    url?: string;
    data?: { url?: string };
    message?: string;
  };
  const url = payload?.data?.url || payload?.url;
  if (!url) {
    throw new Error(payload?.message || '上传服务返回无效地址');
  }
  return url;
};

/** 统一的图片/文件上传逻辑：优先使用 Vercel 接口，否则回退到 data URL */
export async function performUpload(
  file: File,
  type: 'settlement' | 'proof',
): Promise<ApiResponse<{ url: string }>> {
  const backendUrl = await uploadToBackend(file, type);
  const url =
    backendUrl ||
    (file.type.startsWith('image/')
      ? await compressImageDataUrl(await fileToDataUrl(file))
      : await fileToDataUrl(file));
  return {
    code: 200,
    message: '上传成功',
    data: { url },
  };
}
