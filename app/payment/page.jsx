'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { clearCart } from '../store/cartSlice'
import NavbarDark from '../components/Navbar/NavbarDark'

const PaymentPage = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const [isPaying, setIsPaying] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const cartTotal = useSelector((state) => {
    const items = state.cart?.items || [] 
    return items.reduce((total, item) => total + item.price * item.quantity, 0)
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handlePay = () => {
    if (isPaying) return
    setIsPaying(true)

    setTimeout(() => {
      dispatch(clearCart())
      router.push('/success')
    }, 1500)
  }

  if (!isMounted) return null 

  return (
    <>
      <NavbarDark />
      <div className="max-w-xl mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold mb-6">Payment</h1>

        <p className="mb-4 text-gray-700">
          Total to pay:{' '}
          <span className="font-bold text-red-600">
            ₦{cartTotal.toFixed(2)}
          </span>
        </p>

        <div className="p-4 border rounded-lg mb-6 bg-gray-100">
          <p className="font-bold">Bank Transfer Details:</p>
          <p>Account Number: <span className="font-mono">1234567890</span></p>
          <p>Bank Name: First Bank</p>
          <p>Account Name: Chicken And Rice</p>
        </div>

        <button
          onClick={handlePay}
          disabled={isPaying}
          className={`w-full py-3 rounded-lg font-bold text-lg transition ${
            isPaying
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isPaying ? 'Processing Payment...' : 'Confirm Payment'}
        </button>
      </div>
    </>
  )
}

export default PaymentPage
