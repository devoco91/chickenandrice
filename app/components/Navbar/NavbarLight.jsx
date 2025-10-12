// NavbarLight.jsx
'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { useSelector } from 'react-redux';

const MIN_ORDER_AMOUNT = 8850;

export default function NavbarLight() {
  const router = useRouter();
  const cartItems = useSelector((state) => state.cart.cartItem);

  const totalPacks = useMemo(
    () =>
      Array.isArray(cartItems)
        ? cartItems.reduce((s, i) => s + (Number(i?.quantity) || 0), 0)
        : 0,
    [cartItems]
  );

  const itemsSubtotal = useMemo(
    () =>
      Array.isArray(cartItems)
        ? cartItems.reduce(
            (s, i) =>
              s + (Number(i?.price) || 0) * (Number(i?.quantity) || 0),
            0
          )
        : 0,
    [cartItems]
  );

  const [message, setMessage] = useState('');

  const handleCartClick = () => {
    if (itemsSubtotal < MIN_ORDER_AMOUNT) {
      // why: block navigation until minimum subtotal is met
      setMessage(
        `⚠️ Subtotal is ₦${itemsSubtotal.toLocaleString()}. Minimum is ₦${MIN_ORDER_AMOUNT.toLocaleString()} before checkout.`
      );
      setTimeout(() => setMessage(''), 6000);
      return;
    }
    router.push('/cart');
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 mb-10 bg-white bg-opacity-90 backdrop-blur-sm shadow-md">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="hover:opacity-80 transition-opacity duration-200">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
        </Link>

        {/* Right cluster: inline warning + cart button */}
        <div className="flex items-center gap-3">
          {/* Desktop/Tablet inline warning */}
          {message && (
            <div className="hidden sm:block max-w-[420px] text-red-700 font-bold text-xs md:text-sm leading-snug text-right">
              {message}
            </div>
          )}

          {/* Cart Icon */}
          <div className="relative group">
            <button
              onClick={handleCartClick}
              className="flex items-center justify-center w-12 h-12 bg-gray-200 rounded-full hover:bg-gray-300 transition"
              aria-label="View cart"
              title={`Items: ${totalPacks} • Subtotal: ₦${itemsSubtotal.toLocaleString()}`}
            >
              <ShoppingBag className="w-6 h-6 text-gray-700" />
            </button>

            {/* Count badge shows total quantity */}
            {totalPacks > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                {totalPacks}
              </span>
            )}

            {/* Subtotal badge */}
            {itemsSubtotal > 0 && (
              <span className="absolute -bottom-2 left-0 bg-gray-900 text-white text-[10px] font-semibold rounded px-2 py-[2px] shadow-md">
                ₦{itemsSubtotal.toLocaleString()}
              </span>
            )}

            {/* Hover helper */}
            <div className="absolute right-0 top-full mt-2 px-3 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              View Cart
            </div>

            {/* Mobile toast */}
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
