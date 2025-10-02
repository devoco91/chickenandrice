// components/Navbar.jsx
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { useSelector } from "react-redux";

function Navbar() {
  const cartItems = useSelector((s) => s.cart.cartItem);
  const totalPacks = useMemo(
    () =>
      Array.isArray(cartItems)
        ? cartItems.reduce((s, i) => s + (i?.quantity || 0), 0)
        : 0,
    [cartItems]
  );
  const router = useRouter();
  const [message, setMessage] = useState("");

  const handleCartClick = () => {
    if (totalPacks < 3) {
      // why: show clear warning and auto-hide; anchored beneath icon on mobile
      setMessage(
        `⚠️ You currently have ${totalPacks} pack${totalPacks === 1 ? "" : "s"}. Minimum of 3 packs required before checkout.`
      );
      setTimeout(() => setMessage(""), 6000);
      return;
    }
    router.push("/cart");
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="hover:opacity-80 transition-opacity" aria-label="Home">
          <img
            src="/lASOP_chicken___rice_logo_2_1__OK-removebg-preview.png"
            alt="Logo"
            width={44}
            height={44}
          />
        </Link>

        {/* Right cluster: message (left) + cart button (right) */}
        <div className="flex items-center gap-3">
          {/* Desktop/Tablet inline warning (unchanged) */}
          {message && (
            <div className="hidden sm:block max-w-[420px] text-red-700 font-bold text-xs md:text-sm leading-snug text-right">
              {message}
            </div>
          )}

          {/* Cart button + badge + Mobile toast */}
          <div className="relative">
            <button
              onClick={handleCartClick}
              className="flex items-center justify-center w-11 h-11 rounded-full text-white shadow transition"
              style={{ backgroundColor: "oklch(85.2% 0.199 91.936)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "oklch(78% 0.199 91.936)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "oklch(85.2% 0.199 91.936)")
              }
              aria-label="Shopping cart"
            >
              <ShoppingCart className="w-6 h-6" />
            </button>

            {totalPacks > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[11px] font-bold rounded-full min-w-5 h-5 px-[6px] flex items-center justify-center shadow-md">
                {totalPacks}
              </span>
            )}

            {/* Mobile-only warning toast (beneath the icon) */}
            {message && (
              <div
                className="sm:hidden absolute right-0 top-full mt-2 z-[60] max-w-[82vw] w-64 bg-white border border-red-200 text-red-700 font-bold text-xs leading-snug rounded-lg px-3 py-2 shadow-lg"
                role="alert"
                aria-live="polite"
              >
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
