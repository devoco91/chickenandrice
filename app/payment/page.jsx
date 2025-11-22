// ============================================================================
// File: app/payment/page.jsx
// ============================================================================
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { clearCart } from '../store/cartSlice';
import { clearOrderDetails } from '../store/orderSlice';
import NavbarDark from '../components/Navbar/NavbarDark';
import {
  Banknote, Check, ClipboardCopy, Clock, Info, Loader2, Lock, Printer, ShieldCheck,
  Smartphone, Wallet, Sparkles, Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-toastify';

/* ======= Constants ======= */
const ACCOUNT_NUMBER = '8986626630';
const ACCOUNT_NAME = 'ChickenAndRice Ltd';
const BANK_NAME = 'Palmpay';
const WHATSAPP_E164 = '2349040002074';
const LS_KEY = 'paypage_v1';
const SHARE_TTL_MS = 2 * 60 * 60 * 1000;

/* === META (Pixel + CAPI) === */
const PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || '811877775096101';
const fbInitOnce = { done: false };

/* Cookie helpers for fbp/fbc */
function _readCookie(name) {
  if (typeof document === 'undefined') return '';
  const safeName = name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1');
  const m = document.cookie.match(new RegExp('(?:^|; )' + safeName + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
}
function _getFbpFbc() {
  const fbp = _readCookie('_fbp') || '';
  let fbc = _readCookie('_fbc') || '';
  try {
    const url = new URL(window.location.href);
    const fbclid = url.searchParams.get('fbclid');
    if (fbclid && !fbc) {
      const ts = Math.floor(Date.now() / 1000);
      fbc = `fb.1.${ts}.${fbclid}`;
      document.cookie = `_fbc=${encodeURIComponent(fbc)}; path=/; max-age=${60 * 60 * 24 * 90}`;
    }
  } catch {}
  return { fbp, fbc };
}

/* ---- Event ID for dedup ---- */
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

/* ======= Utils ======= */
const formatNGN = (n = 0) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(Number(n || 0));

/* Name splitter for Pixel AM */
function splitName(full = '') {
  const parts = String(full).trim().split(/\s+/);
  return { fn: parts[0] || '', ln: parts.slice(1).join(' ') || '' };
}

export default function PaymentPage() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [isPaying, setIsPaying] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const [tab, setTab] = useState('transfer');

  const cartItems = useSelector((s) => s.cart.cartItem || []);
  const order = useSelector((s) => s.order || {});
  const total = Number(order.total || 0);

  // Receipt/OCR state
  const [proof, setProof] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [receiptText, setReceiptText] = useState('');

  // Amount & name checks
  const [receiptAmountOK, setReceiptAmountOK] = useState(false);
  const [detectedAmount, setDetectedAmount] = useState(null);
  const [amountSnippet, setAmountSnippet] = useState('');
  const [accountNameOK, setAccountNameOK] = useState(false);
  const [accountNameSnippet, setAccountNameSnippet] = useState('');

  // WhatsApp flow (optional)
  const [shareStartedAt, setShareStartedAt] = useState(null);
  const [shareConfirmed, setShareConfirmed] = useState(false);

  useEffect(() => setIsMounted(true), []);

  const paymentRef = useRef(
    `REF-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`
  );

  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!isPaying) return;
    setProgress(0);
    const id = setInterval(() => setProgress((p) => Math.min(100, p + 8)), 120);
    return () => clearInterval(id);
  }, [isPaying]);

  // Persist WhatsApp
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) || {};
      setShareStartedAt(s.shareStartedAt ?? null);
      setShareConfirmed(Boolean(s.shareConfirmed));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const prev = raw ? JSON.parse(raw) : {};
      localStorage.setItem(LS_KEY, JSON.stringify({ ...prev, shareStartedAt, shareConfirmed }));
    } catch {}
  }, [shareStartedAt, shareConfirmed]);

  const totalLabel = formatNGN(total);
  const normalizedAmount = useMemo(() => Math.floor(Math.abs(Number(total || 0))), [total]);

  /* ======= Copy helpers ======= */
  const handleCopy = async (key, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1300);
    } catch {
      toast.error('Copy failed');
    }
  };
  const copyAllDetails = async () => {
    const text = [
      `Amount: ${totalLabel}`,
      `Account Number: ${ACCOUNT_NUMBER}`,
      `Bank: ${BANK_NAME}`,
      `Account Name: ${ACCOUNT_NAME}`,
      `Reference: ${paymentRef.current}`,
    ].join('\n');
    await handleCopy('all', text);
  };

  /* ======= File handling & OCR ======= */
  const revokePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(''); };

  const handleProofChange = async (e) => {
    const f = e.target.files?.[0] ?? null;
    setProof(f);
    setReceiptText('');
    setReceiptAmountOK(false);
    setDetectedAmount(null);
    setAmountSnippet('');
    setAccountNameOK(false);
    setAccountNameSnippet('');
    revokePreview();
    if (!f) return;

    const url = URL.createObjectURL(f);
    setPreviewUrl(url);

    setParsing(true);
    try {
      const { text: raw } = await extractTextFromFileFast(f);
      const text = preprocessReceiptText(raw);
      setReceiptText(text || '');
    } catch {
      toast.error('Could not read receipt text. Try a clearer file.');
    } finally {
      setParsing(false);
    }
  };

  // Re-run verification on changes
  useEffect(() => {
    if (!receiptText || !normalizedAmount) {
      setReceiptAmountOK(false); setDetectedAmount(null); setAmountSnippet('');
      setAccountNameOK(false); setAccountNameSnippet(''); return;
    }
    const amt = detectReceiptAmount(receiptText, normalizedAmount);
    setReceiptAmountOK(amt.ok); setDetectedAmount(amt.bestAmount); setAmountSnippet(amt.snippet || '');
    const nameRes = verifyAccountNameStrict(receiptText);
    setAccountNameOK(nameRes.ok); setAccountNameSnippet(nameRes.snippet || '');
  }, [receiptText, normalizedAmount]);

  const rerunVerification = async () => {
    if (!proof) return toast.error('Upload payment receipt first.');
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 50));
    const amt = detectReceiptAmount(receiptText, normalizedAmount);
    setReceiptAmountOK(amt.ok); setDetectedAmount(amt.bestAmount); setAmountSnippet(amt.snippet || '');
    const nameRes = verifyAccountNameStrict(receiptText);
    setAccountNameOK(nameRes.ok); setAccountNameSnippet(nameRes.snippet || '');
    setVerifying(false);
    toast[amt.ok && nameRes.ok ? 'success' : 'error'](
      amt.ok && nameRes.ok ? 'Verified against receipt.' : 'Verification failed: amount and/or account name.'
    );
  };

  /* ======= WhatsApp (optional) ======= */
  const isShareRecent = (ts) => !!ts && Date.now() - ts < SHARE_TTL_MS;
  const shareToWhatsApp = async () => {
    if (!proof) return toast.error('Select a receipt file first.');
    const text = `Hello, please find my proof of payment for my order (${totalLabel}).\nRef: ${paymentRef.current}`;
    const encoded = encodeURIComponent(text);
    const now = Date.now();
    setShareStartedAt(now); setShareConfirmed(false);
    try {
      const raw = localStorage.getItem(LS_KEY);
      const s = raw ? JSON.parse(raw) : {};
      localStorage.setItem(LS_KEY, JSON.stringify({ ...s, shareStartedAt: now, shareConfirmed: false }));
    } catch {}
    try {
      if (navigator.canShare && navigator.canShare({ files: [proof] })) {
        await navigator.share({ files: [proof], text, title: 'Proof of Payment' });
        toast.success('Share dialog opened. Please send on WhatsApp.');
        return;
      }
    } catch {}
    window.location.href = `https://wa.me/${WHATSAPP_E164}?text=${encoded}`;
  };

  async function submitOrderToBackend() {
    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

    const payload = {
      items: cartItems.map((item) => ({ foodId: item._id, quantity: item.quantity, name: item.name, price: item.price, isDrink: !!item.isDrink })),
      deliveryMethod: order.deliveryMethod || 'pickup',
      customerName: order.customerName || '',
      phone: order.phone || '',
      houseNumber: order.houseNumber || '',
      street: order.street || '',
      landmark: order.landmark || '',
      specialNotes: order.specialNotes || '',
      location: order.location || { type: 'Point', coordinates: [3.3792057, 6.5243793] },
      deliveryDistanceKm: order.deliveryDistanceKm || 0,
      subtotal: Number(order.subtotal || 0),
      packagingCost: Number(order.packagingCost || 0),
      packagingCount: Number(order.packagingCount || 0),
      deliveryFee: Number(order.deliveryFee || 0),
      tax: Number(order.tax || 0),
      total: Number(order.total || 0),
      paymentReference: paymentRef.current,
      paymentMethod: tab,
    };

    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || `Failed to submit order (status ${res.status}).`);

    try {
      const summary = {
        id: data._id || data.id || null,
        items: payload.items,
        deliveryMethod: payload.deliveryMethod,
        deliveryFee: payload.deliveryFee,
        packagingCost: payload.packagingCost,
        tax: payload.tax,
        total: payload.total,
        customerName: payload.customerName,
        phone: payload.phone,
        address: [payload.houseNumber, payload.street].filter(Boolean).join(', ') || null,
        email: order.email || order.customerEmail || '',
        firstName: order.firstName || '',
        lastName: order.lastName || '',
        city: order.city || '',
        state: order.state || '',
        zip: order.zip || '',
        country: order.country || '',
      };
      sessionStorage.setItem('lastOrderSummary', JSON.stringify(summary));
    } catch {}
    return data;
  }

  const handlePay = async () => {
    if (isPaying) return;
    if (!proof) return toast.error('Upload payment receipt to continue.');
    if (!receiptAmountOK) return toast.error('Receipt amount is less than the order total.');
    if (!accountNameOK) return toast.error('Receipt account name must include “chicken”, “chickenandrice”, “chicken and rice”, or “chickenandrice ltd/limited”.');

    setIsPaying(true);
    try {
      await submitOrderToBackend();

      /* ===== META Pixel + CAPI (dedup + AM) ===== */
      try {
        // Init once
        if (typeof window !== 'undefined' && window.fbq && !fbInitOnce.done) {
          const email =
            order.email ||
            order.customerEmail ||
            (order.user && (order.user.email || order.userEmail)) ||
            '';
          const phone = order.phone || '';
          const { fn, ln } = splitName(order.customerName || '');
          window.fbq('init', PIXEL_ID, {
            em: email || undefined,
            ph: phone || undefined,
            fn: fn || undefined,
            ln: ln || undefined,
          });
          fbInitOnce.done = true; // prevent re-init
        }

        // Stable per-payment eventId derived from the payment reference
        const storageKey = `meta:purchaseEventId:${paymentRef.current}`;
        const eventId = getOrCreateEventId(storageKey);

        if (typeof window !== 'undefined' && window.fbq) {
          window.fbq(
            'trackSingle',
            PIXEL_ID,
            'Purchase',
            { value: Number(total || 0), currency: 'NGN' },
            { eventID: eventId }
          );
        }

        const { fbp, fbc } = _getFbpFbc();
        const items = cartItems.map((i) => ({
          id: String(i._id ?? i.sku ?? i.name ?? 'unknown'),
          quantity: Number(i.quantity ?? 1),
          item_price: Number(i.price ?? 0),
        }));
        const customer = {
          email:
            order.email ||
            order.customerEmail ||
            (order.user && (order.user.email || order.userEmail)) ||
            '',
          phone: order.phone || '',
          external_id: order.userId || order.customerId || '',
          first_name: splitName(order.customerName || '').fn,
          last_name: splitName(order.customerName || '').ln,
          city: order.city || '',
          state: order.state || '',
          zip: order.zip || '',
          country: order.country || '',
        };

        await fetch('/api/facebook', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_name: 'Purchase',
            event_id: eventId,
            event_time: Math.floor(Date.now() / 1000),
            value: Number(total || 0),
            currency: 'NGN',
            items,
            customer,
            event_source_url: typeof window !== 'undefined' ? window.location.href : '',
            fbp, fbc,
          }),
        }).catch(() => {});
        clearEventId(storageKey);
      } catch (err) {
        console.error('⚠️ Facebook tracking failed:', err);
      }
      /* ===== END META ===== */

      dispatch(clearCart()); dispatch(clearOrderDetails());
      toast.success('Order sent!', {
        autoClose: 1400,
        onClose: () => { dispatch(clearCart()); dispatch(clearOrderDetails()); router.push('/success'); },
      });
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Payment failed. Please try again.');
      setIsPaying(false);
    }
  };

  if (!isMounted) return null;

  return (
    <>
      <NavbarDark />
      <div className="relative min-h-[100dvh] text-slate-100 bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 py-10 sm:py-16 relative">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white px-2.5 py-1 text-xs text-white">
                <Sparkles className="h-3.5 w-3.5" /> Premium Checkout
              </div>
              <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-white">Payment</h1>
              <p className="mt-1 text-sm text-slate-300">Complete your order securely in a few seconds.</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded-full border border-white px-2.5 py-1 text-sm">
                <Lock className="h-4 w-4" /> Secure
              </span>
              <div className="mt-2 text-xs text-slate-300">Due now</div>
              <div className="text-2xl font-semibold">{formatNGN(total)}</div>
            </div>
          </div>

          {/* Stepper */}
          <div className="mb-4 flex items-center gap-2 text-xs text-white">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-black font-bold">1</span>
              <span>Cart</span>
            </div>
            <span className="h-[1px] flex-1 bg-white" />
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-black font-bold">2</span>
              <span>Payment</span>
            </div>
            <span className="h-[1px] flex-1 bg-white" />
            <div className="flex items-center gap-2 opacity-60">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white text-white">3</span>
              <span>Done</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="grid w-full grid-cols-2 rounded-xl border border-white p-1">
            <button onClick={() => setTab('transfer')} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition ${tab === 'transfer' ? 'bg-white text-black' : 'hover:bg-slate-800'}`}>
              <Banknote className="h-4 w-4" /> Bank Transfer
            </button>
            <button disabled title="Card payments will be available shortly." className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm opacity-60 cursor-not-allowed">
              <Wallet className="h-4 w-4" /> Card (coming soon)
            </button>
          </div>

          {/* Order Summary */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="mt-6 rounded-2xl border border-white bg-slate-900">
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">Order Summary</h2>
                  <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-white bg-black px-3 py-2 text-sm hover:bg-slate-800 active:scale-95">
                    <Printer className="h-4 w-4" /> Print Invoice
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm"><span className="text-slate-300">Items Subtotal</span><span>{formatNGN(order.subtotal || 0)}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-slate-300">Delivery Fee</span><span>{formatNGN(order.deliveryFee || 0)}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-slate-300">Tax (2%)</span><span>{formatNGN(order.tax || 0)}</span></div>
                  <hr className="my-3 border-white" />
                  <div className="flex items-center justify-between"><span className="text-slate-300">Total Due</span><span className="text-2xl font-semibold">{formatNGN(total)}</span></div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bank Transfer Content */}
          {tab === 'transfer' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <div className="mt-6 overflow-hidden rounded-2xl border border-white bg-slate-900">
                <div className="p-5 sm:p-6 space-y-1">
                  <h3 className="flex items-center gap-2 text-base font-medium">
                    <Smartphone className="h-5 w-5" /> Transfer with your banking app
                  </h3>
                  <p className="text-sm text-slate-300">Use the details below. Include the reference in your narration/description.</p>
                </div>

                <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-2 sm:p-6">
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-white bg-slate-900 p-6">
                    <QRCodeSVG
                      value={`banktransfer://pay?acc=${ACCOUNT_NUMBER}&bank=${encodeURIComponent(BANK_NAME)}&name=${encodeURIComponent(ACCOUNT_NAME)}&amt=${Number(total || 0)}&ref=${paymentRef.current}`}
                      size={176}
                      bgColor="transparent"
                    />
                    <p className="mt-3 text-xs text-center text-slate-300">Scan with your bank app (where supported)</p>

                    <div className="mt-4 w-full">
                      <label htmlFor="ref" className="text-sm text-slate-200">Payment Reference</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input id="ref" value={paymentRef.current} readOnly className="w-full rounded-lg border border-white bg-black px-3 py-2 text-slate-100 outline-none" />
                        <button type="button" onClick={() => handleCopy('ref', paymentRef.current)} className="inline-flex items-center gap-2 rounded-lg border border-white bg-black px-3 py-2 text-sm hover:bg-slate-800 active:scale-95">
                          {copiedKey === 'ref' ? (<><Check className="h-4 w-4" /> Copied</>) : (<><ClipboardCopy className="h-4 w-4" /> Copy</>)}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="account" className="text-sm text-slate-200">Account Number</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input id="account" value={ACCOUNT_NUMBER} readOnly className="w-full rounded-lg border border-white bg-black px-3 py-2 text-slate-100 tracking-wider outline-none" />
                        <button type="button" onClick={() => handleCopy('account', ACCOUNT_NUMBER)} className="inline-flex items-center gap-2 rounded-lg border border-white bg-black px-3 py-2 text-sm hover:bg-slate-800 active:scale-95">
                          {copiedKey === 'account' ? (<><Check className="h-4 w-4" /> Copied</>) : (<><ClipboardCopy className="h-4 w-4" /> Copy</>)}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="bank" className="text-sm text-slate-200">Bank Name</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input id="bank" value={BANK_NAME} readOnly className="w-full rounded-lg border border-white bg-black px-3 py-2 text-slate-100 outline-none" />
                        <button type="button" onClick={() => handleCopy('bank', BANK_NAME)} className="inline-flex items-center gap-2 rounded-lg border border-white bg-black px-3 py-2 text-sm hover:bg-slate-800 active:scale-95">
                          {copiedKey === 'bank' ? (<><Check className="h-4 w-4" /> Copied</>) : (<><ClipboardCopy className="h-4 w-4" /> Copy</>)}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="name" className="text-sm text-slate-200">Account Name</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input id="name" value={ACCOUNT_NAME} readOnly className="w-full rounded-lg border border-white bg-black px-3 py-2 text-slate-100 outline-none" />
                        <button type="button" onClick={() => handleCopy('name', ACCOUNT_NAME)} className="inline-flex items-center gap-2 rounded-lg border border-white bg-black px-3 py-2 text-sm hover:bg-slate-800 active:scale-95">
                          {copiedKey === 'name' ? (<><Check className="h-4 w-4" /> Copied</>) : (<><ClipboardCopy className="h-4 w-4" /> Copy</>)}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="amount" className="text-sm text-slate-200">Amount</label>
                      <input id="amount" value={formatNGN(total)} readOnly className="mt-1 w-full rounded-lg border border-white bg-black px-3 py-2 text-slate-100 outline-none" />
                    </div>

                    <div className="pt-2">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={copyAllDetails} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white bg-black px-3 py-2 text-xs hover:bg-slate-800 active:scale-95" title="Copy all details">
                          <ClipboardCopy className="h-4 w-4" /> Copy All
                        </button>
                        <div className="inline-flex items-center gap-2 text-xs text-slate-300">
                          <ShieldCheck className="h-4 w-4" /> Bank-grade security
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ===== Upload + Preview + Verify + WhatsApp ===== */}
                <div className="space-y-4 p-5 sm:p-6">
                  <div className="grid gap-2">
                    <label className="text-sm text-slate-200">Upload proof of payment:</label>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-2 rounded-lg border border-white bg-black px-3 py-2 text-sm hover:bg-slate-800 cursor-pointer">
                        <Upload className="h-4 w-4" />
                        <span>Select file</span>
                        <input
                          type="file"
                          accept="application/pdf,application/x-pdf,application/acrobat,application/vnd.pdf,text/pdf,image/pdf,image/*"
                          onChange={handleProofChange}
                          className="hidden"
                        />
                      </label>
                      {proof && <span className="text-xs text-slate-300 truncate">{proof.name}</span>}
                    </div>

                    {/* Preview */}
                    {previewUrl && (
                      <div className="mt-2 border border-white/50 rounded-lg p-2 bg-black">
                        {isLikelyPdfPreview(proof) ? (
                          <embed src={previewUrl} type="application/pdf" className="w-full h-64 rounded" />
                        ) : (
                          <img src={previewUrl} alt="Receipt preview" className="w-full max-h-64 object-contain rounded" />
                        )}
                      </div>
                    )}

                    {/* Parsing + verification status (hidden while overlay active) */}
                    <div className="text-xs">
                      {!parsing && !verifying && (proof || receiptText) && (
                        <>
                          <div className="mt-1">
                            {receiptAmountOK ? (
                              <div className="text-emerald-400">
                                ✓ Receipt amount {formatNGN(detectedAmount ?? 0)} meets requirement (≥ {formatNGN(normalizedAmount)}).
                                {amountSnippet && (
                                  <div className="mt-1">
                                    <div className="text-slate-400">Matched snippet:</div>
                                    <pre className="mt-0.5 bg-slate-950/60 border border-white/20 rounded px-2 py-1 text-[11px] whitespace-pre-wrap break-words">
{amountSnippet}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-rose-300">
                                {detectedAmount == null
                                  ? 'Could not detect an amount on the receipt.'
                                  : `Receipt amount ${formatNGN(detectedAmount)} is less than the order total ${formatNGN(normalizedAmount)}.`}
                              </span>
                            )}
                          </div>

                          <div className="mt-2">
                            {accountNameOK ? (
                              <span className="text-emerald-400">✓ Account name contains “chicken”, “chickenandrice”, “chicken and rice”, or “chickenandrice ltd/limited”.</span>
                            ) : (
                              <span className="text-rose-300">Account name not confirmed. Receipt must include “chicken”, “chickenandrice”, “chicken and rice”, or “chickenandrice ltd/limited”.</span>
                            )}
                            {accountNameSnippet && (
                              <div className="mt-1">
                                <div className="text-slate-400">Name snippet:</div>
                                <pre className="mt-0.5 bg-slate-950/60 border border-white/20 rounded px-2 py-1 text-[11px] whitespace-pre-wrap break-words">
{accountNameSnippet}
                                </pre>
                              </div>
                            )}
                          </div>

                          <div className="mt-2">
                            <button type="button" onClick={rerunVerification} className="h-9 px-3 rounded-lg border border-white bg-black text-sm hover:bg-slate-800" title="Re-run verification">
                              Re-run verification
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* WhatsApp flow (optional) */}
                    <button type="button" className="mt-2 h-10 w-full rounded-lg border border-white bg-black text-sm hover:bg-slate-800" onClick={shareToWhatsApp} aria-label="Send to WhatsApp" title="Send to WhatsApp">
                      Send to WhatsApp (+{WHATSAPP_E164})
                    </button>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-amber-500 bg-amber-900/30 p-3 text-amber-100">
                    <Info className="mt-0.5 h-4 w-4" />
                    <div>
                      <p className="font-medium">Don’t forget the reference</p>
                      <p className="text-sm">
                        Please include <span className="font-semibold">{paymentRef.current}</span> in the transfer narration/description so we can match your payment instantly.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
                    <button onClick={handlePay} disabled={isPaying} className={`flex-1 inline-flex items-center justify-center rounded-lg px-4 py-2 text-white transition ${isPaying ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}>
                      {isPaying ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>) : (<>Complete Order</>)}
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-slate-300">
                    <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Payments protected with bank-grade security</div>
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> Typical confirmation &lt; 1 min</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div className="mt-6 text-sm text-slate-300 flex items-center gap-2">
            <Info className="h-4 w-4" /> Need help? Contact support from your account portal.
          </div>
        </div>

        {/* Copied toast */}
        <AnimatePresence>
          {copiedKey && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-full border border-white bg-black px-4 py-2 text-xs text-white">
              Copied to clipboard
            </motion.div>
          )}
        </AnimatePresence>

        {/* NEW: Full-screen verifying overlay for parsing or verifying */}
        <AnimatePresence>
          {(parsing || verifying) && (
            <motion.div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 14, opacity: 0 }}
                className="w-[92%] max-w-md rounded-2xl border border-white bg-slate-900 p-6 text-center shadow-2xl"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
                <h3 className="text-xl font-semibold">Verifying payment…</h3>
                <p className="mt-1 text-sm text-slate-300">
                  {parsing ? 'Reading receipt and extracting details.' : 'Checking amount and account name on your receipt.'}
                </p>
                <div className="mt-5 text-[11px] text-slate-400">
                  Do not close this window.
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Blocking overlay while paying (unchanged) */}
        <AnimatePresence>
          {isPaying && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }} className="w-[90%] max-w-md rounded-2xl border border-white bg-slate-900 p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold">Finalizing your order…</h3>
                <p className="mt-1 text-sm text-slate-300">Please hold while we verify and finalize your order.</p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-700">
                  <div className="h-full" style={{ width: `${progress}%`, transition: 'width 120ms linear', background: 'linear-gradient(90deg, #2563eb, #4f46e5)' }} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/* ================= Helpers ================= */

function preprocessReceiptText(input) {
  let s = String(input || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069]/g, '')
    .replace(/[\u00A0\u2007\u2009\u202F]/g, ' ')
    .replace(/\bN\s*G\s*N\b/gi, 'NGN')
    .replace(/₦\s*/g, '₦')
    .replace(/\s+[|]\s+/g, ' | ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();

  s = s.replace(/([A-Za-z]:)\s+(?=[A-Za-z])/g, '$1 ')
       .replace(/(\r?\n)\s+/g, '$1');

  s = s.replace(/\b([A-Za-z])(?:\s+([A-Za-z]))+\b/g, (m) => m.replace(/\s+/g, ''))
       .replace(/\b(\d)(?:\s+(\d))+(\s*\.\s*\d{2})?\b/g, (m) => m.replace(/\s+/g, ''));

  preprocessReceiptText._lettersOnly = s.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b(limited|ltd|plc|llc)\b/g, '')
    .replace(/[^a-z]/g, '');

  preprocessReceiptText._lines = splitLinesWithIndex(s);

  return s;
}

/* === SHARPER AMOUNT DETECTION === */
function detectReceiptAmount(text, orderAmount) {
  const src = String(text || '');
  const hay = src.toLowerCase();

  const posLabels = [
    'total amount','total','amount','amount due','amount paid','amount sent','paid','debit','credit',
    'transfer amount','txn amount','transaction amount','subtotal','payment amount','amt','ngn','₦',
    'cash received','you paid','customer paid','grand total','payment successful','successful payment'
  ];
  const negLabels = [
    'transaction no','transaction number','transaction id','trx id','rrn','stan','reference','ref',
    'wallet','date','time','account number','recipient details','balance','session id','auth code',
    'terminal','pos','card','pan','masked','acct','account','acct no','account no','authorization'
  ];

  const lines = preprocessReceiptText._lines?.length ? preprocessReceiptText._lines : splitLinesWithIndex(src);

  const posLineIdx = new Set();
  const negLineIdx = new Set();
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i].lower;
    for (const p of posLabels) if (L.includes(p)) { posLineIdx.add(i); break; }
    for (const n of negLabels) if (L.includes(n)) { negLineIdx.add(i); break; }
  }

  const WINDOW = 140;
  const posWins = buildLabelWindows(hay, posLabels, WINDOW);
  const negWins = buildLabelWindows(hay, negLabels, WINDOW);

  const tokens = collectMoneyCandidatesWithIndex(src, lines);

  const o = Math.max(1, Math.floor(Math.abs(Number(orderAmount || 0))));
  const candidates = [];
  const seen = new Set();

  for (const { tok, idx, lineIndex } of tokens) {
    const n = parseMoneyTokenToNaira(tok);
    if (n == null) continue;

    const whole = Math.floor(Math.abs(n));
    const key = `${tok}@${idx}:${whole}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const hasCur = /[₦]|NGN/i.test(tok) || /\bk\b/i.test(tok);
    const digitsLen = tok.replace(/[^\d]/g, '').length;
    const hasDecimals = /[.,]\d{2}\b/.test(tok);

    let score = 0;

    if (hasCur) score += 10;
    if (hasDecimals) score += 3;

    if (inAnyWindow(idx, posWins)) score += 7;
    if (inAnyWindow(idx, negWins)) score -= 10;

    if (posLineIdx.has(lineIndex)) score += 12;
    if (posLineIdx.has(lineIndex - 1) || posLineIdx.has(lineIndex + 1)) score += 5;

    if (negLineIdx.has(lineIndex)) score -= 12;
    if (negLineIdx.has(lineIndex - 1) || negLineIdx.has(lineIndex + 1)) score -= 6;

    const L = lines[lineIndex]?.lower || '';
    if (/\b(rrn|stan|ref|reference|account|acct|terminal|pos|auth|session|card|pan)\b/.test(L)) score -= 16;

    if (!hasCur && digitsLen >= 9) score -= 12;
    if (!hasCur && digitsLen >= 10) score -= 18;
    if (digitsLen >= 12) score -= 12;

    if (whole >= o) {
      score += 4;
      const diff = Math.abs(whole - o);
      if (diff <= Math.max(200, Math.floor(o * 0.02))) score += 4;
    } else {
      if (whole < o * 0.5) score -= 3;
    }

    if (!hasCur && whole > Math.max(o * 6, 3_000_000)) score -= 10;

    candidates.push({ val: whole, tok, idx, score, lineIndex });
  }

  if (!candidates.length) return { ok: false, bestAmount: null, snippet: '' };

  candidates.sort((a, b) => {
    const s = b.score - a.score;
    if (s) return s;
    const aBad = a.val < o, bBad = b.val < o;
    if (aBad !== bBad) return aBad - bBad;
    return Math.abs(a.val - o) - Math.abs(b.val - o);
  });

  const top = candidates[0];
  const ok = !!top && top.val >= o;
  return { ok, bestAmount: top ? top.val : null, snippet: top ? top.tok : '' };
}

/* === STRICT WHITELISTED NAME CHECK === */
function verifyAccountNameStrict(text) {
  const raw = String(text || '');
  const normalized = raw.normalize('NFKC').replace(/&/g, 'and');

  const patterns = [
    /\bchickenandrice\s*(ltd|limited)\b/i,
    /\bchicken\s*and\s*rice\s*(ltd|limited)\b/i,
    /\bchickenandrice\b/i,
    /\bchicken\s*and\s*rice\b/i,
    /\bchicken\b/i,
  ];

  if (/\bprice\b/i.test(normalized)) {
    for (const rx of patterns) {
      const m = normalized.match(rx);
      if (m) return { ok: true, snippet: m[0] };
    }
    return { ok: false, snippet: '' };
  }

  for (const rx of patterns) {
    const m = normalized.match(rx);
    if (m) return { ok: true, snippet: m[0] };
  }
  return { ok: false, snippet: '' };
}

/* ===== Money parsing helpers ===== */

function collectMoneyCandidatesWithIndex(s, lines = null) {
  const out = [];
  const Usp = '\u00A0\u2007\u2009\u202F';
  const src = String(s || '');

  const patterns = [
    new RegExp(`(?:₦|NGN|N)[${Usp}\\s]*[\\d${Usp}\\s.,]+(?:[.,]\\d{1,2})?`, 'gi'),
    new RegExp(`\\b\\d{1,3}(?:[${Usp}\\s.,]\\d{3})+(?:[.,]\\d{2})?\\b`, 'g'),
    /\b\d{4,}(?:[.,]\d{2})\b/g,
    /\b\d{5,}\b/g,
    /\b\d{1,3}(?:[.,]\d{1,2})?\s*[kK]\b/g,
  ];

  for (const pat of patterns) {
    for (const m of src.matchAll(pat)) {
      const tok = m[0];
      const idx = m.index ?? -1;
      const li = lineIndexFromGlobalPos(idx, lines || splitLinesWithIndex(src));
      out.push({ tok, idx, lineIndex: li });
    }
  }
  return out;
}

function buildLabelWindows(hay, labels, win) {
  const wins = [];
  for (const label of labels) {
    let i = 0;
    const needle = String(label).toLowerCase();
    while ((i = hay.indexOf(needle, i)) !== -1) {
      const start = Math.max(0, i - win);
      const end = Math.min(hay.length, i + needle.length + win);
      wins.push([start, end]);
      i += needle.length;
    }
  }
  return wins;
}
function inAnyWindow(idx, wins) {
  for (const [s, e] of wins) if (idx >= s && idx <= e) return true;
  return false;
}

function parseMoneyTokenToNaira(tok) {
  if (!tok) return null;
  let s = String(tok);

  const hasK = /k$/i.test(s.replace(/\s+/g, ''));

  s = s
    .replace(/[\u00A0\u2007\u2009\u202F]/g, ' ')
    .replace(/[Oo]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
    .replace(/Z/g, '2');

  s = s
    .replace(/\s+/g, '')
    .replace(/₦/g, '')
    .replace(/N\s*G\s*N/gi, 'NGN')
    .replace(/NGN/gi, '')
    .replace(/\bN\b/gi, '');

  let multiplier = 1;
  if (hasK) { s = s.replace(/k$/i, ''); multiplier = 1000; }

  const hasComma = s.includes(','), hasDot = s.includes('.');
  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
    const decSep = lastDot > lastComma ? '.' : ',';
    s = s.replace(decSep === '.' ? /,/g : /\./g, '');
    if (decSep === ',') s = s.replace(',', '.');
  } else s = s.replace(/,/g, '');

  const n = Number.parseFloat(s.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n * multiplier : null;
}

function splitLinesWithIndex(s) {
  const text = String(s || '');
  const rawLines = text.split(/\r?\n/);
  const lines = [];
  let pos = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const t = rawLines[i];
    const start = pos;
    const end = start + t.length;
    lines.push({ start, end, text: t, lower: t.toLowerCase() });
    pos = end + 1;
  }

  if (lines.length <= 1) {
    const chunks = text.split(/(?: {2,}|\s\|\s|—|-{2,}|:{1}\s)/);
    const alt = [];
    let p = 0;
    for (const ch of chunks) {
      const idx = text.indexOf(ch, p);
      if (idx === -1) continue;
      alt.push({ start: idx, end: idx + ch.length, text: ch, lower: ch.toLowerCase() });
      p = idx + ch.length;
    }
    return alt.length ? alt : lines;
  }

  return lines;
}

function lineIndexFromGlobalPos(idx, lines) {
  if (!Array.isArray(lines) || lines.length === 0) return 0;
  for (let i = 0; i < lines.length; i++) {
    const { start, end } = lines[i];
    if (idx >= start && idx < end + 1) return i;
  }
  return lines.length - 1;
}

/* ---------- PDF & Image OCR (optimized) ---------- */

async function extractTextFromFileFast(file) {
  if (typeof window === 'undefined') return { text: '', method: 'ssr' };

  const deadlineMs = 12000;
  const start = Date.now();
  const timeLeft = () => Math.max(0, deadlineMs - (Date.now() - start));

  try {
    const isPdf = await isProbablyPdf(file);

    if (isPdf) {
      const { pdfjsLib } = await loadPdfJs();
      if (!pdfjsLib) return { text: '', method: 'pdf-ocr' };

      try {
        const data = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data, disableCombineTextItems: false }).promise;
        let text = '';
        const pages = Math.min(doc.numPages || 0, 8);
        for (let i = 1; i <= pages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent({ includeMarkedContent: true });
          text += ' ' + (content.items || []).map((it) => it?.str ?? '').join(' ');
          if (text.length > 80 && /₦|ngn|amount|total|paid/i.test(text)) break;
          if (timeLeft() <= 0) break;
        }
        text = (text || '').trim();
        if (text.length >= 6) return { text, method: 'pdf-text' };
      } catch {}

      const { text: ocr } = await ocrPdfAsImagesFast(file, { timeLeft });
      return { text: (ocr || '').trim(), method: 'pdf-ocr' };
    }

    if (file.type?.startsWith?.('image/') || !file.type) {
      const text = await ocrImageFileFast(file, { timeLeft });
      return { text: (text || '').trim(), method: 'image-ocr' };
    }
  } catch {
    return { text: '', method: 'unknown' };
  }
  return { text: '', method: 'unknown' };
}

async function loadPdfJs() {
  try {
    const pdfjsLib = await import('pdfjs-dist/build/pdf');
    try {
      const worker = new Worker(new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url), { type: 'module' });
      pdfjsLib.GlobalWorkerOptions.workerPort = worker;
    } catch {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '5.4.149'}/build/pdf.worker.min.mjs`;
    }
    return { pdfjsLib };
  } catch {
    try {
      const pdfjsLib = await import(/* webpackIgnore: true */ 'https://unpkg.com/pdfjs-dist@5.4.149/build/pdf.min.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.149/build/pdf.worker.min.mjs';
      return { pdfjsLib };
    } catch {
      return {};
    }
  }
}

async function isProbablyPdf(file) {
  if (!file) return false;
  if (file.type && /pdf/i.test(file.type)) return true;
  if (file.name && /\.pdf$/i.test(file.name)) return true;
  try {
    const slice = file.slice(0, 5);
    const buf = await slice.arrayBuffer();
    const head = new TextDecoder('ascii').decode(new Uint8Array(buf));
    return head.startsWith('%PDF');
  } catch { return false; }
}
function isLikelyPdfPreview(file) { return !!(file && (file.type?.toLowerCase?.().includes('pdf') || /\.pdf$/i.test(file.name))); }

async function ocrPdfAsImagesFast(file, { timeLeft }) {
  try {
    const { pdfjsLib } = await loadPdfJs();
    if (!pdfjsLib) return { text: '' };
    const mod = await import('tesseract.js');
    const Tesseract = mod.default ?? mod;

    const data = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data }).promise;

    const scales = [2.4, 3.0];
    const thresholds = [undefined, 160, 190, 210]; // stronger for faint text
    const invertFlags = [false, true];            // also try inverted

    const parts = [];
    const maxPages = Math.min(doc.numPages || 0, 5);

    for (let i = 1; i <= maxPages; i++) {
      if (timeLeft() <= 0) break;
      const page = await doc.getPage(i);
      let pageText = '';

      for (const scale of scales) {
        if (timeLeft() <= 0) break;
        const { ctx, canvas } = await renderPageToCanvas(page, scale);

        for (const invert of invertFlags) {
          for (const th of thresholds) {
            if (timeLeft() <= 0) break;
            const k2 = cloneOnNewCanvas(ctx, canvas.width, canvas.height);
            enhanceCanvas(k2, canvas.width, canvas.height, {
              grayscale: true, contrast: 1.35, brightness: 1.1, threshold: th, sharpen: true
            });
            if (invert) invertCanvas(k2, canvas.width, canvas.height);
            const blob = await canvasToPngBlob(k2.canvas);
            const txt = await ocrBlobWithTesseract(blob, Tesseract, timeLeft());
            if (txt && (txt.length > 40 || /₦|ngn|amount|total|paid/i.test(txt))) { pageText = txt; break; }
          }
          if (pageText) break;
        }
        canvas.width = 0; canvas.height = 0;
        if (pageText) break;
      }
      if (pageText) parts.push(pageText);
    }
    return { text: parts.join('\n\n') };
  } catch {
    return { text: '' };
  }
}

async function renderPageToCanvas(page, scale) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, background: 'rgba(255,255,255,1)' }).promise;
  return { canvas, ctx };
}
async function canvasToPngBlob(canvas) {
  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b || new Blob()), 'image/png', 1.0));
}
async function ocrBlobWithTesseract(blob, Tesseract, timeoutMs = 8000) {
  let done = false;
  const p = Tesseract.recognize(blob, 'eng', {
    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ₦NnGg.,:-/&',
    tessedit_pageseg_mode: '6',
    user_defined_dpi: '320',
    preserve_interword_spaces: '1',
  }).then(({ data }) => {
    done = true;
    const txt = (data?.text || '').trim();
    return txt.length >= 6 ? txt : '';
  }).catch(() => '');
  const t = new Promise((resolve) => setTimeout(() => resolve(done ? '' : ''), timeoutMs));
  const res = await Promise.race([p, t]);
  return res || '';
}

async function ocrImageFileFast(file, { timeLeft }) {
  try {
    const mod = await import('tesseract.js');
    const Tesseract = mod.default ?? mod;
    const bitmap = await createImageBitmap(file);

    const target = Math.min(3200, Math.max(1600, Math.max(bitmap.width, bitmap.height)));
    const { canvas, ctx } = fitBitmapToCanvas(bitmap, target);

    const rotations = [0, 90];
    let bestText = '', bestScore = 0;

    for (const angle of rotations) {
      if (timeLeft() <= 0) break;
      const { c, k } = angle ? rotateCanvas(ctx.canvas, angle) : { c: ctx.canvas, k: ctx };
      const passes = [
        { grayscale: true, contrast: 1.25, brightness: 1.08, sharpen: true },
        { grayscale: true, contrast: 1.4,  brightness: 1.12, threshold: 190, sharpen: true },
        { grayscale: true, contrast: 1.5,  brightness: 1.18, threshold: 210, sharpen: true },
      ];

      for (const p of passes) {
        if (timeLeft() <= 0) break;

        // normal
        {
          const k2 = cloneOnNewCanvas(k, c.width, c.height);
          enhanceCanvas(k2, c.width, c.height, p);
          const txt = await ocrBlobWithTesseract(await canvasToPngBlob(k2.canvas), Tesseract, timeLeft());
          const score = scoreText(txt);
          if (score > bestScore) { bestScore = score; bestText = txt; }
          if (bestScore >= 100) break;
        }

        // inverted (helps faint/washy receipts)
        {
          const k3 = cloneOnNewCanvas(k, c.width, c.height);
          enhanceCanvas(k3, c.width, c.height, p);
          invertCanvas(k3, c.width, c.height);
          const txtInv = await ocrBlobWithTesseract(await canvasToPngBlob(k3.canvas), Tesseract, timeLeft());
          const scoreInv = scoreText(txtInv);
          if (scoreInv > bestScore) { bestScore = scoreInv; bestText = txtInv; }
          if (bestScore >= 100) break;
        }
      }
      if (bestScore >= 100) break;
    }

    canvas.width = canvas.height = 0;
    bitmap.close?.();
    return bestText;
  } catch { return ''; }
}
function fitBitmapToCanvas(bitmap, maxSide = 2200) {
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(8, Math.floor(bitmap.width * ratio));
  const h = Math.max(8, Math.floor(bitmap.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);
  return { canvas, ctx };
}
function rotateCanvas(canvas, angleDeg) {
  const rad = angleDeg * Math.PI / 180;
  const s = Math.abs(Math.sin(rad)), c = Math.abs(Math.cos(rad));
  const w = canvas.width, h = canvas.height;
  const nw = Math.max(8, Math.floor(w * c + h * s)), nh = Math.max(8, Math.floor(w * s + h * c));
  const out = document.createElement('canvas'); out.width = nw; out.height = nh;
  const k = out.getContext('2d', { willReadFrequently: true });
  k.translate(nw / 2, nh / 2);
  k.rotate(rad);
  k.drawImage(canvas, -w / 2, -h / 2);
  return { c: out, k };
}

function enhanceCanvas(ctx, w, h, { grayscale = true, contrast = 1.0, brightness = 1.0, threshold, sharpen = false } = {}) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const c = Math.max(0, contrast), b = Math.max(0, brightness);
  const cf = (259 * (c * 255 + 255)) / (255 * (259 - c * 255));
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], bl = d[i + 2];
    if (grayscale) { const y = 0.299*r + 0.587*g + 0.114*bl; r = g = bl = y; }
    r = cf * ((r * b) - 128) + 128;
    g = cf * ((g * b) - 128) + 128;
    bl = cf * ((bl * b) - 128) + 128;
    d[i] = clamp8(r); d[i + 1] = clamp8(g); d[i + 2] = clamp8(bl);
  }
  ctx.putImageData(img, 0, 0);

  if (typeof threshold === 'number') {
    const im = ctx.getImageData(0, 0, w, h);
    const dd = im.data;
    for (let i = 0; i < dd.length; i += 4) {
      const y = (dd[i] + dd[i+1] + dd[i+2]) / 3;
      const v = y >= threshold ? 255 : 0;
      dd[i] = dd[i+1] = dd[i+2] = v;
    }
    ctx.putImageData(im, 0, 0);
  }

  if (sharpen) {
    convolve3x3(ctx, w, h, [0, -1, 0, -1, 5, -1, 0, -1, 0]);
  }
}
function clamp8(x) { return x < 0 ? 0 : x > 255 ? 255 : x | 0; }
function convolve3x3(ctx, w, h, kernel) {
  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const s = src.data, d = dst.data, k = kernel;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sum = 0, idx = (y * w + x) * 4;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const i = ((y + ky) * w + (x + kx)) * 4;
          const yv = (s[i] + s[i+1] + s[i+2]) / 3;
          sum += yv * k[(ky + 1) * 3 + (kx + 1)];
        }
      }
      const v = clamp8(sum);
      d[idx] = d[idx+1] = d[idx+2] = v;
      d[idx+3] = 255;
    }
  }
  ctx.putImageData(dst, 0, 0);
}
function cloneOnNewCanvas(srcCtx, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const dst = c.getContext('2d', { willReadFrequently: true });
  dst.drawImage(srcCtx.canvas, 0, 0); return dst;
}
function invertCanvas(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; }
  ctx.putImageData(img, 0, 0);
}
function scoreText(t) {
  if (!t) return 0;
  let s = 0;
  if (/₦|ngn/i.test(t)) s += 40;
  if (/total|amount|paid|debit|credit/i.test(t)) s += 40;
  const digits = (t.match(/\d/g) || []).length;
  s += Math.min(40, Math.floor(digits / 6) * 10);
  return s;
}
