'use client'

import React from 'react'
import Link from 'next/link'
import NavbarDark from '../components/Navbar/NavbarDark'

const SuccessPage = () => {
  const estimatedTime = 35 

  return (
    <>
      <NavbarDark />
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-4">Order Successful!</h1>
        <p className="text-lg text-gray-700 mb-6">
          Thank you for your order. 🎉
        </p>

        <p className="text-md text-gray-600 mb-8">
          Your food will be ready in approximately{' '}
          <span className="font-semibold text-black">{estimatedTime} minutes</span>.
        </p>

        <Link
          href="/"
          className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          Back to Home
        </Link>
      </div>
    </>
  )
}

export default SuccessPage
