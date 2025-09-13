"use client";

import { useSelector, useDispatch } from "react-redux";
import {
  incrementQuantity2,
  decrementQuantity2,
  removeItemCart2,
} from "@/store/cartSlice2";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Minus, ArrowLeft, ArrowRight, CreditCard } from "lucide-react";
import { useState, useMemo, useEffect } from "react"; // <-- ADDED useEffect
import { addToTodaysSales } from "../utils/salesTracker";
import { API_BASE } from "../utils/apiBase"; // ✅ use the same API base as Admin

// POST helper that tolerates non-JSON responses and shows readable errors
async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status} ${res.statusText}`);
    return data;
  }

  // Non-JSON (HTML error, proxy page, etc.)
  const text = await res.text().catch(() => "");
  const snippet = (text || "").slice(0, 180);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}${snippet ? ` – ${snippet}` : ""}`);
  return {}; // ok but empty
}

export default function SummaryPage() {
  const cart = useSelector((state) => state.cart2.cartItem);
  const dispatch = useDispatch();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState("");

  // ---- ADDED: read orderType persisted by Order page's Chowdeck button
  const [orderType, setOrderType] = useState("instore");
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? sessionStorage.getItem("orderType") : null;
      if (saved === "chowdeck") setOrderType("chowdeck");
      else setOrderType("instore");
    } catch {}
  }, []);
  // ---- END ADDED

  const money = (n) => `₦${Number(n || 0).toLocaleString()}`;

  const total = useMemo(() => {
    return cart.reduce((sum, item) => {
      const unitCount = item.category === "food" ? item.portion : item.quantity;
      return sum + (item.price || 0) * unitCount;
    }, 0);
  }, [cart]);

  const submitOrder = async () => {
    try {
      setLoading(true);

      const items = cart.map((item) => ({
        name: item.name,
        quantity: item.category === "food" ? item.portion : item.quantity,
        price: item.price,
        category: item.category,
        _id: item._id,
      }));

      // ---- ADDED: honor Chowdeck (force transfer; tag orderType)
      const ot = orderType === "chowdeck" ? "chowdeck" : "instore";
      const normalizedPM =
        ot === "chowdeck"
          ? "transfer"
          : String(paymentMode || "").toLowerCase(); // 'cash' | 'card' | 'transfer'
      // ---- END ADDED

      const payload = {
        orderType: ot,           // <-- "chowdeck" when toggle was on
        items,
        total,
        paymentMode: normalizedPM, // <-- forced to "transfer" for chowdeck
        customerName: "Walk-in Customer",
      };

      // ✅ call your backend (e.g. https://fastfolderbackend.fly.dev/api/orders)
      const endpoint = `${API_BASE}/orders`;
      const data = await postJson(endpoint, payload);

      addToTodaysSales(total);

      if (typeof window !== "undefined") {
        sessionStorage.setItem("paymentMode", normalizedPM);
        sessionStorage.setItem("orderType", ot); // keep for receipt page header
        const orderId = data?.orderId || data?._id || data?.id || "";
        if (orderId) sessionStorage.setItem("lastOrderId", String(orderId));
      }

      router.push("/receipt");
    } catch (err) {
      alert(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
            Order Summary
          </h1>
          <span className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-gray-200 text-gray-700 text-sm font-semibold shadow-sm">
            <CreditCard size={16} />
            POS / Cashier
          </span>
        </header>

        {/* Cart list */}
        <div className="bg-white/90 backdrop-blur rounded-2xl border border-gray-200 shadow-sm p-4 md:p-6">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Cart is empty. Add items from the order page.
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => {
                const unitCount = item.category === "food" ? item.portion : item.quantity;
                const subtotal = (item.price || 0) * unitCount;

                return (
                  <div
                    key={`${item._id}-${item.category}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b last:border-b-0 pb-3"
                  >
                    <div>
                      <p className="text-sm text-gray-600">
                        {item.category === "food"
                          ? `${item.portion} ${item.portion > 1 ? "plates" : "plate"} of ${item.name}`
                          : `${item.quantity} ${item.quantity > 1 ? "pieces" : "piece"} of ${item.name}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {money(item.price)} each —{" "}
                        <span className="font-semibold">{money(subtotal)}</span>
                      </p>
                    </div>

                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() =>
                          dispatch(decrementQuantity2({ id: item._id, category: item.category }))
                        }
                        className="h-9 w-9 flex items-center justify-center rounded-full border border-gray-300 bg-white hover:bg-gray-100 active:scale-95 transition"
                        title="Decrease"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="min-w-[2.25rem] text-center font-semibold text-gray-800">
                        {unitCount}
                      </span>
                      <button
                        onClick={() =>
                          dispatch(incrementQuantity2({ id: item._id, category: item.category }))
                        }
                        className="h-9 w-9 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white hover:brightness-110 active:scale-95 shadow-sm transition"
                        title="Increase"
                      >
                        <Plus size={16} />
                      </button>
                      <button
                        onClick={() =>
                          dispatch(removeItemCart2({ id: item._id, category: item.category }))
                        }
                        className="h-9 w-9 flex items-center justify-center rounded-full bg-red-100 text-red-700 hover:bg-red-200 active:scale-95 transition"
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment + Total */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="bg-white/90 backdrop-blur rounded-2xl border border-gray-200 shadow-sm p-4 md:p-6">
            <label htmlFor="payment-mode" className="block text-sm font-semibold text-gray-800 mb-2">
              Mode of Payment
            </label>
            <select
              id="payment-mode"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 shadow-sm outline-none focus:ring-2 focus:ring-purple-400 bg-white"
            >
              <option value="">Select mode of payment</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="transfer">Transfer</option>
            </select>
            <p className="mt-2 text-xs text-gray-500">Please select a payment mode to continue.</p>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl shadow-lg p-4 md:p-6 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total</p>
              <p className="text-2xl md:text-3xl font-extrabold">{money(total)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-90">Payment Method</p>
              <p className="text-lg font-semibold capitalize">{paymentMode || "--"}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 mt-8">
          <button
            onClick={() => router.push("/order")}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 active:scale-95 transition"
          >
            <ArrowLeft size={18} /> Go Back
          </button>
          <button
            onClick={submitOrder}
            disabled={loading || cart.length === 0 || !paymentMode}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-green-600 shadow-lg hover:opacity-95 active:scale-95 disabled:opacity-50 transition"
          >
            {loading ? "Processing..." : (
              <>
                Continue <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
