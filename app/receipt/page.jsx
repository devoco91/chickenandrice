// app/receipt/page.jsx
"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useReactToPrint } from "react-to-print"
import { clearCart2 } from "@/store/cartSlice2"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function ReceiptPage() {
  const cart = useSelector((state) => state.cart2.cartItem)
  const dispatch = useDispatch()
  const router = useRouter()
  const componentRef = useRef(null)
  const [paymentMode, setPaymentMode] = useState("")
  const [orderId, setOrderId] = useState("")

  // Optional: read values set by Summary page
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pm = sessionStorage.getItem("paymentMode") || ""
      const oid = sessionStorage.getItem("lastOrderId") || ""
      if (pm) setPaymentMode(pm)
      if (oid) setOrderId(oid)
    }
  }, [])

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: "Receipt",
    onAfterPrint: () => {
      dispatch(clearCart2())
      router.replace("/order") // Why: prevents back navigation to the receipt after printing
    },
  })

  const total = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const unitCount = item.category === "food" ? item.portion : item.quantity
        return sum + (item.price || 0) * unitCount
      }, 0),
    [cart]
  )

  const money = (n) =>
    `₦${(n || 0).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const formatDate = () =>
    new Date().toLocaleString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
      <div className="max-w-3xl mx-auto px-6 md:px-10 pb-28"> {/* bottom padding for sticky bar */}
        <header className="py-6 print:hidden">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
            Receipt
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Review and print the customer receipt below.
          </p>
        </header>

        {/* Receipt card (also used for thermal print) */}
        <div className="bg-white/90 backdrop-blur rounded-2xl border border-gray-200 shadow-lg p-6 print:w-[80mm] print:rounded-none print:border-0 print:shadow-none print:p-3">
          <div className="print:font-mono">
            {/* Brand */}
            <div className="text-center">
              <div className="mx-auto mb-3 rounded-2xl inline-flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 p-2 print:bg-transparent">
                <Image
                  src="/receipt.jpg"
                  alt="Logo"
                  width={72}
                  height={72}
                  className="rounded-xl"
                  priority
                />
              </div>
              <p className="font-black text-xl tracking-wide text-gray-900 print:text-lg">
                Chicken and Rice Limited
              </p>
              <p className="text-xs text-gray-500 mt-0.5 print:text-[11px]">
                Thank you for your purchase!
              </p>
            </div>

            {/* Meta */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600 print:text-[11px]">
              <div className="bg-gray-50 rounded-xl p-2 border print:bg-transparent print:border-0">
                <p className="font-semibold text-gray-800">Date</p>
                <p>{formatDate()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2 border text-right print:text-left print:bg-transparent print:border-0">
                {paymentMode ? (
                  <>
                    <p className="font-semibold text-gray-800">Payment</p>
                    <p className="capitalize">{paymentMode}</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-gray-800">Payment</p>
                    <p className="text-gray-500">—</p>
                  </>
                )}
              </div>
            </div>

            {/* Optional order id */}
            {(orderId || "").trim() !== "" && (
              <div className="mt-2 text-xs text-gray-600 print:text-[11px]">
                <p>
                  <span className="font-semibold text-gray-800">Order ID:</span>{" "}
                  <span className="font-mono">{orderId}</span>
                </p>
              </div>
            )}

            {/* Divider */}
            <div className="my-4 border-y-2 border-dashed border-gray-300 print:border-black print:border-dashed" />

            {/* Items */}
            <div>
              <div className="hidden md:grid grid-cols-12 text-[13px] font-semibold text-gray-700 mb-2 print:grid">
                <span className="col-span-7">Item</span>
                <span className="col-span-2 text-right">Qty</span>
                <span className="col-span-3 text-right">Amount</span>
              </div>

              {cart.map((item) => {
                const qty = item.category === "food" ? item.portion : item.quantity
                const subtotal = (item.price || 0) * qty
                return (
                  <div
                    key={`${item._id}-${item.category}`}
                    className="grid grid-cols-12 items-center text-sm py-2 border-b border-dashed last:border-b-0 print:text-[13px]"
                  >
                    <div className="col-span-7 pr-2">
                      <p className="font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-[11px] text-gray-500">₦{item.price} each</p>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 font-semibold text-[12px]">
                        {qty}
                      </span>
                    </div>
                    <div className="col-span-3 text-right font-semibold text-gray-900">
                      {money(subtotal)}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Total */}
            <div className="mt-3 pt-3 border-t-2 border-black flex items-center justify-between text-base font-extrabold print:text-[15px]">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>

            {/* Footer */}
            <div className="mt-4 text-center text-[11px] text-gray-600 print:text-[12px]">
              <p className="tracking-wide">Powered by Chicken and Rice Ltd</p>
              <p className="mt-1">No refund after order is confirmed</p>
            </div>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY: Two copies (Customer & Merchant) */}
      <div className="hidden print:block">
        <div ref={componentRef}>
          {/* Customer copy */}
          <div className="bg-white/90 backdrop-blur rounded-2xl border border-gray-200 shadow-lg p-6 print:w-[80mm] print:rounded-none print:border-0 print:shadow-none print:p-3">
            <div className="print:font-mono">
              {/* Brand */}
              <div className="text-center">
                <div className="mx-auto mb-3 rounded-2xl inline-flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 p-2 print:bg-transparent">
                  <Image
                    src="/receipt.jpg"
                    alt="Logo"
                    width={72}
                    height={72}
                    className="rounded-xl"
                    priority
                  />
                </div>
                <p className="font-black text-xl tracking-wide text-gray-900 print:text-lg">
                  Chicken and Rice Limited
                </p>
                <p className="text-xs text-gray-500 mt-0.5 print:text-[11px]">
                  Thank you for your purchase!
                </p>
                <p className="mt-1 text-[11px] text-gray-700 font-semibold uppercase tracking-wider">
                  Customer Copy
                </p>
              </div>

              {/* Meta */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600 print:text-[11px]">
                <div className="bg-gray-50 rounded-xl p-2 border print:bg-transparent print:border-0">
                  <p className="font-semibold text-gray-800">Date</p>
                  <p>{formatDate()}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2 border text-right print:text-left print:bg-transparent print:border-0">
                  {paymentMode ? (
                    <>
                      <p className="font-semibold text-gray-800">Payment</p>
                      <p className="capitalize">{paymentMode}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-gray-800">Payment</p>
                      <p className="text-gray-500">—</p>
                    </>
                  )}
                </div>
              </div>

              {/* Optional order id */}
              {(orderId || "").trim() !== "" && (
                <div className="mt-2 text-xs text-gray-600 print:text-[11px]">
                  <p>
                    <span className="font-semibold text-gray-800">Order ID:</span>{" "}
                    <span className="font-mono">{orderId}</span>
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="my-4 border-y-2 border-dashed border-gray-300 print:border-black print:border-dashed" />

              {/* Items */}
              <div>
                <div className="hidden md:grid grid-cols-12 text-[13px] font-semibold text-gray-700 mb-2 print:grid">
                  <span className="col-span-7">Item</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-3 text-right">Amount</span>
                </div>

                {cart.map((item) => {
                  const qty = item.category === "food" ? item.portion : item.quantity
                  const subtotal = (item.price || 0) * qty
                  return (
                    <div
                      key={`${item._id}-${item.category}-cust`}
                      className="grid grid-cols-12 items-center text-sm py-2 border-b border-dashed last:border-b-0 print:text-[13px]"
                    >
                      <div className="col-span-7 pr-2">
                        <p className="font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-[11px] text-gray-500">₦{item.price} each</p>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 font-semibold text-[12px]">
                          {qty}
                        </span>
                      </div>
                      <div className="col-span-3 text-right font-semibold text-gray-900">
                        {money(subtotal)}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Total */}
              <div className="mt-3 pt-3 border-t-2 border-black flex items-center justify-between text-base font-extrabold print:text-[15px]">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>

              {/* Footer */}
              <div className="mt-4 text-center text-[11px] text-gray-600 print:text-[12px]">
                <p className="tracking-wide">Powered by Chicken and Rice Ltd</p>
                <p className="mt-1">No refund after order is confirmed</p>
              </div>
            </div>
          </div>

          {/* Page break between copies */}
          <div style={{ breakAfter: "page" }} />

          {/* Merchant copy */}
          <div className="bg-white/90 backdrop-blur rounded-2xl border border-gray-200 shadow-lg p-6 print:w-[80mm] print:rounded-none print:border-0 print:shadow-none print:p-3">
            <div className="print:font-mono">
              {/* Brand */}
              <div className="text-center">
                <div className="mx-auto mb-3 rounded-2xl inline-flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 p-2 print:bg-transparent">
                  <Image
                    src="/receipt.jpg"
                    alt="Logo"
                    width={72}
                    height={72}
                    className="rounded-xl"
                    priority
                  />
                </div>
                <p className="font-black text-xl tracking-wide text-gray-900 print:text-lg">
                  Chicken and Rice Limited
                </p>
                <p className="text-xs text-gray-500 mt-0.5 print:text-[11px]">
                  Thank you for your purchase!
                </p>
                <p className="mt-1 text-[11px] text-gray-700 font-semibold uppercase tracking-wider">
                  Merchant Copy
                </p>
              </div>

              {/* Meta */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600 print:text-[11px]">
                <div className="bg-gray-50 rounded-xl p-2 border print:bg-transparent print:border-0">
                  <p className="font-semibold text-gray-800">Date</p>
                  <p>{formatDate()}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2 border text-right print:text-left print:bg-transparent print:border-0">
                  {paymentMode ? (
                    <>
                      <p className="font-semibold text-gray-800">Payment</p>
                      <p className="capitalize">{paymentMode}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-gray-800">Payment</p>
                      <p className="text-gray-500">—</p>
                    </>
                  )}
                </div>
              </div>

              {/* Optional order id */}
              {(orderId || "").trim() !== "" && (
                <div className="mt-2 text-xs text-gray-600 print:text-[11px]">
                  <p>
                    <span className="font-semibold text-gray-800">Order ID:</span>{" "}
                    <span className="font-mono">{orderId}</span>
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="my-4 border-y-2 border-dashed border-gray-300 print:border-black print:border-dashed" />

              {/* Items */}
              <div>
                <div className="hidden md:grid grid-cols-12 text-[13px] font-semibold text-gray-700 mb-2 print:grid">
                  <span className="col-span-7">Item</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-3 text-right">Amount</span>
                </div>

                {cart.map((item) => {
                  const qty = item.category === "food" ? item.portion : item.quantity
                  const subtotal = (item.price || 0) * qty
                  return (
                    <div
                      key={`${item._id}-${item.category}-merch`}
                      className="grid grid-cols-12 items-center text-sm py-2 border-b border-dashed last:border-b-0 print:text-[13px]"
                    >
                      <div className="col-span-7 pr-2">
                        <p className="font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-[11px] text-gray-500">₦{item.price} each</p>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 font-semibold text-[12px]">
                          {qty}
                        </span>
                      </div>
                      <div className="col-span-3 text-right font-semibold text-gray-900">
                        {money(subtotal)}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Total */}
              <div className="mt-3 pt-3 border-t-2 border-black flex items-center justify-between text-base font-extrabold print:text-[15px]">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>

              {/* Footer */}
              <div className="mt-4 text-center text-[11px] text-gray-600 print:text-[12px]">
                <p className="tracking-wide">Powered by Chicken and Rice Ltd</p>
                <p className="mt-1">No refund after order is confirmed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom actions — single print button (not shown in print) */}
      <div className="print:hidden fixed inset-x-0 bottom-0">
        <div className="mx-auto max-w-3xl px-6 md:px-10 pb-4">
          <div className="rounded-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.08)] bg-white/90 backdrop-blur border border-gray-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => router.push("/summary")}
              className="px-4 py-2 rounded-xl bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 active:scale-95 transition"
            >
              Back to Summary
            </button>
            <button
              onClick={handlePrint}
              className="px-6 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg hover:opacity-95 active:scale-95 transition"
            >
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
