'use client'

import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useRouter } from 'next/navigation'
import NavbarDark from '../components/Navbar/NavbarDark'
import { clearCart } from '../store/cartSlice'

const CheckoutPage = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const cartItems = useSelector((state) => state.cart.cartItem || [])

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    houseNumber: '',
    street: '',
    landmark: '',
    notes: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
  const deliveryFee = 500
  const tax = subtotal * 0.02
  const total = subtotal + deliveryFee + tax

  const isFormValid =
    formData.name.trim() !== '' &&
    formData.phone.trim() !== '' &&
    formData.houseNumber.trim() !== '' &&
    formData.street.trim() !== '' &&
    formData.landmark.trim() !== '' &&
    cartItems.length > 0

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isFormValid) {
      alert('Please fill all required fields and ensure your cart is not empty.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    const orderPayload = {
      items: cartItems.map((item) => ({
        foodId: item._id,
        quantity: item.quantity,
        name: item.name,
        price: item.price,
      })),
      customerName: formData.name,
      phone: formData.phone,
      houseNumber: formData.houseNumber,
      street: formData.street,
      landmark: formData.landmark,
      notes: formData.notes,
      paymentSummary: {
        subtotal,
        deliveryFee,
        tax,
        total,
      },
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || data.message || `Failed to submit order (status ${response.status}).`)
      }

      setSuccess(true)
      setFormData({
        name: '',
        phone: '',
        houseNumber: '',
        street: '',
        landmark: '',
        notes: '',
      })

      // ✅ only clear cart, keep order totals for payment page
      dispatch(clearCart())

      router.push('/payment')
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <NavbarDark />

      <div className="max-w-2xl mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold mb-6">Exact Delivery Location</h1>

        {success && (
          <div className="mb-6 p-4 bg-green-100 text-green-800 rounded">
            Order submitted successfully! Thank you.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-800 rounded">{error}</div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            name="name"
            placeholder="Enter Your Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full border border-gray-300 p-3 rounded"
            disabled={loading}
          />
          <input
            name="phone"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
            className="w-full border border-gray-300 p-3 rounded"
            disabled={loading}
          />
          <input
            name="houseNumber"
            placeholder="House Number (e.g., 23A)"
            value={formData.houseNumber}
            onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
            required
            className="w-full border border-gray-300 p-3 rounded"
            disabled={loading}
          />
          <input
            name="street"
            placeholder="Street (e.g., Bode Thomas Street)"
            value={formData.street}
            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
            required
            className="w-full border border-gray-300 p-3 rounded"
            disabled={loading}
          />
          <input
            name="landmark"
            placeholder="Landmark"
            value={formData.landmark}
            onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
            required
            className="w-full border border-gray-300 p-3 rounded"
            disabled={loading}
          />
          <textarea
            name="notes"
            placeholder="Extra Delivery Instructions (optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full border border-gray-300 p-3 rounded"
            disabled={loading}
          />

          <div className="space-y-1 text-gray-800 font-semibold">
            <p>Subtotal: ₦{subtotal.toLocaleString()}</p>
            <p>Delivery Fee: ₦{deliveryFee.toLocaleString()}</p>
            <p>Tax: ₦{tax.toLocaleString()}</p>
            <p className="text-lg font-bold">Total: ₦{total.toLocaleString()}</p>
          </div>

          <button
            type="submit"
            disabled={!isFormValid || loading}
            className={`block w-full text-center ${
              isFormValid && !loading
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-400 cursor-not-allowed'
            } text-white py-3 rounded-lg font-semibold transition-colors`}
          >
            {loading ? 'Submitting...' : 'Submit Order'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CheckoutPage
