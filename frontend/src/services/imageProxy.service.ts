import { apiClient } from './api.service';
import type { UploadedImage } from '../types';

export const imageProxy = {
  async fetchBase64Remote(url: string): Promise<{ base64: string; mimeType: string }> {
    const safe = encodeURIComponent(url);
    return apiClient.get<{ base64: string; mimeType: string }>(`/api/proxy/image?url=${safe}`);
  },

  async fetchBase64Local(url: string): Promise<{ base64: string; mimeType: string }> {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
    const mimeTypeHeader = res.headers.get('content-type') || '';
    const mimeType = mimeTypeHeader.split(';')[0].trim() || 'application/octet-stream';
    if (!mimeType.startsWith('image/')) {
      throw new Error(`Not an image: ${url} (Content-Type: ${mimeType})`);
    }
    const blob = await res.blob();
    const b64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const result = String(reader.result || '');
          const [, base64] = result.split(',');
          resolve(base64 || '');
        } catch (e) { reject(e as any); }
      };
      reader.onerror = () => reject(reader.error || new Error('read failed'));
      reader.readAsDataURL(blob);
    });
    return { base64: b64, mimeType };
  },

  async toUploadedImage(url: string, title = 'image'): Promise<UploadedImage> {
    const isAbsolute = /^https?:\/\//i.test(url);
    const { base64, mimeType } = isAbsolute
      ? await this.fetchBase64Remote(url)
      : await this.fetchBase64Local(url);
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const ext = mimeType.split('/')[1] || 'png';
    const file = new File([blob], `${title}.${ext}`, { type: mimeType });
    // Use data URL for preview to guarantee loading in any context
    const previewUrl = `data:${mimeType};base64,${base64}`;
    return { file, previewUrl, base64, mimeType };
  },
};
