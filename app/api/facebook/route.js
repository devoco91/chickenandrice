// ========================================
// File: app/api/facebook/route.js  (EMQ-boosted, add-only)
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

const APP_SECRET =
  process.env.META_APP_SECRET ||
  process.env.FB_APP_SECRET ||
  process.env.FACEBOOK_APP_SECRET ||
  ''; // optional but recommended

const FB_VERSION = process.env.META_GRAPH_VERSION || process.env.FB_API_VERSION || 'v21.0';
const TEST_EVENT_CODE = process.env.FB_TEST_EVENT_CODE || process.env.META_TEST_EVENT_CODE || '';

/* ---------- helpers ---------- */
const sha256 = (v) =>
  v && String(v).trim()
    ? crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex')
    : undefined;

const hmacAppSecretProof = (token, secret) =>
  token && secret ? crypto.createHmac('sha256', secret).update(token).digest('hex') : undefined;

/** Why: better phone match. Keeps “+“ optional; strips non-digits; converts NG 0-leading to 234. */
const normalizePhoneForHash = (phone, country = 'NG') => {
  if (!phone) return undefined;
  let s = String(phone).replace(/[^\d+]/g, '');
  if (s.startsWith('0')) {
    if ((country || '').toUpperCase() === 'NG') s = '234' + s.slice(1);
  }
  if (s.startsWith('+')) s = s.slice(1);
  return s || undefined;
};

const parseCookie = (header = '') =>
  header.split(';').reduce((acc, part) => {
    const [k, ...v] = part.trim().split('=');
    if (!k) return acc;
    acc[k] = decodeURIComponent(v.join(''));
    return acc;
  }, {});

function getClientIp(req) {
  const xff = req.headers.get('x-forwarded-for');
  if (!xff) return undefined;
  return String(xff).split(',')[0].trim() || undefined;
}

function getFbcFbp(req, explicit = {}) {
  const cookies = parseCookie(req.headers.get('cookie') || '');
  let fbp = explicit.fbp || cookies['_fbp'];
  let fbc = explicit.fbc || cookies['_fbc'];

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

/** Per Meta spec: arrays → em/ph/external_id; singles → fn/ln/ct/st/zp/country. */
function buildUserData(req, customer = {}, bodyFbpFbc = {}) {
  const ip = getClientIp(req);
  const ua = req.headers.get('user-agent') || undefined;
  const { fbp, fbc } = getFbcFbp(req, bodyFbpFbc);

  const out = {
    client_ip_address: ip,
    client_user_agent: ua,
    ...(fbc ? { fbc } : {}),
    ...(fbp ? { fbp } : {}),
  };

  // Arrays
  const em = sha256(customer.email);
  if (em) out.em = [em];

  const phNorm = normalizePhoneForHash(customer.phone, customer.country || 'NG');
  const ph = sha256(phNorm);
  if (ph) out.ph = [ph];

  const xid = sha256(customer.external_id);
  if (xid) out.external_id = [xid];

  // Singles
  const fn = sha256(customer.first_name);
  if (fn) out.fn = fn;

  const ln = sha256(customer.last_name);
  if (ln) out.ln = ln;

  const ct = sha256(customer.city);
  if (ct) out.ct = ct;

  const st = sha256(customer.state);
  if (st) out.st = st;

  const zp = sha256(customer.zip);
  if (zp) out.zp = zp;

  const co = sha256(customer.country || 'NG');
  if (co) out.country = co;

  return out;
}

const safeEventTime = (tSec) => {
  const now = Math.floor(Date.now() / 1000);
  const n = Number(tSec);
  if (!Number.isFinite(n)) return now;
  const sevenDays = 7 * 24 * 60 * 60;
  if (n > now + 300) return now;       // future (>5m) → clamp
  if (n < now - sevenDays) return now; // too old → clamp
  return Math.floor(n);
};

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
      event_id,                  // dedupe (optional, recommended)
      event_time,                // optional; will be guarded
      test_event_code,
      fbp,
      fbc,
      items = [],                // [{ id|sku|name, quantity, item_price|price }]
      order_id,
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
          event_time: safeEventTime(event_time),
          action_source: 'website',
          event_source_url: sourceUrl,
          event_id: event_id || undefined, // do not force
          user_data,
          custom_data: {
            currency: String(currency || 'NGN').toUpperCase(),
            value: Number(value) || 0,
            contents,
            content_ids,
            content_type: contents.length ? 'product' : undefined,
            num_items: num_items || undefined,
            order_id: order_id || undefined,
          },
        },
      ],
      partner_agent: 'capi-enhanced/1.3',
    };

    // Query params: token + optional appsecret_proof + test code
    const qs = new URLSearchParams({ access_token: ACCESS_TOKEN });
    const proof = hmacAppSecretProof(ACCESS_TOKEN, APP_SECRET);
    if (proof) qs.set('appsecret_proof', proof);
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
