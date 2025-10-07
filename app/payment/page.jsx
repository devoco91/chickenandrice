// ================================
// app/payment/page.jsx — FINAL (mobile-accurate OCR: EXIF rotation, mobile-safe canvas, Tesseract CDN paths)
// ================================
'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { clearCart } from '../store/cartSlice'
import { clearOrderDetails } from '../store/orderSlice'
import NavbarDark from '../components/Navbar/NavbarDark'
import {
  Banknote, Check, ClipboardCopy, Clock, Info, Loader2, Lock, Printer, ShieldCheck,
  Smartphone, Wallet, Sparkles, Upload,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'react-toastify'

/* ======= Constants ======= */
const ACCOUNT_NUMBER = '8986626630'
const ACCOUNT_NAME = 'ChickenAndRice Ltd'
const BANK_NAME = 'Palmpay'
const WHATSAPP_E164 = '2349040002074'
const LS_KEY = 'paypage_v1'
const SHARE_TTL_MS = 2 * 60 * 60 * 1000

/* ======= Utils ======= */
const formatNGN = (n = 0) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(Number(n || 0))

export default function PaymentPage() {
  const router = useRouter()
  const dispatch = useDispatch()

  const [isPaying, setIsPaying] = useState(false)
  const [copiedKey, setCopiedKey] = useState(null)
  const [isMounted, setIsMounted] = useState(false)
  const [tab, setTab] = useState('transfer')

  const cartItems = useSelector((s) => s.cart.cartItem || [])
  const order = useSelector((s) => s.order || {})
  const total = Number(order.total || 0)

  // Receipt/OCR state
  const [proof, setProof] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [parsing, setParsing] = useState(false)
  const [verifying, setVerifying] = useState(false) // bold "Verifying…" cue
  const [receiptText, setReceiptText] = useState('') // normalized

  // Amount & name checks
  const [receiptAmountOK, setReceiptAmountOK] = useState(false)
  const [detectedAmount, setDetectedAmount] = useState(null)
  const [amountSnippet, setAmountSnippet] = useState('')
  const [accountNameOK, setAccountNameOK] = useState(false)
  const [accountNameSnippet, setAccountNameSnippet] = useState('')

  // WhatsApp flow (optional)
  const [shareStartedAt, setShareStartedAt] = useState(null)
  const [shareConfirmed, setShareConfirmed] = useState(false)

  useEffect(() => setIsMounted(true), [])

  const paymentRef = useRef(
    `REF-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`
  )

  const [progress, setProgress] = useState(0)
  useEffect(() => {
    if (!isPaying) return
    setProgress(0)
    const id = setInterval(() => setProgress((p) => Math.min(100, p + 8)), 120)
    return () => clearInterval(id)
  }, [isPaying])

  // Persist WhatsApp
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const s = JSON.parse(raw) || {}
      setShareStartedAt(s.shareStartedAt ?? null)
      setShareConfirmed(Boolean(s.shareConfirmed))
    } catch {}
  }, [])
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      const prev = raw ? JSON.parse(raw) : {}
      localStorage.setItem(LS_KEY, JSON.stringify({ ...prev, shareStartedAt, shareConfirmed }))
    } catch {}
  }, [shareStartedAt, shareConfirmed])

  const totalLabel = formatNGN(total)
  const normalizedAmount = useMemo(() => Math.floor(Math.abs(Number(total || 0))), [total])

  /* ======= Copy helpers ======= */
  const handleCopy = async (key, value) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1300)
    } catch {
      toast.error('Copy failed')
    }
  }
  const copyAllDetails = async () => {
    const text = [
      `Amount: ${totalLabel}`,
      `Account Number: ${ACCOUNT_NUMBER}`,
      `Bank: ${BANK_NAME}`,
      `Account Name: ${ACCOUNT_NAME}`,
      `Reference: ${paymentRef.current}`,
    ].join('\n')
    await handleCopy('all', text)
  }

  /* ======= File handling & OCR ======= */
  const revokePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl('') }

  const handleProofChange = async (e) => {
    const f = e.target.files?.[0] ?? null
    setProof(f)
    setReceiptText('')
    setReceiptAmountOK(false)
    setDetectedAmount(null)
    setAmountSnippet('')
    setAccountNameOK(false)
    setAccountNameSnippet('')
    revokePreview()
    if (!f) return

    const url = URL.createObjectURL(f)
    setPreviewUrl(url)

    setParsing(true)
    try {
      const { text: raw } = await extractTextFromFile(f) // robust PDF→OCR pipeline
      const text = preprocessReceiptText(raw)
      setReceiptText(text || '')
    } catch {
      toast.error('Could not read receipt text. Try a clearer file.')
    } finally {
      setParsing(false)
    }
  }

  // Re-run verification on changes
  useEffect(() => {
    if (!receiptText || !normalizedAmount) {
      setReceiptAmountOK(false); setDetectedAmount(null); setAmountSnippet('')
      setAccountNameOK(false); setAccountNameSnippet(''); return
    }
    const amt = detectReceiptAmount(receiptText, normalizedAmount)
    setReceiptAmountOK(amt.ok); setDetectedAmount(amt.bestAmount); setAmountSnippet(amt.snippet || '')
    const nameRes = verifyAccountNameStrict(receiptText)
    setAccountNameOK(nameRes.ok); setAccountNameSnippet(nameRes.snippet || '')
  }, [receiptText, normalizedAmount])

  const rerunVerification = async () => {
    if (!proof) return toast.error('Upload payment receipt first.')
    setVerifying(true)
    await new Promise((r) => setTimeout(r, 50))
    const amt = detectReceiptAmount(receiptText, normalizedAmount)
    setReceiptAmountOK(amt.ok); setDetectedAmount(amt.bestAmount); setAmountSnippet(amt.snippet || '')
    const nameRes = verifyAccountNameStrict(receiptText)
    setAccountNameOK(nameRes.ok); setAccountNameSnippet(nameRes.snippet || '')
    setVerifying(false)
    toast[amt.ok && nameRes.ok ? 'success' : 'error'](
      amt.ok && nameRes.ok ? 'Verified against receipt.' : 'Verification failed: amount and/or account name.'
    )
  }

  /* ======= WhatsApp (optional) ======= */
  const isShareRecent = (ts) => !!ts && Date.now() - ts < SHARE_TTL_MS
  const shareToWhatsApp = async () => {
    if (!proof) return toast.error('Select a receipt file first.')
    const text = `Hello, please find my proof of payment for my order (${totalLabel}).\nRef: ${paymentRef.current}`
    const encoded = encodeURIComponent(text)
    const now = Date.now()
    setShareStartedAt(now); setShareConfirmed(false)
    try { const raw = localStorage.getItem(LS_KEY); const s = raw ? JSON.parse(raw) : {}; localStorage.setItem(LS_KEY, JSON.stringify({ ...s, shareStartedAt: now, shareConfirmed: false })) } catch {}
    try {
      if (navigator.canShare && navigator.canShare({ files: [proof] })) {
        await navigator.share({ files: [proof], text, title: 'Proof of Payment' })
        toast.success('Share dialog opened. Please send on WhatsApp.')
        return
      }
    } catch {}
    window.location.href = `https://wa.me/${WHATSAPP_E164}?text=${encoded}`
  }

  async function submitOrderToBackend() {
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
    }

    const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || data.message || `Failed to submit order (status ${res.status}).`)

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
      }
      sessionStorage.setItem('lastOrderSummary', JSON.stringify(summary))
    } catch {}
    return data
  }

  const handlePay = async () => {
    if (isPaying) return
    if (!proof) return toast.error('Upload payment receipt to continue.')
    if (!receiptAmountOK) return toast.error('Receipt amount is less than the order total.')
    if (!accountNameOK) return toast.error('Receipt account name must include “chicken and rice”.')

    setIsPaying(true)
    try {
      await submitOrderToBackend()
      dispatch(clearCart()); dispatch(clearOrderDetails())
      toast.success('Order sent!', {
        autoClose: 1400,
        onClose: () => { dispatch(clearCart()); dispatch(clearOrderDetails()); router.push('/success') },
      })
    } catch (e) {
      console.error(e)
      toast.error(e.message || 'Payment failed. Please try again.')
      setIsPaying(false)
    }
  }

  if (!isMounted) return null

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
                          capture="environment"
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

                    {/* Parsing + verification status */}
                    <div className="text-xs">
                      {parsing && <span className="font-semibold text-slate-200">Reading receipt…</span>}
                      {verifying && !parsing && <span className="font-semibold text-slate-200">Verifying receipt…</span>}
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
                              <span className="text-emerald-400">✓ Account name contains “chicken and rice”.</span>
                            ) : (
                              <span className="text-rose-300">Account name not confirmed. Receipt must include “chicken and rice”.</span>
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

        {/* Blocking overlay while paying */}
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
  )
}

/* ================= Helpers ================= */

/** Normalize receipt text for reliable matches. */
function preprocessReceiptText(input) {
  let s = String(input || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069]/g, '')
    .replace(/[\u00A0\u2007\u2009\u202F]/g, ' ')
    .replace(/\bN\s*G\s*N\b/gi, 'NGN')
    .replace(/₦\s*/g, '₦')
    .replace(/\s+/g, ' ')
    .trim()

  // collapse spaced letters/digits (OCR artifacts)
  s = s.replace(/\b([A-Za-z])(?:\s+([A-Za-z]))+\b/g, (m) => m.replace(/\s+/g, ''))
       .replace(/\b(\d)(?:\s+(\d))+(\s*\.\s*\d{2})?\b/g, (m) => m.replace(/\s+/g, ''))

  preprocessReceiptText._lettersOnly = s.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b(limited|ltd|plc|llc)\b/g, '')
    .replace(/[^a-z]/g, '')

  return s
}

/** Context-scored amount detector (labels/currency preferred; IDs penalized). */
function detectReceiptAmount(text, orderAmount) {
  const src = String(text || '')
  const hay = src.toLowerCase()

  const posLabels = [
    'total amount','total','amount','amount due','amount paid','amount sent','paid','debit','credit',
    'transfer amount','txn amount','transaction amount','subtotal','payment amount','amt','ngn','₦'
  ]
  const negLabels = [
    'transaction no','transaction number','transaction id','trx id','rrn','stan','reference','ref',
    'wallet','date','time','account number','recipient details','balance','session id'
  ]
  const WINDOW = 180

  const posWins = buildLabelWindows(hay, posLabels, WINDOW)
  const negWins = buildLabelWindows(hay, negLabels, WINDOW)

  const tokens = collectMoneyCandidatesWithIndex(src)

  const o = Math.max(1, Math.floor(Math.abs(Number(orderAmount || 0))))
  const candidates = []

  const seen = new Set()
  for (const { tok, idx } of tokens) {
    const n = parseMoneyTokenToNaira(tok)
    if (n == null) continue
    const whole = Math.floor(Math.abs(n))
    const key = `${tok}@${idx}:${whole}`
    if (seen.has(key)) continue
    seen.add(key)

    const hasCur = /[₦]|NGN/i.test(tok) || /\bk\b/i.test(tok)
    const digitsLen = tok.replace(/[^\d]/g, '').length
    const hasDecimals = /[.,]\d{2}\b/.test(tok)

    let score = 0
    if (hasCur) score += 6
    if (hasDecimals) score += 2
    if (inAnyWindow(idx, posWins)) score += 5
    if (inAnyWindow(idx, negWins)) score -= 7
    if (!hasCur && digitsLen >= 7) score -= 6
    if (digitsLen >= 10) score -= 10

    candidates.push({ val: whole, tok, idx, score, hasCur })
  }

  if (!candidates.length) return { ok: false, bestAmount: null, snippet: '' }

  // Sort by score desc, then value asc
  candidates.sort((a, b) => (b.score - a.score) || (a.val - b.val))

  // Drop absurd outliers unless clearly currency-labeled
  const filtered = candidates.filter(c => c.hasCur || c.val <= Math.max(o * 5, 2_000_000))

  const top = (filtered.length ? filtered : candidates)[0]
  const ok = !!top && top.val >= o

  return { ok, bestAmount: top ? top.val : null, snippet: top ? top.tok : '' }
}

/** Account-name verifier: tolerates &/and, punctuation, suffixes. */
function verifyAccountNameStrict(text) {
  const raw = String(text || '')
  const lettersOnly = preprocessReceiptText._lettersOnly || raw.toLowerCase().replace(/[^a-z]/g, '')
  const ok = lettersOnly.includes('chickenandrice') || lettersOnly.includes('chickenrice')
  let snippet = ''
  try {
    const m = raw.match(/chicken[\s\-_.]*(&|and)?[\s\-_.]*rice/i) || raw.match(/chickenandrice/i)
    if (m && m[0]) snippet = m[0]
  } catch {}
  return { ok, snippet }
}

/* ===== Money parsing helpers ===== */

// Collect tokens WITH indices for context scoring.
function collectMoneyCandidatesWithIndex(s) {
  const out = []
  const Usp = '\u00A0\u2007\u2009\u202F'

  const patterns = [
    new RegExp(`(?:₦|NGN|N)[${Usp}\\s]*[\\d${Usp}\\s.,]+(?:[.,]\\d{1,2})?`, 'gi'), // currency lead
    new RegExp(`\\b\\d{1,3}(?:[${Usp}\\s.,]\\d{3})+(?:[.,]\\d{2})?\\b`, 'g'),      // 1,234.56 / 1 234,56
    /\b\d{4,}(?:[.,]\d{2})\b/g,                                                    // 5400.00 / 12345,67
    /\b\d{5,}\b/g,                                                                  // long plain digits (IDs)
    /\b\d{1,3}(?:[.,]\d{1,2})?\s*[kK]\b/g,                                         // 10k / 10.5k
  ]

  for (const pat of patterns) {
    for (const m of String(s || '').matchAll(pat)) {
      const tok = m[0]
      const idx = m.index ?? -1
      out.push({ tok, idx })
    }
  }
  return out
}

function buildLabelWindows(hay, labels, win) {
  const wins = []
  for (const label of labels) {
    let i = 0
    const needle = String(label).toLowerCase()
    while ((i = hay.indexOf(needle, i)) !== -1) {
      const start = Math.max(0, i - win)
      const end = Math.min(hay.length, i + needle.length + win)
      wins.push([start, end])
      i += needle.length
    }
  }
  return wins
}
function inAnyWindow(idx, wins) {
  for (const [s, e] of wins) if (idx >= s && idx <= e) return true
  return false
}

function parseMoneyTokenToNaira(tok) {
  if (!tok) return null
  let s = String(tok)

  const hasK = /k$/i.test(s.replace(/\s+/g, ''))

  // OCR confusions
  s = s
    .replace(/[\u00A0\u2007\u2009\u202F]/g, '')
    .replace(/[Oo]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
    .replace(/Z/g, '2')

  // Strip currency & normalize
  s = s
    .replace(/\s+/g, '')
    .replace(/₦/g, '')
    .replace(/N\s*G\s*N/gi, 'NGN')
    .replace(/NGN/gi, '')
    .replace(/\bN\b/gi, '')

  let multiplier = 1
  if (hasK) { s = s.replace(/k$/i, ''); multiplier = 1000 }

  const hasComma = s.includes(','), hasDot = s.includes('.')
  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.')
    const decSep = lastDot > lastComma ? '.' : ','
    s = s.replace(decSep === '.' ? /,/g : /\./g, '')
    if (decSep === ',') s = s.replace(',', '.')
  } else s = s.replace(/,/g, '')

  const n = Number.parseFloat(s.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n * multiplier : null
}

function canonicalDigits(s) {
  return unicodeSpaceCollapse(s).normalize('NFKD')
    .replace(/\u0660/g, '0').replace(/\u0661/g, '1').replace(/\u0662/g, '2').replace(/\u0663/g, '3').replace(/\u0664/g, '4')
    .replace(/\u0665/g, '5').replace(/\u0666/g, '6').replace(/\u0667/g, '7').replace(/\u0668/g, '8').replace(/\u06F9/g, '9')
    .replace(/\u06F0/g, '0').replace(/\u06F1/g, '1').replace(/\u06F2/g, '2').replace(/\u06F3/g, '3').replace(/\u06F4/g, '4')
    .replace(/\u06F5/g, '5').replace(/\u06F6/g, '6').replace(/\u06F7/g, '7').replace(/\u06F8/g, '8').replace(/\u06F9/g, '9')
    .replace(/O/g, '0').replace(/o/g, '0')
}
function unicodeSpaceCollapse(input) { return String(input).replace(/[\u00A0\u2007\u2009\u202F]/g, ' ').replace(/\s+/g, ' ') }

/* === OCR / PDF extraction === */
async function extractTextFromFile(file) {
  if (typeof window === 'undefined') return { text: '', method: 'ssr' }

  try {
    const looksLikePdf = await isProbablyPdf(file)

    if (looksLikePdf) {
      const { pdfjsLib } = await loadPdfJs()
      if (!pdfjsLib) return { text: '', method: 'pdf-ocr' }

      // 1) Try PDF text layer quickly
      try {
        const data = await file.arrayBuffer()
        const doc = await pdfjsLib.getDocument({ data, disableCombineTextItems: false }).promise
        let text = ''
        const pages = Math.min(doc.numPages || 0, 12)
        for (let i = 1; i <= pages; i++) {
          const page = await doc.getPage(i)
          const content = await page.getTextContent({ includeMarkedContent: true })
          text += ' ' + (content.items || []).map((it) => it?.str ?? '').join(' ')
        }
        text = (text || '').trim()
        if (text.length >= 6) return { text, method: 'pdf-text' }
      } catch {}

      // 2) Rasterize pages → OCR
      const { text: ocr } = await ocrPdfAsImages(file, { aggressive: true })
      return { text: (ocr || '').trim(), method: 'pdf-ocr' }
    }

    // Images (HEIC/JPEG/PNG…)
    if (file.type?.startsWith?.('image/') || !file.type) {
      let text = await ocrImageFile(file, { enhance: false })
      if (text && text.trim().length >= 6) return { text: text.trim(), method: 'image-ocr-fast' }
      text = await ocrImageFile(file, { enhance: true })
      return { text: (text || '').trim(), method: 'image-ocr-enhanced' }
    }
  } catch {
    return { text: '', method: 'unknown' }
  }
  return { text: '', method: 'unknown' }
}

/* ---------- Load pdf.js with robust fallbacks ---------- */
async function loadPdfJs() {
  try {
    const pdfjsLib = await import('pdfjs-dist/build/pdf')
    try {
      const worker = new Worker(new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url), { type: 'module' })
      pdfjsLib.GlobalWorkerOptions.workerPort = worker
    } catch {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
    }
    return { pdfjsLib }
  } catch {
    try {
      const pdfjsLib = await import(/* webpackIgnore: true */ 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.min.mjs')
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs'
      return { pdfjsLib }
    } catch {
      try {
        const pdfjsLib = await import(/* webpackIgnore: true */ 'https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.min.mjs')
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs'
        return { pdfjsLib }
      } catch {
        return {}
      }
    }
  }
}

/* ---------- PDF helpers ---------- */
async function isProbablyPdf(file) {
  if (!file) return false
  if (file.type && /pdf/i.test(file.type)) return true
  if (file.name && /\.pdf$/i.test(file.name)) return true
  try {
    const slice = file.slice(0, 5)
    const buf = await slice.arrayBuffer()
    const head = new TextDecoder('ascii').decode(new Uint8Array(buf))
    return head.startsWith('%PDF')
  } catch { return false }
}
function isLikelyPdfPreview(file) { return !!(file && (file.type?.toLowerCase?.().includes('pdf') || /\.pdf$/i.test(file.name))) }

/* ---------- PDF OCR (render to canvas → OCR) ---------- */
async function ocrPdfAsImages(file, { aggressive = true } = {}) {
  try {
    const { pdfjsLib } = await loadPdfJs()
    if (!pdfjsLib) return { text: '' }

    const mod = await import('tesseract.js')
    const Tesseract = mod.default ?? mod

    const data = await file.arrayBuffer()
    const doc = await pdfjsLib.getDocument({ data }).promise

    const scales = aggressive ? [2.0, 2.6, 3.2, 3.8, 4.2] : [2.2]
    const thresholds = aggressive ? [undefined, 160, 175, 190, 205, 220] : [undefined, 190]
    const invertFlags = aggressive ? [false, true] : [false]

    const parts = []
    const maxPages = Math.min(doc.numPages || 0, aggressive ? 10 : 5)

    for (let i = 1; i <= maxPages; i++) {
      const page = await doc.getPage(i)
      let pageText = ''

      for (const scale of scales) {
        const { ctx, canvas } = await renderPageToCanvas(page, scale)

        for (const invert of invertFlags) {
          for (const th of thresholds) {
            const ctx2 = cloneOnNewCanvas(ctx, canvas.width, canvas.height)
            enhanceCanvas(ctx2, canvas.width, canvas.height, { grayscale: true, contrast: 1.35, brightness: 1.1, threshold: th, sharpen: true, localContrast: true })
            if (invert) invertCanvas(ctx2, canvas.width, canvas.height)
            const blob = await canvasToPngBlob(ctx2.canvas)
            const txt = await ocrBlobWithTesseract(blob, Tesseract)
            if (txt) { pageText = txt; break }
          }
          if (pageText) break
        }

        canvas.width = 0; canvas.height = 0
        if (pageText) break
      }

      if (pageText) parts.push(pageText)
    }

    return { text: parts.join('\n\n') }
  } catch {
    return { text: '' }
  }
}

/* ---------- Render helpers (canvas only) ---------- */
async function renderPageToCanvas(page, scale) {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(viewport.width))
  canvas.height = Math.max(1, Math.floor(viewport.height))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport, background: 'rgba(255,255,255,1)' }).promise
  return { canvas, ctx }
}
async function canvasToPngBlob(canvas) {
  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b || new Blob()), 'image/png', 1.0))
}

/* ---------- Tesseract ---------- */
const TESSERACT_CDN = 'https://unpkg.com/tesseract.js@4.0.2/dist/'
function tessOpts() {
  return {
    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ₦NnGg.,:-/&',
    tessedit_pageseg_mode: '6',
    user_defined_dpi: '320',
    preserve_interword_spaces: '1',
    workerPath: `${TESSERACT_CDN}worker.min.js`,
    corePath: `${TESSERACT_CDN}tesseract-core.wasm.js`,
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
  }
}
async function ocrBlobWithTesseract(blob, Tesseract) {
  try {
    const { data } = await Tesseract.recognize(blob, 'eng', tessOpts())
    const txt = (data?.text || '').trim()
    return txt.length >= 6 ? txt : ''
  } catch { return '' }
}

/* ---------- Image OCR (mobile-enhanced) ---------- */
async function ocrImageFile(file, opts = {}) {
  try {
    const mod = await import('tesseract.js')
    const Tesseract = mod.default ?? mod

    // EXIF orientation (JPEGs); avoids sideways/upside-down digits on mobile
    const orientation = await readImageOrientation(file) // {angle, flipX}
    const { canvas, ctx } = await drawFileToOrientedCanvas(file, orientation)

    // Mobile-safe target size
    const mobile = isMobileDevice()
    const targetMax = mobile ? 2400 : 3000
    const resized = resizeCanvas(ctx.canvas, targetMax)

    // Multi-rotation passes after EXIF correction
    const rotations = [0, 90, 180, 270]
    let bestText = '', bestLen = 0

    for (const angle of rotations) {
      const { c, k } = angle ? rotateCanvas(resized.canvas, angle) : resized

      const passOpts = opts.enhance
        ? [
            { grayscale: true, contrast: 1.4, brightness: 1.12, sharpen: true, localContrast: true },
            { grayscale: true, contrast: 1.55, brightness: 1.18, threshold: 195, sharpen: true, localContrast: true, denoise: true }
          ]
        : [{ grayscale: true, contrast: 1.1, brightness: 1.05 }]

      for (const p of passOpts) {
        const k2 = cloneOnNewCanvas(k, c.width, c.height)
        enhanceCanvas(k2, c.width, c.height, p)
        const { data } = await Tesseract.recognize(k2.canvas, 'eng', tessOpts())
        const txt = (data?.text ?? '').trim()
        if (txt.length > bestLen) { bestText = txt; bestLen = txt.length }
        // Early exit if we already see strong amount cues
        if (bestLen > 100 && /total|amount|paid|₦|ngn/i.test(bestText)) break
      }
      if (bestLen > 120 && /total|amount|paid|₦|ngn/i.test(bestText)) break
    }

    // Cleanup
    resized.canvas.width = resized.canvas.height = 0
    canvas.width = canvas.height = 0

    return bestText
  } catch {
    return ''
  }
}

/* ---------- Canvas/bitmap helpers (EXIF + fallbacks) ---------- */
function isMobileDevice() {
  const ua = (navigator.userAgent || '').toLowerCase()
  return /iphone|ipad|ipod|android|mobile/.test(ua)
}

async function drawFileToOrientedCanvas(file, orientation) {
  // Try ImageBitmap, fall back to HTMLImageElement (HEIC/iOS)
  let bmp = null, img = null
  try { bmp = await createImageBitmap(file) } catch {}
  if (!bmp) img = await loadImageFromBlob(file)

  const srcW = bmp ? bmp.width : img.naturalWidth
  const srcH = bmp ? bmp.height : img.naturalHeight

  // Compute target canvas size after EXIF rotation
  const rot = (orientation?.angle || 0) % 360
  const flipX = !!orientation?.flipX
  const swap = rot === 90 || rot === 270
  const w = swap ? srcH : srcW
  const h = swap ? srcW : srcH
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, w)
  canvas.height = Math.max(1, h)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  // Apply EXIF transform
  ctx.save()
  // Translate to center for rotation
  ctx.translate(canvas.width / 2, canvas.height / 2)
  if (flipX) ctx.scale(-1, 1)
  ctx.rotate((rot * Math.PI) / 180)
  // Draw, offset back by half of source
  const dw = srcW
  const dh = srcH
  ctx.drawImage(bmp || img, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()

  // Close bitmap to free memory
  try { bmp && bmp.close?.() } catch {}

  return { canvas, ctx }
}
function resizeCanvas(srcCanvas, maxSide) {
  const w = srcCanvas.width, h = srcCanvas.height
  const ratio = Math.min(1, maxSide / Math.max(w, h))
  const tw = Math.max(1, Math.floor(w * ratio))
  const th = Math.max(1, Math.floor(h * ratio))
  if (ratio === 1) {
    const ctx = srcCanvas.getContext('2d', { willReadFrequently: true })
    return { canvas: srcCanvas, ctx }
  }
  const canvas = document.createElement('canvas')
  canvas.width = tw; canvas.height = th
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(srcCanvas, 0, 0, tw, th)
  return { canvas, ctx }
}
function rotateCanvas(canvas, angleDeg) {
  const rad = angleDeg * Math.PI / 180
  const s = Math.abs(Math.sin(rad)), c = Math.abs(Math.cos(rad))
  const w = canvas.width, h = canvas.height
  const nw = Math.floor(w * c + h * s), nh = Math.floor(w * s + h * c)
  const out = document.createElement('canvas'); out.width = nw; out.height = nh
  const k = out.getContext('2d', { willReadFrequently: true })
  k.translate(nw / 2, nh / 2)
  k.rotate(rad)
  k.drawImage(canvas, -w / 2, -h / 2)
  return { c: out, k }
}
async function loadImageFromBlob(file) {
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e) }
    img.src = url
  })
}

/* ---------- Image enhancement ---------- */
function enhanceCanvas(ctx, w, h, { grayscale = true, contrast = 1.0, brightness = 1.0, threshold, sharpen = false, localContrast = false, denoise = false } = {}) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data
  const c = Math.max(0, contrast), b = Math.max(0, brightness)
  const cf = (259 * (c * 255 + 255)) / (255 * (259 - c * 255))
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], bl = d[i + 2]
    if (grayscale) { const y = 0.299*r + 0.587*g + 0.114*bl; r = g = bl = y }
    r = cf * ((r * b) - 128) + 128
    g = cf * ((g * b) - 128) + 128
    bl = cf * ((bl * b) - 128) + 128
    d[i] = clamp8(r); d[i + 1] = clamp8(g); d[i + 2] = clamp8(bl)
  }
  ctx.putImageData(img, 0, 0)

  if (localContrast) applyLocalContrast(ctx, w, h, 64, 64, 0.75)
  if (denoise) medianFilter(ctx, w, h)

  if (typeof threshold === 'number') {
    const im = ctx.getImageData(0, 0, w, h)
    const dd = im.data
    for (let i = 0; i < dd.length; i += 4) {
      const y = (dd[i] + dd[i+1] + dd[i+2]) / 3
      const v = y >= threshold ? 255 : 0
      dd[i] = dd[i+1] = dd[i+2] = v
    }
    ctx.putImageData(im, 0, 0)
  }

  if (sharpen) convolve3x3(ctx, w, h, [0, -1, 0, -1, 5, -1, 0, -1, 0])
}
function clamp8(x) { return x < 0 ? 0 : x > 255 ? 255 : x | 0 }
function applyLocalContrast(ctx, w, h, tileW = 64, tileH = 64, amount = 0.75) {
  const img = ctx.getImageData(0, 0, w, h)
  const data = img.data
  for (let ty = 0; ty < h; ty += tileH) {
    for (let tx = 0; tx < w; tx += tileW) {
      const ex = Math.min(tx + tileW, w)
      const ey = Math.min(ty + tileH, h)
      let sum = 0, sum2 = 0, count = 0
      for (let y = ty; y < ey; y++) for (let x = tx; x < ex; x++) {
        const i = (y * w + x) * 4
        const yv = (data[i] + data[i+1] + data[i+2]) / 3
        sum += yv; sum2 += yv*yv; count++
      }
      const mean = sum / count
      const variance = Math.max(1, (sum2 / count) - mean*mean)
      const std = Math.sqrt(variance)
      const scale = Math.min(3.0, 1 + amount * (128 / std))
      for (let y = ty; y < ey; y++) for (let x = tx; x < ex; x++) {
        const i = (y * w + x) * 4
        let yv = (data[i] + data[i+1] + data[i+2]) / 3
        yv = clamp8((yv - mean) * scale + mean)
        data[i] = data[i+1] = data[i+2] = yv
      }
    }
  }
  ctx.putImageData(img, 0, 0)
}
function convolve3x3(ctx, w, h, kernel) {
  const src = ctx.getImageData(0, 0, w, h)
  const dst = ctx.createImageData(w, h)
  const s = src.data, d = dst.data, k = kernel
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sum = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const i = ((y + ky) * w + (x + kx)) * 4
          const yv = (s[i] + s[i+1] + s[i+2]) / 3
          sum += yv * k[(ky + 1) * 3 + (kx + 1)]
        }
      }
      const v = clamp8(sum)
      const idx = (y * w + x) * 4
      d[idx] = d[idx+1] = d[idx+2] = v
      d[idx+3] = 255
    }
  }
  ctx.putImageData(dst, 0, 0)
}
function medianFilter(ctx, w, h) {
  const src = ctx.getImageData(0, 0, w, h)
  const dst = ctx.createImageData(w, h)
  const s = src.data, d = dst.data
  const window = new Array(9)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let ky = -1, n = 0; ky <= 1; ky++) for (let kx = -1; kx <= 1; kx++, n++) {
        const i = ((y + ky) * w + (x + kx)) * 4
        window[n] = (s[i] + s[i+1] + s[i+2]) / 3
      }
      window.sort((a,b)=>a-b)
      const v = window[4] | 0
      const idx = (y * w + x) * 4
      d[idx] = d[idx+1] = d[idx+2] = v
      d[idx+3] = 255
    }
  }
  ctx.putImageData(dst, 0, 0)
}

/* ---------- EXIF (JPEG) orientation parsing ---------- */
async function readImageOrientation(file) {
  try {
    // Only JPEGs commonly carry EXIF orientation
    const isJpeg = /jpe?g$/i.test(file.name || '') || /image\/jpe?g/i.test(file.type || '')
    if (!isJpeg) return { angle: 0, flipX: false }

    const buf = await file.slice(0, Math.min(file.size, 128 * 1024)).arrayBuffer()
    const view = new DataView(buf)
    // JPEG SOI
    if (view.getUint16(0) !== 0xFFD8) return { angle: 0, flipX: false }
    let offset = 2
    while (offset + 1 < view.byteLength) {
      const marker = view.getUint16(offset); offset += 2
      if (marker === 0xFFE1) { // APP1
        const len = view.getUint16(offset); const exifStart = offset + 2
        const header = getAscii(view, exifStart, 4)
        if (header === 'Exif') {
          const tiff = exifStart + 6
          const little = view.getUint16(tiff) === 0x4949
          const get16 = (o) => little ? view.getUint16(o, true) : view.getUint16(o, false)
          const get32 = (o) => little ? view.getUint32(o, true) : view.getUint32(o, false)
          const ifd0 = tiff + get32(tiff + 4)
          const entries = get16(ifd0)
          for (let i = 0; i < entries; i++) {
            const entry = ifd0 + 2 + i * 12
            const tag = get16(entry)
            if (tag === 0x0112) {
              const val = get16(entry + 8)
              return exifOrientationToTransform(val)
            }
          }
        }
        offset = exifStart + len
      } else if ((marker & 0xFF00) !== 0xFF00) break
      else {
        const len = view.getUint16(offset); offset += len
      }
    }
  } catch {}
  return { angle: 0, flipX: false }
}
function exifOrientationToTransform(o) {
  switch (o) {
    case 2: return { angle: 0, flipX: true }
    case 3: return { angle: 180, flipX: false }
    case 4: return { angle: 180, flipX: true }
    case 5: return { angle: 90, flipX: true }
    case 6: return { angle: 90, flipX: false }
    case 7: return { angle: 270, flipX: true }
    case 8: return { angle: 270, flipX: false }
    default: return { angle: 0, flipX: false }
  }
}
function getAscii(view, start, len) {
  let s = ''
  for (let i = 0; i < len && start + i < view.byteLength; i++) {
    s += String.fromCharCode(view.getUint8(start + i))
  }
  return s
}
