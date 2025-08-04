'use client'
import NavbarDark from '../components/Navbar/NavbarDark'
import Link from 'next/link'
import React, { useState } from 'react'

const CheckoutPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    notes: '',
  })

  const isFormValid =
    formData.name.trim() !== '' &&
    formData.address.trim() !== '' &&
    formData.phone.trim() !== ''

  return (
    <div>
      <NavbarDark />

      <div className="max-w-2xl mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold mb-6">Checkout</h1>

        <form className="space-y-4">
          <input
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full border border-gray-300 p-3 rounded"
          />
          <input
            name="address"
            placeholder="Delivery Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            required
            className="w-full border border-gray-300 p-3 rounded"
          />
          <input
            name="phone"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
            className="w-full border border-gray-300 p-3 rounded"
          />
          <textarea
            name="notes"
            placeholder="Extra Delivery Instructions (optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full border border-gray-300 p-3 rounded"
          />

          <Link
            href={isFormValid ? '/payment' : '#'}
            className={`block w-full text-center ${
              isFormValid
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-400 cursor-not-allowed'
            } text-white py-3 rounded-lg font-semibold transition-colors`}
            onClick={(e) => {
              if (!isFormValid) {
                e.preventDefault()
                alert('Please fill out all required fields.')
              }
            }}
          >
            Proceed to Payment
          </Link>
        </form>
      </div>
    </div>
  )
}

export default CheckoutPage
