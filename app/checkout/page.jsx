'use client'

import React, { useState, useEffect, useRef } from 'react'
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
    location: null, // {lat, lng}
  })

  const [suggestions, setSuggestions] = useState([])
  const serviceRef = useRef(null)
  const suggestionBoxRef = useRef(null)

  // Load Google Places (async)
  useEffect(() => {
    if (typeof window === 'undefined' || window.google?.maps?.places) return
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.google?.maps?.places) {
        serviceRef.current = new window.google.maps.places.AutocompleteService()
      }
    }
    document.head.appendChild(script)
    return () => { if (script) script.remove() }
  }, [])

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(e.target)) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleStreetChange = (e) => {
    const value = e.target.value
    setFormData((p) => ({ ...p, street: value }))

    if (value.length > 2 && serviceRef.current && window.google?.maps?.places) {
      serviceRef.current.getPlacePredictions(
        { input: value, componentRestrictions: { country: 'NG' } },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            setSuggestions(predictions || [])
          } else {
            setSuggestions([])
          }
        }
      )
    } else {
      setSuggestions([])
    }
  }

  const handleStreetBlur = () => {
    if (formData.street && !formData.location && window.google?.maps) {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ address: formData.street }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          setFormData((prev) => ({
            ...prev,
            street: results[0].formatted_address,
            location: {
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng(),
            },
          }))
        }
      })
    }
  }

  const handleSuggestionClick = (prediction) => {
    const placeId = prediction.place_id
    const description = prediction.description
    if (!placeId) {
      setFormData((p) => ({ ...p, street: description }))
      setSuggestions([])
      return
    }
    const placesService = new window.google.maps.places.PlacesService(document.createElement('div'))
    placesService.getDetails(
      { placeId, fields: ['formatted_address', 'geometry'] },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          setFormData((p) => ({
            ...p,
            street: place.formatted_address,
            location: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            },
          }))
          setSuggestions([])
        }
      }
    )
  }

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords
          const geocoder = new window.google.maps.Geocoder()
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
              setFormData((p) => ({
                ...p,
                street: results[0].formatted_address,
                location: { lat: latitude, lng: longitude },
              }))
            } else {
              alert('Unable to retrieve your address. Please enter manually.')
            }
          })
        },
        () => alert('Permission denied. Please enable location or enter manually.')
      )
    }
  }

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const subtotal = cartItems.reduce((t, item) => t + item.price * item.quantity, 0)
  const deliveryFee = 500
  const tax = subtotal * 0.02
  const total = subtotal + deliveryFee + tax

  const isFormValid =
    formData.name.trim() !== '' &&
    formData.phone.trim() !== '' &&
    formData.houseNumber.trim() !== '' &&
    formData.street.trim() !== '' &&
    cartItems.length > 0

  const validationErrors = []
  if (!formData.name.trim()) validationErrors.push('Name is required')
  if (!formData.phone.trim()) validationErrors.push('Phone is required')
  if (!formData.houseNumber.trim()) validationErrors.push('House number is required')
  if (!formData.street.trim()) validationErrors.push('Street is required')
  if (cartItems.length === 0) validationErrors.push('Cart is empty')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isFormValid) {
      alert('Please fill all required fields and ensure your cart is not empty.')
      return
    }

    setLoading(true); setError(null); setSuccess(false)

    // Build GeoJSON location now
    const geoLocation = formData.location
      ? { type: 'Point', coordinates: [Number(formData.location.lng), Number(formData.location.lat)] }
      : { type: 'Point', coordinates: [3.3792, 6.5244] } // fallback Lagos

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
      specialNotes: formData.notes,
      location: geoLocation,
      subtotal,
      deliveryFee,
      tax,
      total,
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || data.message || `Failed to submit order (status ${response.status}).`)

      setSuccess(true)
      setFormData({
        name: '', phone: '', houseNumber: '', street: '',
        landmark: '', notes: '', location: null,
      })
      dispatch(clearCart())
      router.push('/payment')
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <NavbarDark />
      <div className="max-w-2xl mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold mb-6">Exact Delivery Location</h1>

        {success && <div className="mb-6 p-4 bg-green-100 text-green-800 rounded">Order submitted successfully! Thank you.</div>}
        {error && <div className="mb-6 p-4 bg-red-100 text-red-800 rounded">{error}</div>}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input name="name" placeholder="Enter Your Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full border border-gray-300 p-3 rounded" disabled={loading} />
          <input name="phone" placeholder="Phone Number" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required className="w-full border border-gray-300 p-3 rounded" disabled={loading} />
          <input name="houseNumber" placeholder="House Number (e.g., 23A)" value={formData.houseNumber} onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })} required className="w-full border border-gray-300 p-3 rounded" disabled={loading} />

          <div className="relative" ref={suggestionBoxRef}>
            <input name="street" placeholder="Street (e.g., Bode Thomas Street)" value={formData.street} onChange={handleStreetChange} onBlur={handleStreetBlur} required className="w-full border border-gray-300 p-3 rounded" disabled={loading} />
            {suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 bg-white border border-gray-300 rounded mt-1 max-h-60 overflow-auto z-50">
                {suggestions.map((s) => (
                  <li key={s.place_id || s.description} onClick={() => handleSuggestionClick(s)} className="p-2 hover:bg-gray-100 cursor-pointer">
                    {s.description}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="button" onClick={handleUseCurrentLocation} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-colors" disabled={loading}>Use Current Location</button>

          <input name="landmark" placeholder="Landmark (optional)" value={formData.landmark} onChange={(e) => setFormData({ ...formData, landmark: e.target.value })} className="w-full border border-gray-300 p-3 rounded" disabled={loading} />
          <textarea name="notes" placeholder="Extra Delivery Instructions (optional)" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full border border-gray-300 p-3 rounded" disabled={loading} />

          <div className="space-y-1 text-gray-800 font-semibold">
            <p>Subtotal: ₦{subtotal.toLocaleString()}</p>
            <p>Delivery Fee: ₦{deliveryFee.toLocaleString()}</p>
            <p>Tax: ₦{tax.toLocaleString()}</p>
            <p className="text-lg font-bold">Total: ₦{total.toLocaleString()}</p>
          </div>

          <button type="submit" disabled={!isFormValid || loading} className={`block w-full text-center ${isFormValid && !loading ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'} text-white py-3 rounded-lg font-semibold transition-colors`}>
            {loading ? 'Submitting...' : 'Submit Order'}
          </button>

          {!isFormValid && !loading && (
            <ul className="mt-2 text-sm text-red-600 space-y-1">
              {validationErrors.map((err, idx) => (<li key={idx}>• {err}</li>))}
            </ul>
          )}
        </form>
      </div>
    </div>
  )
}

export default CheckoutPage
