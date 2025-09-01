'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { clearCart } from '../store/cartSlice'
import { clearOrderDetails } from '../store/orderSlice'
import NavbarDark from '../components/Navbar/NavbarDark'

// Icons & libs (kept)
import {
  Banknote,
  Check,
  ClipboardCopy,
  Clock,
  Info,
  Loader2,
  Lock,
  Printer,
  ShieldCheck,
  Smartphone,
  Upload,
  Wallet,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'

const ACCOUNT_NUMBER = '5102635557'
const ACCOUNT_NAME = 'Wazobia City Buka'
const BANK_NAME = 'Moniepoint'

const formatNGN = (n = 0) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(Number(n || 0))

export default function PaymentPage() {
  const router = useRouter()
  const dispatch = useDispatch()

  const [isPaying, setIsPaying] = useState(false)
  const [copiedKey, setCopiedKey] = useState(null)
  const [isMounted, setIsMounted] = useState(false)
  const [receiptFile, setReceiptFile] = useState(null)
  const [tab, setTab] = useState('transfer')

  const total = useSelector((state) => state.order.total || 0)

  useEffect(() => setIsMounted(true), [])

  // Stable payment reference for narration/description
  const paymentRef = useRef(
    `REF-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now()
      .toString()
      .slice(-4)}`
  )

  // Simple ETA/progress when processing
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    if (!isPaying) return
    setProgress(0)
    const id = setInterval(() => setProgress((p) => Math.min(100, p + 8)), 120)
    return () => clearInterval(id)
  }, [isPaying])

  const handleCopy = async (key, value) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1500)
    } catch (e) {
      console.error('Copy failed', e)
    }
  }

  const handlePay = () => {
    if (isPaying) return
    setIsPaying(true)

    // Simulate verification + redirect
    setTimeout(() => {
      dispatch(clearCart())
      dispatch(clearOrderDetails())
      router.push('/success')
    }, 1500)
  }

  if (!isMounted) return null

  const totalLabel = formatNGN(total)

  return (
    <>
      <NavbarDark />

      {/* Premium gradient background */}
      <div className="relative min-h-[100dvh] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(59,130,246,0.18),transparent),radial-gradient(40%_40%_at_100%_0%,rgba(236,72,153,0.12),transparent)] from-slate-950 via-slate-950 to-black text-slate-100">
        <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\' width=\'32\' height=\'32\'><path fill=\'rgba(255,255,255,0.04)\' d=\'M0 0h1v1H0z\'/></svg>')] [mask-image:radial-gradient(white,transparent_80%)]" />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Payment</h1>
              <p className="mt-1 text-sm text-slate-300">Complete your order securely in a few seconds.</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-sm">
              <Lock className="h-4 w-4" /> Secure
            </span>
          </div>

          {/* Tabs (pure Tailwind) */}
          <div className="grid w-full grid-cols-2 rounded-xl border border-white/10 bg-white/10 p-1">
            <button
              onClick={() => setTab('transfer')}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                tab === 'transfer' ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              <Banknote className="h-4 w-4" /> Bank Transfer
            </button>
            <button
              disabled
              title="Card payments will be available shortly."
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm opacity-60 cursor-not-allowed"
            >
              <Wallet className="h-4 w-4" /> Card (coming soon)
            </button>
          </div>

          {/* Order Summary */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
              <div className="p-5 sm:p-6">
                <h2 className="text-lg font-medium">Order Summary</h2>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Subtotal</span>
                    <span>{totalLabel}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Fees</span>
                    <span>{formatNGN(0)}</span>
                  </div>
                  <hr className="my-3 border-white/10" />
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Total Due</span>
                    <span className="text-2xl font-semibold">{totalLabel}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 p-4 pt-0">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
                >
                  <Printer className="h-4 w-4" /> Print Invoice
                </button>
              </div>
            </div>
          </motion.div>

          {/* Bank Transfer Content */}
          {tab === 'transfer' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
                <div className="p-5 sm:p-6 space-y-1">
                  <h3 className="flex items-center gap-2 text-base font-medium">
                    <Smartphone className="h-5 w-5" /> Transfer with your banking app
                  </h3>
                  <p className="text-sm text-slate-300">
                    Use the details below. Include the reference in your narration/description.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-2 sm:p-6">
                  {/* QR / Reference */}
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6">
                    <QRCodeSVG
                      value={`banktransfer://pay?acc=${ACCOUNT_NUMBER}&bank=${encodeURIComponent(
                        BANK_NAME
                      )}&name=${encodeURIComponent(ACCOUNT_NAME)}&amt=${Number(total || 0)}&ref=${paymentRef.current}`}
                      size={168}
                      bgColor="transparent"
                    />
                    <p className="mt-3 text-xs text-center text-slate-300">
                      Scan with your bank app (where supported)
                    </p>

                    <div className="mt-4 w-full">
                      <label htmlFor="ref" className="text-sm text-slate-200">Payment Reference</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          id="ref"
                          value={paymentRef.current}
                          readOnly
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-100 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopy('ref', paymentRef.current)}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
                        >
                          {copiedKey === 'ref' ? (
                            <>
                              <Check className="h-4 w-4" /> Copied
                            </>
                          ) : (
                            <>
                              <ClipboardCopy className="h-4 w-4" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="account" className="text-sm text-slate-200">Account Number</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          id="account"
                          value={ACCOUNT_NUMBER}
                          readOnly
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-100 tracking-wider outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopy('account', ACCOUNT_NUMBER)}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
                        >
                          {copiedKey === 'account' ? (
                            <>
                              <Check className="h-4 w-4" /> Copied
                            </>
                          ) : (
                            <>
                              <ClipboardCopy className="h-4 w-4" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="bank" className="text-sm text-slate-200">Bank Name</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          id="bank"
                          value={BANK_NAME}
                          readOnly
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-100 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopy('bank', BANK_NAME)}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
                        >
                          {copiedKey === 'bank' ? (
                            <>
                              <Check className="h-4 w-4" /> Copied
                            </>
                          ) : (
                            <>
                              <ClipboardCopy className="h-4 w-4" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="name" className="text-sm text-slate-2 00">Account Name</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          id="name"
                          value={ACCOUNT_NAME}
                          readOnly
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-100 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopy('name', ACCOUNT_NAME)}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
                        >
                          {copiedKey === 'name' ? (
                            <>
                              <Check className="h-4 w-4" /> Copied
                            </>
                          ) : (
                            <>
                              <ClipboardCopy className="h-4 w-4" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="amount" className="text-sm text-slate-200">Amount</label>
                      <input
                        id="amount"
                        value={totalLabel}
                        readOnly
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-100 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5 sm:p-6">
                  {/* Alert */}
                  <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100">
                    <Info className="mt-0.5 h-4 w-4" />
                    <div>
                      <p className="font-medium">Don’t forget the reference</p>
                      <p className="text-sm">
                        Please include <span className="font-semibold">{paymentRef.current}</span> in the transfer
                        narration/description so we can match your payment instantly.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" /> Payments protected with bank‑grade security
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Typical confirmation &lt; 1 min
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
                    <button
                      type="button"
                      onClick={() => document.getElementById('receipt')?.click()}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
                    >
                      <Upload className="h-4 w-4" /> Upload Transfer Receipt (optional)
                    </button>
                    <input
                      id="receipt"
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    />

                    <button
                      onClick={handlePay}
                      disabled={isPaying}
                      className={`flex-1 inline-flex items-center justify-center rounded-lg px-4 py-2 text-white transition ${
                        isPaying ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isPaying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing Payment...
                        </>
                      ) : (
                        <>Confirm Payment</>
                      )}
                    </button>
                  </div>

                  {receiptFile && (
                    <p className="text-xs text-slate-300">Attached: {receiptFile.name}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Help & Support */}
          <div className="mt-6 text-sm text-slate-300 flex items-center gap-2">
            <Info className="h-4 w-4" /> Need help? Contact support from your account portal.
          </div>
        </div>

        {/* Processing Overlay */}
        <AnimatePresence>
          {isPaying && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 12, opacity: 0 }}
                className="w-[90%] max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6 text-center"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold">Confirming your payment…</h3>
                <p className="mt-1 text-sm text-slate-300">Please hold while we verify and finalize your order.</p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-white/60"
                    style={{ width: `${progress}%`, transition: 'width 120ms linear' }}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
