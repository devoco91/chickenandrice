// ========================================
// File: app/api/facebook/route.js  (NEW)
// ========================================
import crypto from 'crypto';

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;   // set in Vercel/host env
const PIXEL_ID = process.env.META_PIXEL_ID;           // set in Vercel/host env
const FB_VERSION = process.env.META_GRAPH_VERSION || 'v20.0';

export async function POST(request) {
  try {
    const { event_name, value, currency, email, event_source_url, fbp, fbc } = await request.json();

    if (!ACCESS_TOKEN || !PIXEL_ID) {
      return new Response(JSON.stringify({ error: 'Missing META_ACCESS_TOKEN or META_PIXEL_ID' }), { status: 400 });
    }

    const hashedEmail = email
      ? crypto.createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex')
      : null;

    const user_data = {};
    if (hashedEmail) user_data.em = [hashedEmail];
    if (fbp) user_data.fbp = fbp;
    if (fbc) user_data.fbc = fbc;

    const payload = {
      data: [
        {
          event_name: event_name || 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: event_source_url || '',
          user_data,
          custom_data: {
            currency: currency || 'NGN',
            value: Number(value) || 0,
          },
        },
      ],
    };

    const url = `https://graph.facebook.com/${FB_VERSION}/${encodeURIComponent(PIXEL_ID)}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // Next runtime already server-side; keep simple
    });

    const json = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, meta: json }), { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true, meta: json }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'unknown' }), { status: 500 });
  }
}
