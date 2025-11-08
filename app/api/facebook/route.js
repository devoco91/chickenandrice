// ========================================
// File: app/api/facebook/route.js
// ========================================
import crypto from 'crypto';

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN; // server env
// allow fallback to the same ID the client uses
const PIXEL_ID = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
const FB_VERSION = process.env.META_GRAPH_VERSION || 'v20.0';

export async function POST(request) {
  try {
    const {
      event_name,
      value,
      currency,
      email,
      event_source_url,
      fbp,
      fbc,
      event_id,          // ✅ for dedup
      test_event_code,   // ✅ for Events Manager test mode
    } = await request.json();

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
          event_id: event_id || undefined, // ✅ dedup key
          user_data,
          custom_data: {
            currency: currency || 'NGN',
            value: Number(value) || 0,
          },
        },
      ],
    };

    const qs = new URLSearchParams({ access_token: ACCESS_TOKEN });
    if (test_event_code) qs.set('test_event_code', String(test_event_code));
    const url = `https://graph.facebook.com/${FB_VERSION}/${encodeURIComponent(PIXEL_ID)}/events?${qs.toString()}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
