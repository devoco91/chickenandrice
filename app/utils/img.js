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

// Optional optimizer (defaults ON). Set NEXT_PUBLIC_IMAGE_OPTIMIZER=0 to disable.
const OPT_ENABLED = String(process.env.NEXT_PUBLIC_IMAGE_OPTIMIZER ?? "1") !== "0";
export const OPTIMIZER_BASE = API_ROOT ? `${API_ROOT}/img` : '/img';

// Convert various backend image shapes/paths into a full URL (plain /uploads fallback)
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

// Build responsive sources via /img (optimizer). Falls back to /uploads when disabled or absolute URL.
export function buildImgSources(input, widths = [320, 640, 960, 1200, 1600]) {
  let s = input;
  if (typeof s !== 'string') {
    try {
      if (Array.isArray(s)) s = s[0] || '';
      else if (typeof s === 'object') s = s.url || s.path || s.filename || s.filepath || '';
    } catch {}
  }
  if (!s) return { src: '/fallback.jpg' };

  // absolute remote URL — can't optimize on our server
  if (/^https?:\/\//i.test(s)) {
    return { src: s };
  }

  const cleaned = String(s).replace(/\\/g, '/').replace(/^\/+/, '').replace(/^uploads\//i, '');

  if (!OPT_ENABLED) {
    const src = `${IMAGE_BASE}/${encodeURI(cleaned)}`;
    return { src };
  }

  const src = `${OPTIMIZER_BASE}/${encodeURI(cleaned)}?w=${Math.max(...widths)}`;
  const srcSet = widths.map((w) => `${OPTIMIZER_BASE}/${encodeURI(cleaned)}?w=${w} ${w}w`).join(', ');
  const sizes =
    '(max-width: 640px) 320px, (max-width: 1024px) 640px, (max-width: 1440px) 960px, 1200px';

  return { src, srcSet, sizes };
}
