"use client";
import React from "react";
import { useSelector } from "react-redux";

const MIN_ORDER_AMOUNT = 8850;

export default function MinOrderNotice() {
  const cartItems = useSelector((s) => s.cart.cartItem);
  const itemsSubtotal = Array.isArray(cartItems)
    ? cartItems.reduce((sum, i) => sum + (Number(i?.price) || 0) * (Number(i?.quantity) || 0), 0)
    : 0;

  if (itemsSubtotal >= MIN_ORDER_AMOUNT) return null;

  return (
    <div
      className="sticky top-0 z-30 text-center font-semibold text-gray-900 text-sm md:text-base shadow"
      style={{ backgroundColor: "oklch(85.2% 0.199 91.936)" }}
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-4 py-2">
        ✨ Minimum Order Notice: ₦{MIN_ORDER_AMOUNT.toLocaleString()} (items subtotal).
      </div>
    </div>
  );
}
