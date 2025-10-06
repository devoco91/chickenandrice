// ================================
// app/payment/page.jsx — FINAL (robust PDF→OCR; smart amount detection; no debug)
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
  const [receiptText, setReceiptText] = useState('') // normalized

  // Amount & name checks
  const [receiptAmountOK, setReceiptAmountOK] = useState(false)
  const [detectedAmount, setDetectedAmount] = useState(null)
  const [amountSnippet, setAmountSnippet] = useState('')
  const [accountNameOK, setAccountNameOK] = useState(false)
  const [accountNameSnippet, setAccountNameSnippet] = useState('')

  // WhatsApp flow
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

  const rerunVerification = () => {
    if (!proof) return toast.error('Upload payment receipt first.')
    const amt = detectReceiptAmount(receiptText, normalizedAmount)
    setReceiptAmountOK(amt.ok); setDetectedAmount(amt.bestAmount); setAmountSnippet(amt.snippet || '')
    const nameRes = verifyAccountNameStrict(receiptText)
    setAccountNameOK(nameRes.ok); setAccountNameSnippet(nameRes.snippet || '')
    toast[amt.ok && nameRes.ok ? 'success' : 'error'](
      amt.ok && nameRes.ok ? 'Verified against receipt.' : 'Verification failed: amount and/or account name.'
    )
  }

  /* ======= WhatsApp ======= */
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
    if (!isShareRecent(shareStartedAt)) return toast.error('Please send your receipt to WhatsApp first.')
    if (!shareConfirmed) return toast.error('Please confirm you have sent it on WhatsApp.')

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
                      {parsing && <span className="text-slate-300">Reading receipt…</span>}
                      {!parsing && (proof || receiptText) && (
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

                    {/* WhatsApp flow */}
                    <button type="button" className="mt-2 h-10 w-full rounded-lg border border-white bg-black text-sm hover:bg-slate-800" onClick={shareToWhatsApp} aria-label="Send to WhatsApp" title="Send to WhatsApp">
                      Send to WhatsApp (+{WHATSAPP_E164})
                    </button>

                    {/* Status + Confirm */}
                    <div className="text-xs">
                      {isShareRecent(shareStartedAt) ? (
                        <div className="mt-2">
                          <div className="text-emerald-300">WhatsApp opened. After sending, come back and confirm below.</div>
                          <label className="mt-2 flex items-center gap-2">
                            <input type="checkbox" checked={shareConfirmed} onChange={(e) => setShareConfirmed(e.target.checked)} className="h-3 w-3" />
                            <span>I have sent the receipt via WhatsApp to +{WHATSAPP_E164}.</span>
                          </label>
                        </div>
                      ) : (
                        <div className="mt-2 text-slate-300">You must send your receipt to WhatsApp before completing the order.</div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400">
                      On mobile devices, a native share dialog may open. On desktop, WhatsApp Web opens in the same tab.
                      Use the Back button to return here after sending.
                    </p>
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

  s = s.replace(/\b([A-Za-z])(?:\s+([A-Za-z]))+\b/g, (m) => m.replace(/\s+/g, ''))
       .replace(/\b(\d)(?:\s+(\d))+(\s*\.\s*\d{2})?\b/g, (m) => m.replace(/\s+/g, ''))

  preprocessReceiptText._lettersOnly = s.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b(limited|ltd|plc|llc)\b/g, '')
    .replace(/[^a-z]/g, '')

  return s
}

/** Smart amount detector (prefers ₦/NGN + labels; ignores 10+ digit IDs; picks smallest ≥ order). */
function detectReceiptAmount(text, orderAmount) {
  const src = String(text || '')
  const labels = ['total','amount','amount due','amount paid','paid','credit','transfer amount','subtotal','balance','ngn','₦']
  const window = 140

  const candidates = []
  const hay = src.toLowerCase()

  // labeled windows
  for (const label of labels) {
    let i = 0
    while ((i = hay.indexOf(label, i)) !== -1) {
      const seg = src.slice(Math.max(0, i - window), Math.min(src.length, i + window))
      for (const t of collectMoneyTokens(seg)) candidates.push({ tok: t, ctx: 'labeled' })
      i += label.length
    }
  }
  // any currency token
  for (const t of collectMoneyTokens(src)) if (/[₦]|NGN/i.test(t)) candidates.push({ tok: t, ctx: 'currency' })
  // cautious digit-only fallback (4–12 digits)
  const rawDigits = canonicalDigits(src).match(/\b\d{4,12}\b/g) || []
  for (const d of rawDigits) candidates.push({ tok: d, ctx: 'digits' })

  const o = Math.max(1, Math.floor(Math.abs(Number(orderAmount || 0))))
  const parsed = []
  const seen = new Set()

  for (const { tok, ctx } of candidates) {
    const n = parseMoneyTokenToNaira(tok)
    if (n == null) continue
    const whole = Math.floor(Math.abs(n))
    const hasCur = /[₦]|NGN/i.test(tok)
    if (!hasCur && String(whole).length >= 10) continue // drop long IDs
    const key = `${whole}:${tok}`
    if (seen.has(key)) continue
    seen.add(key)
    parsed.push({ val: whole, tok, ctx, cur: hasCur })
  }

  if (!parsed.length) return { ok: false, bestAmount: null, snippet: '' }

  // Prefer the smallest ≥ order among currency/labeled; else ≥ order; else closest overall
  const geOrder = parsed.filter(p => p.val >= o)
  const geOrderStrong = geOrder.filter(p => p.cur || p.ctx === 'labeled')
  const pick = (list) => list.sort((a, b) => a.val - b.val)[0]
  let chosen = pick(geOrderStrong) || pick(geOrder) || parsed.sort((a,b) => Math.abs(a.val - o) - Math.abs(b.val - o))[0]

  if (chosen && chosen.ctx === 'digits' && chosen.val > o * 4) chosen = null

  const ok = !!chosen && chosen.val >= o
  return { ok, bestAmount: chosen ? chosen.val : null, snippet: chosen ? chosen.tok : '' }
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
function collectMoneyTokens(s) {
  const out = new Set()
  const Usp = '\u00A0\u2007\u2009\u202F'
  const curPat = new RegExp(`(?:₦|NGN|N)[${Usp}\\s]*[\\d${Usp}\\s.,]+(?:[.,]\\d{1,2})?`, 'gi')
  ;(s.match(curPat) || []).forEach((m) => out.add(m))
  const sepPat = new RegExp(`\\b\\d{1,3}(?:[${Usp}\\s.,]\\d{3})+(?:[.,]\\d{2})?\\b`, 'g')
  ;(s.match(sepPat) || []).forEach((m) => out.add(m))
  const decPat = /\b\d{4,}(?:[.,]\d{2})\b/g
  ;(s.match(decPat) || []).forEach((m) => out.add(m))
  const longPat = /\b\d{5,}\b/g
  ;(s.match(longPat) || []).forEach((m) => out.add(m))
  return Array.from(out)
}
function parseMoneyTokenToNaira(tok) {
  if (!tok) return null
  let s = String(tok)
    .replace(/[\u00A0\u2007\u2009\u202F]/g, '')
    .replace(/\s+/g, '')
    .replace(/₦/g, '')
    .replace(/N\s*G\s*N/gi, 'NGN')
    .replace(/NGN/gi, '')
    .replace(/\bN\b/gi, '')
  const hasComma = s.includes(','), hasDot = s.includes('.')
  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.')
    const decSep = lastDot > lastComma ? '.' : ','
    s = s.replace(decSep === '.' ? /,/g : /\./g, '')
    if (decSep === ',') s = s.replace(',', '.')
  } else s = s.replace(/,/g, '')
  const n = Number.parseFloat(s.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : null
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

    // Images
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
  // 1) local ESM build
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
    // 2) CDN v4 runtime import (stable)
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

    const scales = aggressive ? [2.2, 3.0, 3.5, 4.0] : [2.2]
    const thresholds = aggressive ? [undefined, 170, 185, 200] : [undefined, 190]
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
            enhanceCanvas(ctx2, canvas.width, canvas.height, { grayscale: true, contrast: 1.35, brightness: 1.1, threshold: th })
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
async function ocrBlobWithTesseract(blob, Tesseract) {
  try {
    const { data } = await Tesseract.recognize(blob, 'eng', {
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ₦NnGg.,:-/&',
    })
    const txt = (data?.text || '').trim()
    return txt.length >= 6 ? txt : ''
  } catch { return '' }
}
function cloneOnNewCanvas(srcCtx, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const dst = c.getContext('2d', { willReadFrequently: true })
  dst.drawImage(srcCtx.canvas, 0, 0); return dst
}
function invertCanvas(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2] }
  ctx.putImageData(img, 0, 0)
}

/* ---------- Image OCR ---------- */
async function ocrImageFile(file, opts = {}) {
  try {
    const mod = await import('tesseract.js')
    const Tesseract = mod.default ?? mod
    const bitmap = await createImageBitmap(file)
    const { canvas, ctx } = fitBitmapToCanvas(bitmap, 2200)
    if (opts.enhance) enhanceCanvas(ctx, canvas.width, canvas.height, { grayscale: true, contrast: 1.4, brightness: 1.12 })
    else enhanceCanvas(ctx, canvas.width, canvas.height, { grayscale: true, contrast: 1.1, brightness: 1.05 })
    const { data } = await Tesseract.recognize(canvas, 'eng', {
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ₦NnGg.,:-/&',
    })
    const text = (data?.text ?? '').trim()
    canvas.width = canvas.height = 0
    bitmap.close?.()
    return text
  } catch { return '' }
}
function fitBitmapToCanvas(bitmap, maxSide = 2200) {
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.floor(bitmap.width * ratio))
  const h = Math.max(1, Math.floor(bitmap.height * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bitmap, 0, 0, w, h)
  return { canvas, ctx }
}
function enhanceCanvas(ctx, w, h, { grayscale = true, contrast = 1.0, brightness = 1.0, threshold } = {}) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data
  const c = Math.max(0, contrast), b = Math.max(0, brightness)
  const cf = (259 * (c * 255 + 255)) / (255 * (259 - c * 255))
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], bl = d[i + 2]
    if (grayscale) { const y = 0.299*r + 0.587*g + 0.114*bl; r = g = bl = y }
    r = cf * ((r * b) - 128) + 128
    g = cf * ((g * b) - 128) + 128
    bl = cf * ((bl * b) - 128) + 128
    if (typeof threshold === 'number') { const t = (r + g + bl) / 3; const v = t >= threshold ? 255 : 0; r = g = bl = v }
    d[i] = clamp8(r); d[i + 1] = clamp8(g); d[i + 2] = clamp8(bl)
  }
  ctx.putImageData(img, 0, 0)
}
function clamp8(x) { return x < 0 ? 0 : x > 255 ? 255 : x | 0 }
