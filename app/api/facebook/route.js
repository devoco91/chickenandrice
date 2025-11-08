// ========================================
// File: app/api/facebook/route.js
// Next.js App Router (Node runtime)
// ========================================
export const runtime = 'nodejs';

import crypto from 'crypto';

// ---- Env (server-only) ----
const ACCESS_TOKEN =
  process.env.META_ACCESS_TOKEN ||
  process.env.FB_ACCESS_TOKEN ||
  process.env.FACEBOOK_ACCESS_TOKEN ||
  '';

const PIXEL_ID =
  process.env.META_PIXEL_ID ||
  process.env.FB_PIXEL_ID ||
  process.env.FACEBOOK_PIXEL_ID ||
  process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || // last resort
  '';

const FB_VERSION = process.env.META_GRAPH_VERSION || process.env.FB_API_VERSION || 'v21.0';
const TEST_EVENT_CODE = process.env.FB_TEST_EVENT_CODE || process.env.META_TEST_EVENT_CODE || '';

/* ---------- helpers ---------- */
const sha256 = (v) =>
  v && String(v).trim()
    ? crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex')
    : undefined;

const normPhoneDigits = (v) => (v ? String(v).replace(/[^\d]/g, '') : '');

const parseCookie = (header = '') =>
  header.split(';').reduce((acc, part) => {
    const [k, ...v] = part.trim().split('=');
    if (!k) return acc;
    acc[k] = decodeURIComponent(v.join('='));
    return acc;
  }, {});

function getClientIp(req) {
  const xff = req.headers.get('x-forwarded-for');
  if (!xff) return undefined;
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
    if (fbclid && !fbc) {
      const ts = Math.floor(Date.now() / 1000);
      fbc = `fb.1.${ts}.${fbclid}`;
    }
  } catch {}
  return { fbc, fbp };
}

function buildUserData(req, customer = {}, bodyFbpFbc = {}) {
  const ip = getClientIp(req);
  const ua = req.headers.get('user-agent') || undefined;
  const cookieIds = getFbcFbp(req);
  const fbp = bodyFbpFbc.fbp || cookieIds.fbp;
  const fbc = bodyFbpFbc.fbc || cookieIds.fbc;

  const ud = {
    client_ip_address: ip,
    client_user_agent: ua,
    ...(fbc ? { fbc } : {}),
    ...(fbp ? { fbp } : {}),
  };

  const addHash = (key, val) => {
    const h = sha256(val);
    if (h) ud[key] = [h];
  };

  addHash('em', customer.email);
  addHash('ph', normPhoneDigits(customer.phone));
  addHash('external_id', customer.external_id);
  addHash('fn', customer.first_name);
  addHash('ln', customer.last_name);
  addHash('ct', customer.city);
  addHash('st', customer.state);
  addHash('zp', customer.zip);
  addHash('country', customer.country);

  return ud;
}

/* ---------- handler ---------- */
export async function POST(request) {
  try {
    if (!ACCESS_TOKEN || !PIXEL_ID) {
      return new Response(JSON.stringify({ error: 'Missing META_ACCESS_TOKEN or META_PIXEL_ID' }), { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) || {};

    const {
      event_name = 'Purchase',
      value = 0,
      currency = 'NGN',
      event_source_url,
      event_id,                  // dedup (optional, recommended)
      test_event_code,
      fbp,
      fbc,
      items = [],                // [{ id|sku|name, quantity, item_price|price }]
      order_id,                  // your internal order ref
      customer = {},             // {email, phone, first_name, last_name, city, state, zip, country, external_id}
    } = body;

    const user_data = buildUserData(request, customer, { fbp, fbc });

    const contents = Array.isArray(items)
      ? items
          .map((it) => ({
            id: String(it.id ?? it.sku ?? it.name ?? '').trim() || undefined,
            quantity: Number(it.quantity || 1),
            item_price: Number(it.item_price ?? it.price ?? 0),
          }))
          .filter((c) => c.id)
      : [];

    const content_ids = contents.map((c) => String(c.id));
    const num_items = contents.reduce((a, c) => a + (Number(c.quantity) || 0), 0);

    const sourceUrl =
      event_source_url || request.headers.get('referer') || new URL(request.url).origin;

    const payload = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: sourceUrl,
          event_id: event_id || undefined, // do not force; improves success rate
          user_data,
          custom_data: {
            currency,
            value: Number(value) || 0,
            contents,
            content_ids,
            content_type: contents.length ? 'product' : undefined,
            num_items: num_items || undefined,
            order_id: order_id || undefined,
          },
        },
      ],
    };

    // Prefer query params for token & test code
    const qs = new URLSearchParams({ access_token: ACCESS_TOKEN });
    const test = String(test_event_code || TEST_EVENT_CODE || '');
    if (test) qs.set('test_event_code', test);

    const url = `https://graph.facebook.com/${FB_VERSION}/${encodeURIComponent(PIXEL_ID)}/events?${qs.toString()}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, meta: json }), { status: 502 });
    }
    return new Response(JSON.stringify({ ok: true, meta: json }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'unknown' }), { status: 500 });
  }
}
