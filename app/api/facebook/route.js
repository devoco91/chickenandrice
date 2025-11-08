// ========================================
// File: app/api/facebook/route.js
// Next.js App Router (Node runtime)
// ========================================
export const runtime = 'nodejs';

import crypto from 'crypto';

const ACCESS_TOKEN =
  process.env.META_ACCESS_TOKEN ||
  process.env.FB_ACCESS_TOKEN ||
  process.env.FACEBOOK_ACCESS_TOKEN ||
  '';

const PIXEL_ID =
  process.env.META_PIXEL_ID ||
  process.env.FB_PIXEL_ID ||
  process.env.FACEBOOK_PIXEL_ID ||
  process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || // last resort, but fine
  '';

const FB_VERSION = process.env.META_GRAPH_VERSION || process.env.FB_API_VERSION || 'v21.0';
const TEST_EVENT_CODE = process.env.FB_TEST_EVENT_CODE || process.env.META_TEST_EVENT_CODE || '';

const sha256 = (v) =>
  v ? crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex') : undefined;

function parseCookie(header = '') {
  return header.split(';').reduce((acc, part) => {
    const [k, ...v] = part.trim().split('=');
    if (!k) return acc;
    acc[k] = decodeURIComponent(v.join('='));
    return acc;
  }, {});
}

function getClientIp(req) {
  const xff = req.headers.get('x-forwarded-for');
  if (!xff) return undefined;
  // first IP in the list
  return String(xff).split(',')[0].trim() || undefined;
}

function getFbcFbp(req) {
  const cookies = parseCookie(req.headers.get('cookie') || '');
  const fbp = cookies['_fbp'];
  let fbc = cookies['_fbc'];

  // Build _fbc from fbclid if present
  try {
    const url = new URL(req.url);
    const fbclid = url.searchParams.get('fbclid');
    if (fbclid) {
      const ts = Math.floor(Date.now() / 1000);
      fbc = `fb.1.${ts}.${fbclid}`;
    }
  } catch { /* ignore */ }

  return { fbc, fbp };
}

function buildUserData(req, extras = {}) {
  const ip = getClientIp(req);
  const ua = req.headers.get('user-agent') || undefined;
  const { fbc, fbp } = getFbcFbp(req);

  const out = {
    client_ip_address: ip,
    client_user_agent: ua,
    ...(fbc ? { fbc } : {}),
    ...(fbp ? { fbp } : {}),
  };

  // Meta expects arrays for hashed identifiers
  const addHash = (key, val) => {
    const h = sha256(val);
    if (h) out[key] = [h];
  };

  addHash('em', extras.email);
  addHash('ph', extras.phone);
  addHash('external_id', extras.external_id);
  addHash('fn', extras.first_name);
  addHash('ln', extras.last_name);
  addHash('ct', extras.city);
  addHash('st', extras.state);
  addHash('zp', extras.zip);
  addHash('country', extras.country);

  return out;
}

export async function POST(request) {
  try {
    if (!ACCESS_TOKEN || !PIXEL_ID) {
      return new Response(JSON.stringify({ error: 'Missing ACCESS_TOKEN or PIXEL_ID' }), { status: 400 });
    }

    const body = await request.json();

    const {
      event_name = 'Purchase',
      value = 0,
      currency = 'NGN',
      customer = {},                 // { email, phone, external_id, first_name, last_name, ... }
      items = [],                    // [{ id, quantity, item_price }]
      event_source_url,
      event_id,                      // REQUIRED: must equal browser pixel {eventID}
      test_event_code,               // optional override
    } = body || {};

    if (!event_id) {
      return new Response(JSON.stringify({ error: 'event_id required (must match pixel {eventID})' }), { status: 400 });
    }

    const user_data = buildUserData(request, customer);

    // Fallback source URL from Referer if not provided
    const sourceUrl =
      event_source_url || request.headers.get('referer') || new URL(request.url).origin;

    const payload = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id: String(event_id),
          action_source: 'website',
          event_source_url: sourceUrl,
          user_data,
          custom_data: {
            currency,
            value: Number(value) || 0,
            contents: Array.isArray(items)
              ? items.map((it) => ({
                  id: String(it.id),
                  quantity: Number(it.quantity || 1),
                  item_price: Number(it.item_price || 0),
                }))
              : undefined,
            content_ids: Array.isArray(items) ? items.map((it) => String(it.id)) : undefined,
            content_type: Array.isArray(items) && items.length ? 'product' : undefined,
          },
        },
      ],
      ...(test_event_code ? { test_event_code: String(test_event_code) } : TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
      access_token: ACCESS_TOKEN, // send token in body (preferred)
    };

    const url = `https://graph.facebook.com/${FB_VERSION}/${encodeURIComponent(PIXEL_ID)}/events`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }

    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, meta: json }), { status: 502 });
    }
    return new Response(JSON.stringify({ ok: true, meta: json }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'unknown' }), { status: 500 });
  }
}
