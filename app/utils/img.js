// app/utils/img.js
import { API_BASE } from './apiBase';

// Prefer an explicit uploads/images base when provided
const EXPLICIT_IMAGE_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_UPLOADS_BASE ||
  process.env.NEXT_PUBLIC_IMAGE_BASE_URL ||
  ''
).replace(/\/+$/, '');

// Root of the API host (strip trailing /api or /api/v<number>)
const API_ROOT = (API_BASE || '').replace(/\/api(?:\/v\d+)?$/i, '');

// Final base for images: explicit > API root + /uploads
export const IMAGE_BASE = EXPLICIT_IMAGE_BASE || (API_ROOT ? `${API_ROOT}/uploads` : '/uploads');

// Convert various backend image shapes/paths into a full URL
export function getImageUrl(input) {
  let s = input;
  if (!s) return '/fallback.jpg';

  if (typeof s !== 'string') {
    try {
      if (Array.isArray(s)) s = s[0] || '';
      else if (typeof s === 'object') s = s.url || s.path || s.filename || s.filepath || '';
    } catch {}
  }

  if (!s) return '/fallback.jpg';

  // already absolute?
  if (/^https?:\/\//i.test(s)) return s;

  // normalize relative like "uploads/foo.jpg", "/uploads/foo.jpg", "foo.jpg", "images\foo.jpg"
  const cleaned = String(s)
    .replace(/\\/g, '/')        // windows slashes → forward
    .replace(/^\/+/, '')        // drop leading slashes
    .replace(/^uploads\//i, ''); // avoid double uploads/

  return `${IMAGE_BASE}/${encodeURI(cleaned)}`;
}
