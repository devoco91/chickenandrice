'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { clearCart } from '../store/cartSlice'
import NavbarDark from '../components/Navbar/NavbarDark'

const PaymentPage = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const [isPaying, setIsPaying] = useState(false)

  const handlePay = () => {
    if (isPaying) return // prevent multiple clicks
    setIsPaying(true)

    setTimeout(() => {
      dispatch(clearCart())
      router.push('/success')
    }, 1500)
  }

  return (
    <>
      <NavbarDark />
      <div className="max-w-xl mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold mb-6">Payment</h1>
        <p className="mb-4 text-gray-700">
          Total to pay: <span className="font-bold text-red-600">$34.00</span>
        </p>

        <button
          onClick={handlePay}
          disabled={isPaying}
          className={`w-full py-3 rounded-lg font-bold text-lg transition ${
            isPaying
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isPaying ? 'Processing Payment...' : 'Pay Now'}
        </button>
      </div>
    </>
  )
}

export default PaymentPage
