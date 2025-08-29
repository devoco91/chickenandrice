"use client"
import { useRef } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useReactToPrint } from "react-to-print"
import { clearCart2 } from "@/store/cartSlice2"   // cashier cart
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function ReceiptPage() {
  const cart = useSelector((state) => state.cart2.cartItem)
  const dispatch = useDispatch()
  const router = useRouter()
  const componentRef = useRef()

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: "Receipt",
    onAfterPrint: () => dispatch(clearCart2()),
  })

  const total = cart.reduce((sum, item) => {
    const unitCount = item.category === "food" ? item.portion : item.quantity
    return sum + (item.price || 0) * unitCount
  }, 0)

  const formatCurrency = (amount) =>
    `₦${(amount || 0).toLocaleString("en-NG", {
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
    <div className="p-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Receipt</h1>

      <div
        ref={componentRef}
        className="bg-white shadow rounded p-6 print:w-[80mm] print:p-2 print:shadow-none print:rounded-none print:font-mono"
      >
        {/* ✅ Logo + Store Name */}
        <div className="text-center mb-4">
          <Image
            src="/favicon.ico"
            alt="Logo"
            width={120}
            height={120}
            className="mx-auto print:w-28 print:h-28"
            priority
          />
          <p className="font-bold text-lg mt-1 print:text-xl">Chicken and Rice Limited</p>
          <p className="text-xs print:text-sm">Thank you for your purchase!</p>
        </div>

        {/* ✅ Items */}
        {cart.map((item) => {
          const unitCount = item.category === "food" ? item.portion : item.quantity
          const subtotal = (item.price || 0) * unitCount

          return (
            <div
              key={`${item._id}-${item.category}`}
              className="flex justify-between text-sm border-b border-dashed py-1 print:text-base"
            >
              <span className="w-2/3 truncate">
                {unitCount}x {item.name}
              </span>
              <span className="w-1/3 text-right">{formatCurrency(subtotal)}</span>
            </div>
          )
        })}

        {/* ✅ Grand Total */}
        <div className="mt-3 pt-3 border-t-2 border-black flex justify-between text-base font-bold print:text-lg print:font-extrabold print:justify-center print:gap-6">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <div className="border-t border-dashed mt-2"></div>

        {/* ✅ Footer */}
        <div className="text-center text-xs mt-4 print:text-sm">
          <p>Powered by Chicken and Rice Ltd</p>
          <p>{formatDate()}</p>
          <p className="mt-1">No refund after order is confirmed</p>
        </div>
      </div>

      {/* Actions (hidden on print) */}
      <div className="flex justify-between mt-8 print:hidden">
        <button
          onClick={() => router.push("/summary")}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          Back to Summary
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Print Receipt
        </button>
      </div>
    </div>
  )
}
