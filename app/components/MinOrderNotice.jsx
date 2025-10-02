"use client";
import React from "react";
import { useSelector } from "react-redux";

export default function MinOrderNotice() {
  const cartItems = useSelector((s) => s.cart.cartItem);
  const totalPacks = Array.isArray(cartItems)
    ? cartItems.reduce((sum, i) => sum + (i?.quantity || 0), 0)
    : 0;

  if (totalPacks >= 3) return null;

  return (
    <div
      className="sticky top-0 z-30 text-center font-semibold text-gray-900 text-sm md:text-base shadow"
      style={{ backgroundColor: "oklch(85.2% 0.199 91.936)" }}
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-4 py-2">
        ✨ Minimum Order Notice: 3 packs or more.
      </div>
    </div>
  );
}
