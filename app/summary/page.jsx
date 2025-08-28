"use client"
import { useSelector, useDispatch } from "react-redux"
import { incrementQuantity2, decrementQuantity2, removeItemCart2 } from "@/store/cartSlice2"
import { useRouter } from "next/navigation"
import { Trash2, Plus, Minus, ArrowLeft, ArrowRight } from "lucide-react"
import { useState } from "react"
import { addToTodaysSales } from "../utils/salesTracker"

export default function SummaryPage() {
  const cart = useSelector((state) => state.cart2.cartItem)
  const dispatch = useDispatch()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const total = cart.reduce((sum, item) => {
    const unitCount = item.category === "food" ? item.portion : item.quantity
    return sum + (item.price || 0) * unitCount
  }, 0)

  const submitOrder = async () => {
    try {
      setLoading(true)

      const items = cart.map((item) => ({
        name: item.name,
        quantity: item.category === "food" ? item.portion : item.quantity,
        price: item.price,
      }))

      const payload = {
        orderType: "instore",
        items,
        total,
        paymentMode: "cash",
        customerName: "Walk-in Customer",
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to submit order")
      }

      // ✅ Update today’s sales after successful order
      addToTodaysSales(total)

      router.push("/receipt")
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Order Summary</h1>

      <div className="space-y-4">
        {cart.map((item) => {
          const unitCount = item.category === "food" ? item.portion : item.quantity
          const subtotal = (item.price || 0) * unitCount

          return (
            <div
              key={`${item._id}-${item.category}`}
              className="flex justify-between items-center border-b pb-2"
            >
              <div>
                <p className="text-sm text-gray-500">
                  {item.category === "food"
                    ? `${item.portion} ${item.portion > 1 ? "plates" : "plate"} of ${item.name}`
                    : `${item.quantity} ${item.quantity > 1 ? "pieces" : "piece"} of ${item.name}`}
                </p>
                <p className="text-xs text-gray-600">
                  ₦{item.price} each — <span className="font-semibold">₦{subtotal}</span>
                </p>
              </div>

              <div className="flex gap-2 items-center">
                <button
                  onClick={() =>
                    dispatch(decrementQuantity2({ id: item._id, category: item.category }))
                  }
                  className="p-1 bg-gray-200 rounded"
                >
                  <Minus size={16} />
                </button>
                <button
                  onClick={() =>
                    dispatch(incrementQuantity2({ id: item._id, category: item.category }))
                  }
                  className="p-1 bg-gray-200 rounded"
                >
                  <Plus size={16} />
                </button>
                <button
                  onClick={() =>
                    dispatch(removeItemCart2({ id: item._id, category: item.category }))
                  }
                  className="p-1 bg-red-200 text-red-700 rounded"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 text-right">
        <p className="text-lg font-bold">Total: ₦{total}</p>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={() => router.push("/order")}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded"
        >
          <ArrowLeft size={18} /> Go Back
        </button>
        <button
          onClick={submitOrder}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          {loading ? "Processing..." : <>Continue <ArrowRight size={18} /></>}
        </button>
      </div>
    </div>
  )
}
