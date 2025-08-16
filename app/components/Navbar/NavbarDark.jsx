'use client'
import React from 'react'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { useSelector } from 'react-redux'

export default function NavbarDark() {
  const cartItems = useSelector(state => state.cart.cartItem)

  return (
    <nav className="fixed top-0 left-0 w-full z-50 mb-10 bg-black bg-opacity-90 shadow-md backdrop-blur-md transition-all duration-300">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="hover:opacity-80 transition-opacity duration-200">
          <img src="/lASOP_chicken_&_rice_logo_2[1] OK.png" alt="Logo" className="h-10 w-auto" />
        </Link>
        <Link href="/cart" className="relative group">
          <button className="flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/20">
            <ShoppingBag className="w-6 h-6" />
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
