// ================================
// File: app/success/page.jsx
// ================================
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import NavbarDark from '../components/Navbar/NavbarDark';
import { ArrowRight, CheckCircle2, Clock, Copy, Printer, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';

const money = (n = 0) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(n || 0));

// --- Meta helpers (why: single source of truth for dedup eventId) ---
const genEventId = () => `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
const getOrCreateEventId = (key = 'meta:purchaseEventId') => {
  if (typeof window === 'undefined') return genEventId();
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const id = genEventId();
  sessionStorage.setItem(key, id);
  return id;
};
const clearEventId = (key = 'meta:purchaseEventId') => {
  if (typeof window !== 'undefined') sessionStorage.removeItem(key);
};

export default function SuccessPage() {
  const estimatedTime = 35; // minutes
  const readyAtRef = useRef(Date.now() + estimatedTime * 60 * 1000);
  const totalSeconds = estimatedTime * 60;

  const [remaining, setRemaining] = useState(totalSeconds);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [summary, setSummary] = useState(null);

  const orderRef = useRef(
    `ORD-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`
  );

  // --- countdown ---
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const secs = Math.max(0, Math.round((readyAtRef.current - now) / 1000));
      setRemaining(secs);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // --- load order summary from sessionStorage ---
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('lastOrderSummary');
      if (raw) setSummary(JSON.parse(raw));
    } catch {}
  }, []);

  // --- Pixel + CAPI (fires once when summary is present) ---
  const firedRef = useRef(false);
  useEffect(() => {
    if (!summary || firedRef.current) return;
    firedRef.current = true;

    const eventId = getOrCreateEventId();
    const total = Number(summary.total || 0);
    const currency = 'NGN';
    const items =
      Array.isArray(summary.items) &&
      summary.items.map((it) => ({
        id: String(it.foodId ?? it.id ?? it.name ?? 'unknown'),
        quantity: Number(it.quantity ?? 1),
        item_price: Number(it.price ?? 0),
      }));

    // Browser Pixel (dedup with same eventId)
    try {
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'Purchase', { value: total, currency }, { eventID: eventId });
      }
    } catch {}

    // Server CAPI
    (async () => {
      try {
        await fetch('/api/facebook', {
          method: 'POST',
          credentials: 'include', // ensures _fbp cookie reaches server
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            event_name: 'Purchase',
            event_id: eventId, // dedup key
            value: total,
            currency,
            items,
            customer: {
              email: summary.email,
              phone: summary.phone,
              external_id: summary.userId || summary.customerId,
              first_name: summary.firstName,
              last_name: summary.lastName,
              city: summary.city,
              state: summary.state,
              zip: summary.zip,
              country: summary.country,
            },
            event_source_url:
              typeof window !== 'undefined' ? window.location.href : undefined,
            // Optionally pass a test code during validation runs:
            // test_event_code: process.env.NEXT_PUBLIC_FB_TEST_EVENT_CODE,
          }),
        });
        clearEventId(); // avoid reuse on next order
      } catch {
        // intentionally silent to not affect UX
      }
    })();
  }, [summary]);

  const progressPct = useMemo(
    () => Math.min(100, Math.max(0, ((totalSeconds - remaining) / totalSeconds) * 100)),
    [remaining, totalSeconds]
  );
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  const readyTimeLabel = useMemo(() => {
    const d = new Date(readyAtRef.current);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const handleCopyRef = async () => {
    try {
      await navigator.clipboard.writeText(orderRef.current);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async () => {
    const text = `Order ${orderRef.current} confirmed. ETA ~ ${mm}:${ss}.`;
    try {
      if (navigator.canShare && navigator.canShare({ text })) {
        await navigator.share({ title: 'Order Confirmed', text });
        setShared(true);
        setTimeout(() => setShared(false), 1500);
        return;
      }
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <NavbarDark />

      <div className="relative min-h-[100dvh] bg-slate-950 text-slate-100">
        <main className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 mt-10 py-10 sm:py-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mx-auto w-full rounded-2xl border border-white bg-slate-900 p-6 sm:p-8"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600/15">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-center">
              Order Successful!
            </h1>
            <p className="mt-2 text-slate-300 text-center">Thank you for your order. 🎉</p>

            {/* Order ref + actions */}
            <div className="mt-6 flex flex-col items-center justify-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white bg-black px-3 py-1.5 text-sm">
                <span className="opacity-80">Order ref:</span>
                <span className="font-mono">{orderRef.current}</span>
                <button
                  onClick={handleCopyRef}
                  className="inline-flex items-center gap-1 rounded-md border border-white bg-black px-2 py-1 text-xs hover:bg-slate-800"
                >
                  <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Clock className="h-4 w-4" /> Estimated ready{' '}
                <span className="font-medium text-slate-100">{readyTimeLabel}</span>
              </div>
            </div>

            {/* Breakdown */}
            {summary && (
              <div className="mt-8 rounded-xl border border-white/60">
                <div className="px-4 py-3 border-b border-white/60 text-sm flex items-center justify-between">
                  <span className="opacity-90">Delivery</span>
                  <span className="font-medium capitalize">
                    {summary.deliveryMethod || 'pickup'}
                  </span>
                </div>
                <div className="divide-y divide-white/50">
                  {summary.items?.map((it) => (
                    <div
                      key={`${it.foodId}-${it.name}`}
                      className="px-4 py-3 text-sm flex items-center justify-between"
                    >
                      <span className="opacity-90">
                        {it.name} × {it.quantity}
                      </span>
                      <span className="font-medium">
                        {money(it.price * it.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 text-sm flex items-center justify-between">
                  <span className="opacity-90">Delivery Fee</span>
                  <span className="font-medium">{money(summary.deliveryFee || 0)}</span>
                </div>
                <div className="px-4 py-3 text-sm flex items-center justify-between">
                  <span className="opacity-90">Packaging</span>
                  <span className="font-medium">{money(summary.packagingCost || 0)}</span>
                </div>
                <div className="px-4 py-3 text-sm flex items-center justify-between">
                  <span className="opacity-90">Tax</span>
                  <span className="font-medium">{money(summary.tax || 0)}</span>
                </div>
                <div className="px-4 py-3 border-t border-white/60 text-base flex items-center justify-between">
                  <span className="opacity-90">Total Paid</span>
                  <span className="font-semibold">{money(summary.total || 0)}</span>
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="mt-10 flex items-center justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700"
              >
                Shop Again <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Utility actions */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 rounded-md border border-white bg-black px-2.5 py-1.5 hover:bg-slate-800"
                title="Print receipt"
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1 rounded-md border border-white bg-black px-2.5 py-1.5 hover:bg-slate-800"
                title="Share order status"
              >
                <Share2 className="h-3.5 w-3.5" /> {shared ? 'Copied' : 'Share'}
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-400 text-center">
              Keep this page open to see your live countdown.
            </p>
          </motion.div>
        </main>
      </div>
    </>
  );
}
