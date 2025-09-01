// app/checkout/page.jsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import NavbarDark from '../components/Navbar/NavbarDark';
import { clearCart } from '../store/cartSlice';
import {
  MapPin,
  Navigation,
  Loader2,
  Phone,
  User,
  Home as HomeIcon,
  Landmark,
  NotebookText,
  ShieldCheck,
} from 'lucide-react';

const CheckoutPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.cartItem || []);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    houseNumber: '',
    street: '',
    landmark: '',
    notes: '',
    location: null, // {lat, lng}
  });

  const [usingLocation, setUsingLocation] = useState(false);
  const [usedCurrentLocation, setUsedCurrentLocation] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const serviceRef = useRef(null);
  const suggestionBoxRef = useRef(null);

  // ---- Load Google Places (deduped) ----
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initService = () => {
      if (window.google?.maps?.places && !serviceRef.current) {
        serviceRef.current = new window.google.maps.places.AutocompleteService();
      }
    };

    // Already available -> init and exit
    if (window.google?.maps?.places) {
      initService();
      return;
    }

    // Reuse existing script if present
    const existing = document.querySelector(
      'script[data-gmaps="true"],script[src*="maps.googleapis.com/maps/api/js"]'
    );
    if (existing) {
      existing.addEventListener('load', initService);
      return () => existing.removeEventListener('load', initService);
    }

    // If another load is in-flight, wait for ready event
    if (window.__GMAPS_LOADING__) {
      const onReady = () => initService();
      window.addEventListener('__gmaps_ready__', onReady);
      return () => window.removeEventListener('__gmaps_ready__', onReady);
    }

    // Inject once
    window.__GMAPS_LOADING__ = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-gmaps', 'true');
    script.onload = () => {
      window.__GMAPS_LOADING__ = false;
      window.dispatchEvent(new Event('__gmaps_ready__'));
      initService();
    };
    document.head.appendChild(script);

    // Keep script mounted across HMR/nav; just clear handler
    return () => {
      script.onload = null;
    };
  }, []);

  // ---- Close suggestions on outside click ----
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ---- Address autocomplete (disabled when using current location) ----
  const handleStreetChange = (e) => {
    const value = e.target.value;
    setFormData((p) => ({ ...p, street: value }));
    if (usedCurrentLocation) return;

    if (value.length > 2 && serviceRef.current && window.google?.maps?.places) {
      serviceRef.current.getPlacePredictions(
        { input: value, componentRestrictions: { country: 'NG' } },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            setSuggestions(predictions || []);
          } else {
            setSuggestions([]);
          }
        }
      );
    } else {
      setSuggestions([]);
    }
  };

  const handleStreetBlur = () => {
    if (usedCurrentLocation) return;
    if (formData.street && !formData.location && window.google?.maps) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: formData.street }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          setFormData((prev) => ({
            ...prev,
            street: results[0].formatted_address,
            location: {
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng(),
            },
          }));
        }
      });
    }
  };

  const handleSuggestionClick = (prediction) => {
    if (usedCurrentLocation) return;
    const placeId = prediction.place_id;
    const description = prediction.description;
    if (!placeId) {
      setFormData((p) => ({ ...p, street: description }));
      setSuggestions([]);
      return;
    }
    const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
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
          }));
          setSuggestions([]);
        }
      }
    );
  };

  // ---- Use Current Location (disables house/street) ----
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported on this device.');
      return;
    }
    setUsingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        const applyLocation = (formatted) => {
          setFormData((p) => ({
            ...p,
            street: formatted || p.street || 'Using current location',
            houseNumber: '',
            location: { lat: latitude, lng: longitude },
          }));
          setUsedCurrentLocation(true);
          setUsingLocation(false);
          setSuggestions([]);
        };

        if (window.google?.maps) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
              applyLocation(results[0].formatted_address);
            } else {
              applyLocation(null);
            }
          });
        } else {
          applyLocation(null);
        }
      },
      () => {
        setUsingLocation(false);
        alert('Permission denied. Please enable location or enter address manually.');
      }
    );
  };

  const enableManualEntry = () => {
    setUsedCurrentLocation(false);
    setFormData((p) => ({
      ...p,
      houseNumber: '',
      street: '',
      location: null,
    }));
    setSuggestions([]);
  };

  // ---- Totals ----
  const subtotal = cartItems.reduce((t, item) => t + item.price * item.quantity, 0);
  const deliveryFee = 500;
  const tax = subtotal * 0.02;
  const total = subtotal + deliveryFee + tax;

  // ---- Validation ----
  const nameOk = formData.name.trim() !== '';
  const phoneOk = formData.phone.trim() !== '';
  const streetOk = formData.street.trim() !== '';
  const houseOk = usedCurrentLocation ? true : formData.houseNumber.trim() !== '';
  const cartOk = cartItems.length > 0;

  const isFormValid = nameOk && phoneOk && streetOk && houseOk && cartOk;

  const validationErrors = [];
  if (!nameOk) validationErrors.push('Name is required');
  if (!phoneOk) validationErrors.push('Phone is required');
  if (!streetOk) validationErrors.push('Street is required');
  if (!houseOk) validationErrors.push(usedCurrentLocation ? 'Location not set yet' : 'House number is required');
  if (!cartOk) validationErrors.push('Cart is empty');

  // ---- Submit ----
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    const geoLocation = formData.location
      ? { type: 'Point', coordinates: [Number(formData.location.lng), Number(formData.location.lat)] }
      : { type: 'Point', coordinates: [3.3792, 6.5244] };

    const orderPayload = {
      items: cartItems.map((item) => ({
        foodId: item._id,
        quantity: item.quantity,
        name: item.name,
        price: item.price,
      })),
      customerName: formData.name,
      phone: formData.phone,
      houseNumber: usedCurrentLocation ? '' : formData.houseNumber,
      street: formData.street,
      landmark: formData.landmark,
      specialNotes: formData.notes,
      location: geoLocation,
      subtotal,
      deliveryFee,
      tax,
      total,
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || `Failed to submit order (status ${response.status}).`);

      setSuccess(true);
      setFormData({
        name: '',
        phone: '',
        houseNumber: '',
        street: '',
        landmark: '',
        notes: '',
        location: null,
      });
      dispatch(clearCart());
      router.push('/payment');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Map preview ----
  const mapSrc =
    formData.location
      ? `https://www.google.com/maps?q=${formData.location.lat},${formData.location.lng}&z=16&output=embed`
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      <NavbarDark />

      <div className="max-w-5xl mx-auto px-4 py-24">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
            Exact Delivery Location
          </h1>
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure checkout</span>
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            Order submitted successfully! Thank you.
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 text-rose-800 border border-rose-200">
            {error}
          </div>
        )}

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Card */}
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="bg-white/80 backdrop-blur rounded-2xl shadow border border-gray-200 p-6 md:p-8"
            >
              {/* Customer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${!nameOk ? 'border-rose-400 bg-rose-50' : 'bg-gray-50'}`}>
                  <User className="w-4 h-4 text-gray-500" />
                  <input
                    name="name"
                    placeholder="Enter Your Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full bg-transparent outline-none"
                    disabled={loading}
                  />
                </label>

                <label className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${!phoneOk ? 'border-rose-400 bg-rose-50' : 'bg-gray-50'}`}>
                  <Phone className="w-4 h-4 text-gray-500" />
                  <input
                    name="phone"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full bg-transparent outline-none"
                    disabled={loading}
                  />
                </label>
              </div>

              {/* Use current location (FIRST) */}
              <div className="mt-5">
                {!usedCurrentLocation ? (
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow hover:opacity-95 active:scale-[0.98] transition"
                    disabled={loading || usingLocation}
                  >
                    {usingLocation ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Locating you…
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4" />
                        Use Current Location
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm font-semibold">Using your current location</span>
                    </div>
                    <button
                      type="button"
                      onClick={enableManualEntry}
                      className="px-4 py-2 rounded-xl font-medium text-gray-700 bg-gray-100 border hover:bg-white active:scale-[0.98] transition"
                      disabled={loading}
                    >
                      Enter address manually
                    </button>
                  </div>
                )}
              </div>

              {/* Address (House + Street) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                <label className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${!houseOk ? 'border-rose-400 bg-rose-50' : 'bg-gray-50'} ${usedCurrentLocation ? 'opacity-75' : ''}`}>
                  <HomeIcon className="w-4 h-4 text-gray-500" />
                  <input
                    name="houseNumber"
                    placeholder="House Number (e.g., 23A)"
                    value={formData.houseNumber}
                    onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
                    required={!usedCurrentLocation}
                    className="w-full bg-transparent outline-none"
                    disabled={loading || usedCurrentLocation}
                  />
                </label>

                <div className="relative" ref={suggestionBoxRef}>
                  <label className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${!streetOk ? 'border-rose-400 bg-rose-50' : 'bg-gray-50'} ${usedCurrentLocation ? 'opacity-75' : ''}`}>
                    <Landmark className="w-4 h-4 text-gray-500" />
                    <input
                      name="street"
                      placeholder="Street (e.g., Bode Thomas Street)"
                      value={formData.street}
                      onChange={handleStreetChange}
                      onBlur={handleStreetBlur}
                      required
                      className="w-full bg-transparent outline-none"
                      disabled={loading || usedCurrentLocation}
                    />
                  </label>

                  {/* Suggestions */}
                  {!usedCurrentLocation && suggestions.length > 0 && (
                    <ul className="absolute left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 max-h-60 overflow-auto z-50 shadow">
                      {suggestions.map((s) => (
                        <li
                          key={s.place_id || s.description}
                          onClick={() => handleSuggestionClick(s)}
                          className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                        >
                          {s.description}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Optional fields */}
              <div className="mt-4 grid grid-cols-1 gap-4">
                <label className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border">
                  <Landmark className="w-4 h-4 text-gray-500" />
                  <input
                    name="landmark"
                    placeholder="Landmark (optional)"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    className="w-full bg-transparent outline-none"
                    disabled={loading}
                  />
                </label>

                <label className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2 border">
                  <NotebookText className="mt-1 w-4 h-4 text-gray-500" />
                  <textarea
                    name="notes"
                    placeholder="Extra Delivery Instructions (optional)"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-transparent outline-none min-h-[90px]"
                    disabled={loading}
                  />
                </label>
              </div>

              {/* Map preview */}
              {mapSrc && (
                <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 shadow">
                  <iframe
                    title="Map preview"
                    src={mapSrc}
                    className="w-full h-64"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}

              {/* Validation errors */}
              {!isFormValid && !loading && (
                <ul className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-1">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                </ul>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!isFormValid || loading}
                className={`mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-white shadow transition
                  ${isFormValid && !loading ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-95 active:scale-[0.98]' : 'bg-gray-400 cursor-not-allowed'}
                `}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit Order'
                )}
              </button>
            </form>
          </div>

          {/* Summary Card */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur rounded-2xl shadow border border-gray-200 p-6 md:p-8 sticky top-28">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span>₦{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Delivery Fee</span>
                  <span>₦{deliveryFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Tax (2%)</span>
                  <span>₦{tax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-extrabold text-lg text-gray-900">
                  <span>Total</span>
                  <span>₦{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Small reassurance block */}
              <div className="mt-6 flex items-center gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Your personal details are safe and only used for delivery.</span>
              </div>

              {/* Shortcut Buttons */}
              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/cart')}
                  className="px-3 py-2 rounded-xl bg-white border text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition"
                >
                  Back to Cart
                </button>
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="px-3 py-2 rounded-xl bg-gray-900 text-white hover:opacity-95 active:scale-[0.98] transition"
                >
                  Edit Details
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CheckoutPage;
