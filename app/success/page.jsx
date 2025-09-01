'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import NavbarDark from '../components/Navbar/NavbarDark'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  Printer,
  Share2,
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function SuccessPage() {
  // You can change this default ETA or pass it via props/store
  const estimatedTime = 35 // minutes

  const readyAtRef = useRef(Date.now() + estimatedTime * 60 * 1000)
  const totalSeconds = estimatedTime * 60

  const [remaining, setRemaining] = useState(totalSeconds)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  // Simple order reference for user comms
  const orderRef = useRef(
    `ORD-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now()
      .toString()
      .slice(-4)}`
  )

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const secs = Math.max(0, Math.round((readyAtRef.current - now) / 1000))
      setRemaining(secs)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const progressPct = useMemo(() => {
    return Math.min(100, Math.max(0, ((totalSeconds - remaining) / totalSeconds) * 100))
  }, [remaining, totalSeconds])

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  const readyTimeLabel = useMemo(() => {
    const d = new Date(readyAtRef.current)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [])

  const handleCopyRef = async () => {
    try {
      await navigator.clipboard.writeText(orderRef.current)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      console.error(e)
    }
  }

  const handleShare = async () => {
    const text = `Order ${orderRef.current} confirmed. ETA ~ ${mm}:${ss}.`
    try {
      if (navigator.canShare && navigator.canShare({ text })) {
        await navigator.share({ title: 'Order Confirmed', text })
        setShared(true)
        setTimeout(() => setShared(false), 1500)
        return
      }
      await navigator.clipboard.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 1500)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <>
      <NavbarDark />

      {/* Premium background */}
      <div className="relative min-h-[100dvh] overflow-hidden bg-[radial-gradient(60%_60%_at_50%_0%,rgba(34,197,94,0.18),transparent),radial-gradient(40%_40%_at_100%_0%,rgba(59,130,246,0.12),transparent)] from-slate-950 via-slate-950 to-black text-slate-100">
        {/* subtle noise grid */}
        <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\' width=\'32\' height=\'32\'><path fill=\'rgba(255,255,255,0.04)\' d=\'M0 0h1v1H0z\'/></svg>')] [mask-image:radial-gradient(white,transparent_80%)]" />

        <main className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mx-auto w-full rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8 text-center backdrop-blur-xl"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">Order Successful!</h1>
            <p className="mt-2 text-slate-300">Thank you for your order. 🎉</p>

            {/* Order ref + actions */}
            <div className="mt-6 flex flex-col items-center justify-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-sm">
                <span className="opacity-80">Order ref:</span>
                <span className="font-mono">{orderRef.current}</span>
                <button
                  onClick={handleCopyRef}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
                >
                  <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Clock className="h-4 w-4" /> Estimated ready: <span className="font-medium text-slate-100">{readyTimeLabel}</span>
              </div>
            </div>

            {/* ETA donut */}
            <div className="mx-auto mt-8 flex w-full max-w-sm items-center justify-center">
              <div
                aria-label={`Progress ${Math.round(progressPct)} percent`}
                className="relative h-36 w-36 rounded-full"
                style={{
                  backgroundImage: `conic-gradient(rgb(34,197,94) ${progressPct}%, rgba(255,255,255,0.12) ${progressPct}% 100%)`,
                }}
              >
                <div className="absolute inset-2 rounded-full bg-slate-900/80 backdrop-blur" />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="text-3xl font-semibold tabular-nums">{mm}:{ss}</div>
                    <div className="text-xs text-slate-400">until ready</div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
              >
                Shop Again
              </Link>

              <Link
                href="/orders"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700"
              >
                Track Order <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Utility actions */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/10 px-2.5 py-1.5 hover:bg-white/20"
                title="Print receipt"
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/10 px-2.5 py-1.5 hover:bg-white/20"
                title="Share order status"
              >
                <Share2 className="h-3.5 w-3.5" /> {shared ? 'Copied' : 'Share'}
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-400">Keep this page open to see your live countdown.</p>
          </motion.div>
        </main>

        {/* subtle confetti bursts */}
        <div className="pointer-events-none absolute -top-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 translate-x-1/3 translate-y-1/3 rounded-full bg-blue-500/20 blur-3xl" />
      </div>
    </>
  )
}
