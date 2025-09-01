// app/uploads/[...path]/route.js
export const dynamic = 'force-dynamic';

export async function GET(req, ctx) {
  const { path } = await ctx.params;                 // ← Next 15 requires await
  const rel = Array.isArray(path) ? path.join('/') : '';

  // Build the uploads base from envs (dev: localhost:5000, prod: Fly)
  const api = process.env.NEXT_PUBLIC_API_URL || '';
  let base =
    process.env.NEXT_PUBLIC_BACKEND_UPLOADS_BASE ||
    (api
      ? (api.endsWith('/api') ? api.replace(/\/api$/, '/uploads') : api.replace(/\/$/, '') + '/uploads')
      : (process.env.NODE_ENV === 'development'
          ? 'http://localhost:5000/uploads'
          : 'https://fastfolderbackend.fly.dev/uploads'));

  base = base.replace(/\/+$/, '');
  const target = `${base}/${encodeURI(rel)}`;

  // Optional debug while testing:
  // console.log('[uploads route] →', target);

  return Response.redirect(target, 307);
}
