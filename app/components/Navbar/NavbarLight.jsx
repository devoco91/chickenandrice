// NavbarLight.jsx
'use client'
import React from 'react'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { useSelector } from 'react-redux'

export default function NavbarLight() {
  const cartItems = useSelector(state => state.cart.cartItem)
  return (
    <nav className="fixed top-0 left-0 w-full z-50 mb-10 bg-white bg-opacity-90 backdrop-blur-sm shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="hover:opacity-80 transition-opacity duration-200">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
        </Link>
        {/* Cart Icon */}
        <Link href="/cart" className="relative group">
          <button className="flex items-center justify-center w-12 h-12 bg-gray-200 rounded-full hover:bg-gray-300 transition">
            <ShoppingBag className="w-6 h-6 text-gray-700" />
          </button>
          {cartItems.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md">
              {cartItems.length}
            </span>
          )}
          <div className="absolute right-0 top-full mt-2 px-3 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            View Cart
          </div>
        </Link>
      </div>
    </nav>
  )
}
