'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { clearCart } from '../store/cartSlice'
import { clearOrderDetails } from '../store/orderSlice'
import NavbarDark from '../components/Navbar/NavbarDark'

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
  Wallet,
  Sparkles,
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
      setTimeout(() => setCopiedKey(null), 1300)
    } catch (e) {
      console.error('Copy failed', e)
    }
  }

const copyAllDetails = async () => {
  const text = [
    `Amount: ${formatNGN(total)}`,
    `Account Number: ${ACCOUNT_NUMBER}`,
    `Bank: ${BANK_NAME}`,
    `Account Name: ${ACCOUNT_NAME}`,
    `Reference: ${paymentRef.current}`,
  ].join('\n')
  await handleCopy('all', text)
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

      {/* Solid dark theme */}
      <div className="relative min-h-[100dvh] text-slate-100 bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 py-10 sm:py-16 relative">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white px-2.5 py-1 text-xs text-white">
                <Sparkles className="h-3.5 w-3.5" /> Premium Checkout
              </div>
              <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-white">
                Payment
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Complete your order securely in a few seconds.
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded-full border border-white px-2.5 py-1 text-sm">
                <Lock className="h-4 w-4" /> Secure
              </span>
              <div className="mt-2 text-xs text-slate-300">Due now</div>
              <div className="text-2xl font-semibold">{totalLabel}</div>
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
            <button
              onClick={() => setTab('transfer')}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                tab === 'transfer'
                  ? 'bg-white text-black'
                  : 'hover:bg-slate-800'
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
            <div className="mt-6 rounded-2xl border border-white bg-slate-900">
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">Order Summary</h2>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-lg border border-white bg-black px-3 py-2 text-sm hover:bg-slate-800 active:scale-95"
                  >
                    <Printer className="h-4 w-4" /> Print Invoice
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Subtotal</span>
                    <span>{totalLabel}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Fees</span>
                    <span>{formatNGN(0)}</span>
                  </div>
                  <hr className="my-3 border-white" />
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Total Due</span>
                    <span className="text-2xl font-semibold">{totalLabel}</span>
                  </div>
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
                  <p className="text-sm text-slate-300">
                    Use the details below. Include the reference in your narration/description.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-2 sm:p-6">
                  {/* QR / Reference */}
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-white bg-slate-900 p-6">
                    <QRCodeSVG
                      value={`banktransfer://pay?acc=${ACCOUNT_NUMBER}&bank=${encodeURIComponent(
                        BANK_NAME
                      )}&name=${encodeURIComponent(ACCOUNT_NAME)}&amt=${Number(total || 0)}&ref=${paymentRef.current}`}
                      size={176}
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
                          className="w-full rounded-lg border border-white bg-black px-3 py-2 text-slate-100 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopy('ref', paymentRef.current)}
                          className="inline-flex items-center gap-2 rounded-lg border border-white bg-black px-3 py-2 text-sm hover:bg-slate-800 active:scale-95"
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
                          className="w-full rounded-lg border border-white bg-black px-3 py-2 text-slate-100 tracking-wider outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopy('account', ACCOUNT_NUMBER)}
                          className="inline-flex items-center gap-2 rounded-lg border border-white bg-black px-3 py-2 text-sm hover:bg-slate-800 active:scale-95"
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
                          className="w-full rounded-lg border border-white bg-black px-3 py-2 text-slate-100 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopy('bank', BANK_NAME)}
                          className="inline-flex items-center gap-2 rounded-lg border border-white bg-black px-3 py-2 text-sm hover:bg-slate-800 active:scale-95"
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
                      <label htmlFor="name" className="text-sm text-slate-200">Account Name</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          id="name"
                          value={ACCOUNT_NAME}
                          readOnly
                          className="w-full rounded-lg border border-white bg-black px-3 py-2 text-slate-100 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopy('name', ACCOUNT_NAME)}
                          className="inline-flex items-center gap-2 rounded-lg border border-white bg-black px-3 py-2 text-sm hover:bg-slate-800 active:scale-95"
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
                        className="mt-1 w-full rounded-lg border border-white bg-black px-3 py-2 text-slate-100 outline-none"
                      />
                    </div>

                    <div className="pt-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={copyAllDetails}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white bg-black px-3 py-2 text-xs hover:bg-slate-800 active:scale-95"
                          title="Copy all details"
                        >
                          <ClipboardCopy className="h-4 w-4" /> Copy All
                        </button>
                        <div className="inline-flex items-center gap-2 text-xs text-slate-300">
                          <ShieldCheck className="h-4 w-4" /> Bank‑grade security
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5 sm:p-6">
                  {/* Alert */}
                  <div className="flex items-start gap-3 rounded-xl border border-amber-500 bg-amber-900/30 p-3 text-amber-100">
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
                      onClick={handlePay}
                      disabled={isPaying}
                      className={`flex-1 inline-flex items-center justify-center rounded-lg px-4 py-2 text-white transition ${
                        isPaying ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
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
                </div>
              </div>
            </motion.div>
          )}

          {/* Help & Support */}
          <div className="mt-6 text-sm text-slate-300 flex items-center gap-2">
            <Info className="h-4 w-4" /> Need help? Contact support from your account portal.
          </div>
        </div>

        {/* Tiny toast */}
        <AnimatePresence>
          {copiedKey && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-full border border-white bg-black px-4 py-2 text-xs text-white"
            >
              Copied to clipboard
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing Overlay */}
        <AnimatePresence>
          {isPaying && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 12, opacity: 0 }}
                className="w-[90%] max-w-md rounded-2xl border border-white bg-slate-900 p-6 text-center"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold">Confirming your payment…</h3>
                <p className="mt-1 text-sm text-slate-300">Please hold while we verify and finalize your order.</p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full bg-blue-600"
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
