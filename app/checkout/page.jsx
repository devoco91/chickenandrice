// app/checkout/page.jsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import NavbarDark from '../components/Navbar/NavbarDark';
import { setOrderDetails } from '../store/orderSlice';
import {
  MapPin, Navigation, Loader2, Phone, User, Home as HomeIcon,
  Landmark, NotebookText, ShieldCheck, RotateCcw
} from 'lucide-react';

// Shop: 139 Iju Ishaga Rd, Iju, Lagos (approx coordinates)
const SHOP = { lat: 6.63656, lng: 3.323821 };
const RATE_PER_KM = 300; // ₦/km

// Haversine fallback
const rad = (d) => (d * Math.PI) / 180;
const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Multi-fix high accuracy
async function getBestPosition({ targetAcc = 15, acceptAcc = 80, minFixes = 3, hardTimeoutMs = 25000 } = {}) {
  if (!navigator.geolocation) throw new Error('Geolocation not supported');
  const opts = { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 };

  const best = await new Promise((resolve) => {
    let bestFix = null, fixes = 0;
    const clear = (id) => id != null && navigator.geolocation.clearWatch(id);
    const timer = setTimeout(() => { clear(wid); resolve(bestFix); }, hardTimeoutMs);
    const ok = (pos) => {
      const acc = pos?.coords?.accuracy ?? 9999;
      if (acc > 300) return; // drop very poor fixes
      fixes++;
      if (!bestFix || acc < bestFix.coords.accuracy) bestFix = pos;
      if (acc <= targetAcc && fixes >= minFixes) { clearTimeout(timer); clear(wid); resolve(bestFix); }
    };
    const wid = navigator.geolocation.watchPosition(ok, () => {}, opts);
  });

  if (best && best.coords?.accuracy <= targetAcc) return best;
  if (best && best.coords?.accuracy <= acceptAcc) return best;

  const oneShot = await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), opts);
  });
  if (oneShot && oneShot.coords?.accuracy <= acceptAcc) return oneShot;

  if (best) return best;
  throw new Error('NO_FIX');
}

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const cartItems = useSelector((s) => s.cart.cartItem || []);

  const [formData, setFormData] = useState({
    name: '', phone: '', houseNumber: '', street: '', landmark: '', notes: '',
    location: null, // {lat,lng}
  });
  const [usingLocation, setUsingLocation] = useState(false);
  const [usedCurrentLocation, setUsedCurrentLocation] = useState(false);
  const [geoStatus, setGeoStatus] = useState({ text: '', accuracy: null, permission: 'prompt' });

  const autoServiceRef = useRef(null);
  const suggestionBoxRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchBoxRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);

  // Google Maps loader (places + geometry)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const init = () => {
      if (window.google?.maps?.places && !autoServiceRef.current) {
        autoServiceRef.current = new window.google.maps.places.AutocompleteService();
      }
    };
    if (window.google?.maps?.places) { init(); return; }
    const existing = document.querySelector('script[data-gmaps="true"],script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing) { existing.addEventListener('load', init); return () => existing.removeEventListener('load', init); }
    if (window.__GMAPS_LOADING__) {
      const onReady = () => init();
      window.addEventListener('__gmaps_ready__', onReady);
      return () => window.removeEventListener('__gmaps_ready__', onReady);
    }
    window.__GMAPS_LOADING__ = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
    script.async = true; script.defer = true; script.setAttribute('data-gmaps', 'true');
    script.onload = () => { window.__GMAPS_LOADING__ = false; window.dispatchEvent(new Event('__gmaps_ready__')); init(); };
    document.head.appendChild(script);
    return () => { script.onload = null; };
  }, []);

  // permission info (optional)
  useEffect(() => {
    (async () => {
      try {
        if (!navigator.permissions) return;
        const p = await navigator.permissions.query({ name: 'geolocation' });
        setGeoStatus((g) => ({ ...g, permission: p.state }));
        p.onchange = () => setGeoStatus((g) => ({ ...g, permission: p.state }));
      } catch {}
    })();
  }, []);

  // close suggestions
  useEffect(() => {
    const onDoc = (e) => {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(e.target)) setSuggestions([]);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // manual address autocomplete
  const handleStreetChange = (e) => {
    const value = e.target.value;
    setFormData((p) => ({ ...p, street: value }));
    if (usedCurrentLocation) return;
    if (value.length > 2 && autoServiceRef.current && window.google?.maps?.places) {
      autoServiceRef.current.getPlacePredictions(
        { input: value, componentRestrictions: { country: 'NG' } },
        (preds, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) setSuggestions(preds || []);
          else setSuggestions([]);
        }
      );
    } else setSuggestions([]);
  };

  const handleStreetBlur = () => {
    if (usedCurrentLocation) return;
    if (formData.street && !formData.location && window.google?.maps) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: formData.street }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location;
          setFormData((p) => ({ ...p, street: results[0].formatted_address, location: { lat: loc.lat(), lng: loc.lng() } }));
        }
      });
    }
  };

  const handleSuggestionClick = (prediction) => {
    if (usedCurrentLocation) return;
    const places = new window.google.maps.places.PlacesService(document.createElement('div'));
    places.getDetails({ placeId: prediction.place_id, fields: ['formatted_address','geometry'] }, (place, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        const loc = place.geometry.location;
        setFormData((p) => ({ ...p, street: place.formatted_address, location: { lat: loc.lat(), lng: loc.lng() } }));
        setSuggestions([]);
      }
    });
  };

  // Locate
  const tryLocate = async () => {
    setUsingLocation(true);
    setGeoStatus((g) => ({ ...g, text: 'Getting precise location…', accuracy: null }));
    try {
      const pos = await getBestPosition({ targetAcc: 15, acceptAcc: 80, minFixes: 3, hardTimeoutMs: 25000 });
      const { latitude, longitude, accuracy } = pos.coords;
      setGeoStatus((g) => ({ ...g, text: `Location acquired (±${Math.round(accuracy)}m).`, accuracy }));

      const apply = (formatted) => {
        setFormData((p) => ({
          ...p,
          street: formatted || p.street || 'Using current location',
          houseNumber: '',
          location: { lat: latitude, lng: longitude },
        }));
        setUsedCurrentLocation(true);
        setSuggestions([]);
      };
      if (window.google?.maps) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
          if (status === 'OK' && results?.[0]) apply(results[0].formatted_address);
          else apply(null);
        });
      } else apply(null);
    } catch {
      setGeoStatus((g) => ({ ...g, text: 'Could not get a precise fix. Use search or drop the pin manually.', accuracy: null }));
    } finally {
      setUsingLocation(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setGeoStatus({ text: 'Geolocation not supported by this device.', accuracy: null, permission: geoStatus.permission });
      return;
    }
    await tryLocate();
  };

  // Map + SearchBox + Marker
  useEffect(() => {
    if (!window.google?.maps) return;
    const centerLatLng = formData.location
      ? new window.google.maps.LatLng(formData.location.lat, formData.location.lng)
      : new window.google.maps.LatLng(SHOP.lat, SHOP.lng);

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: centerLatLng,
        zoom: formData.location ? 17 : 13,
        mapTypeControl: false,
        streetViewControl: false,
      });

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Search address or place…';
      input.className = 'gm-searchbox-input';
      input.style.cssText = 'box-sizing:border-box;border:1px solid #ccc;border-radius:8px;padding:8px 12px;margin:12px;min-width:260px;';
      searchInputRef.current = input;
      mapInstanceRef.current.controls[window.google.maps.ControlPosition.TOP_LEFT].push(input);
      searchBoxRef.current = new window.google.maps.places.SearchBox(input);
      searchBoxRef.current.addListener('places_changed', () => {
        const places = searchBoxRef.current.getPlaces() || [];
        if (!places.length) return;
        const place = places[0];
        const loc = place.geometry?.location;
        if (!loc) return;
        const newLatLng = { lat: loc.lat(), lng: loc.lng() };
        setFormData((prev) => ({ ...prev, street: place.formatted_address || place.name, location: newLatLng }));
      });

      markerRef.current = new window.google.maps.Marker({
        position: centerLatLng,
        map: mapInstanceRef.current,
        draggable: true,
      });

      markerRef.current.addListener('dragend', () => {
        const p = markerRef.current.getPosition();
        const newLatLng = { lat: p.lat(), lng: p.lng() };
        setFormData((prev) => ({ ...prev, location: newLatLng }));
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: newLatLng }, (results, status) => {
          if (status === 'OK' && results?.[0]) {
            setFormData((prev) => ({ ...prev, street: results[0].formatted_address }));
          }
        });
      });

      mapInstanceRef.current.addListener('click', (e) => {
        const newLatLng = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        markerRef.current.setPosition(e.latLng);
        setFormData((prev) => ({ ...prev, location: newLatLng }));
      });
    } else {
      mapInstanceRef.current.setCenter(centerLatLng);
      markerRef.current.setPosition(centerLatLng);
    }
  }, [formData.location]);

  const enableManualEntry = () => {
    setUsedCurrentLocation(false);
    setFormData((p) => ({ ...p, houseNumber: '', street: '', location: null }));
    setSuggestions([]);
  };

  // Validation
  const nameOk = formData.name.trim() !== '';
  const phoneOk = formData.phone.trim() !== '';
  const streetOk = formData.street.trim() !== '';
  const houseOk = usedCurrentLocation ? true : formData.houseNumber.trim() !== '';
  const cartOk = (cartItems || []).length > 0;
  const isFormValid = nameOk && phoneOk && streetOk && houseOk && cartOk;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Save & back to cart (sets addressSaved=true)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    if (!formData.location) { setError('Please set your exact map pin or select a place.'); return; }

    setLoading(true); setError(null);
    try {
      const customer = { lat: +formData.location.lat, lng: +formData.location.lng };

      // Prefer Google geometry; fallback to haversine
      let distanceKm = haversineKm(SHOP, customer);
      if (window.google?.maps?.geometry?.spherical) {
        const meters = window.google.maps.geometry.spherical.computeDistanceBetween(
          new window.google.maps.LatLng(SHOP.lat, SHOP.lng),
          new window.google.maps.LatLng(customer.lat, customer.lng)
        );
        if (meters > 0) distanceKm = meters / 1000;
      }

      const deliveryDistanceKm = Math.ceil(distanceKm);
      const deliveryFee = deliveryDistanceKm * RATE_PER_KM;

      dispatch(setOrderDetails({
        deliveryMethod: 'delivery',
        customerName: formData.name,
        phone: formData.phone,
        houseNumber: usedCurrentLocation ? '' : formData.houseNumber,
        street: formData.street,
        landmark: formData.landmark,
        specialNotes: formData.notes,
        location: { type: 'Point', coordinates: [customer.lng, customer.lat] },
        deliveryDistanceKm,
        deliveryFee,
        addressSaved: true, // <- gate for cart CTAs
      }));
      router.push('/cart');
    } catch {
      setError('Failed to compute delivery fee. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const mapIframeSrc = formData.location
    ? `https://www.google.com/maps?q=${formData.location.lat},${formData.location.lng}&z=16&output=embed`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      <NavbarDark />
      <div className="max-w-5xl mx-auto px-4 py-24">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">Exact Delivery Location</h1>
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
            <ShieldCheck className="w-4 h-4" /><span>Secure checkout</span>
          </div>
        </div>

        {(geoStatus.text || usingLocation) && (
          <div className="mb-4 p-3 rounded-xl border border-blue-200 bg-blue-50 text-sm text-blue-900">
            {usingLocation ? 'Locating… ' : null}{geoStatus.text}
            {geoStatus.accuracy != null && <> (±{Math.round(geoStatus.accuracy)}m)</>}
            {geoStatus.permission === 'denied' && (
              <div className="mt-1 text-xs text-blue-800">
                Location permission is blocked. Enable “Precise Location” then retry.
              </div>
            )}
          </div>
        )}

        {error && <div className="mb-6 p-4 rounded-xl bg-rose-50 text-rose-800 border border-rose-200">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur rounded-2xl shadow border border-gray-200 p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${!nameOk ? 'border-rose-400 bg-rose-50' : 'bg-gray-50'}`}>
                  <User className="w-4 h-4 text-gray-500" />
                  <input value={formData.name} onChange={(e)=>setFormData({...formData,name:e.target.value})} placeholder="Enter Your Name" required className="w-full bg-transparent outline-none" disabled={loading} />
                </label>
                <label className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${!phoneOk ? 'border-rose-400 bg-rose-50' : 'bg-gray-50'}`}>
                  <Phone className="w-4 h-4 text-gray-500" />
                  <input value={formData.phone} onChange={(e)=>setFormData({...formData,phone:e.target.value})} placeholder="Phone Number" required className="w-full bg-transparent outline-none" disabled={loading} />
                </label>
              </div>

              {/* Locate */}
              <div className="mt-5 flex flex-col gap-3">
                <div className="flex gap-2">
                  {!usedCurrentLocation ? (
                    <button type="button" onClick={handleUseCurrentLocation}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow hover:opacity-95 active:scale-[0.98] transition"
                      disabled={loading || usingLocation}>
                      {usingLocation ? (<><Loader2 className="w-4 h-4 animate-spin" /> Getting precise location…</>) : (<><Navigation className="w-4 h-4" /> Use Current Location</>)}
                    </button>
                  ) : (
                    <>
                      <div className="flex-1 flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 rounded-xl">
                        <MapPin className="w-4 h-4" /><span className="text-sm font-semibold">Location set — fine-tune pin on map</span>
                      </div>
                      <button type="button" onClick={tryLocate}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white hover:bg-gray-50">
                        <RotateCcw className="w-4 h-4" /> Try again
                      </button>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-600">Tip: enable GPS + Wi-Fi; step outside for best accuracy.</div>
              </div>

              {/* Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                <label className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${!houseOk ? 'border-rose-400 bg-rose-50' : 'bg-gray-50'} ${usedCurrentLocation ? 'opacity-75' : ''}`}>
                  <HomeIcon className="w-4 h-4 text-gray-500" />
                  <input value={formData.houseNumber} onChange={(e)=>setFormData({...formData,houseNumber:e.target.value})}
                    placeholder="House Number (e.g., 23A)" required={!usedCurrentLocation}
                    className="w-full bg-transparent outline-none" disabled={loading || usedCurrentLocation} />
                </label>

                <div className="relative" ref={suggestionBoxRef}>
                  <label className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${!streetOk ? 'border-rose-400 bg-rose-50' : 'bg-gray-50'} ${usedCurrentLocation ? 'opacity-75' : ''}`}>
                    <Landmark className="w-4 h-4 text-gray-500" />
                    <input value={formData.street} onChange={handleStreetChange} onBlur={handleStreetBlur}
                      placeholder="Street (e.g., Bode Thomas Street)" required
                      className="w-full bg-transparent outline-none" disabled={loading || usedCurrentLocation} />
                  </label>

                  {!usedCurrentLocation && suggestions.length > 0 && (
                    <ul className="absolute left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 max-h-60 overflow-auto z-50 shadow">
                      {suggestions.map((s) => (
                        <li key={s.place_id || s.description} onClick={()=>handleSuggestionClick(s)}
                          className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">{s.description}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4">
                <label className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border">
                  <Landmark className="w-4 h-4 text-gray-500" />
                  <input value={formData.landmark} onChange={(e)=>setFormData({...formData,landmark:e.target.value})}
                    placeholder="Landmark (optional)" className="w-full bg-transparent outline-none" disabled={loading} />
                </label>

                <label className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2 border">
                  <NotebookText className="mt-1 w-4 h-4 text-gray-500" />
                  <textarea value={formData.notes} onChange={(e)=>setFormData({...formData,notes:e.target.value})}
                    placeholder="Extra Delivery Instructions (optional)" className="w-full bg-transparent outline-none min-h-[90px]" disabled={loading} />
                </label>
              </div>

              {/* Map */}
              <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 shadow">
                <div ref={mapRef} className="w-full h-72" />
              </div>

              {mapIframeSrc && (
                <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200">
                  <iframe title="Map preview" src={mapIframeSrc} className="w-full h-52" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                </div>
              )}

              {usedCurrentLocation && (
                <div className="mt-3">
                  <button type="button" onClick={enableManualEntry}
                    className="px-4 py-2 rounded-xl font-medium text-gray-700 bg-gray-100 border hover:bg-white active:scale-[0.98] transition" disabled={loading}>
                    Enter address manually
                  </button>
                </div>
              )}

              <button type="submit" disabled={!isFormValid || loading}
                className={`mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-white shadow transition ${isFormValid && !loading ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-95 active:scale-[0.98]' : 'bg-gray-400 cursor-not-allowed'}`}>
                {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>) : ('Save & Return to Cart')}
              </button>
            </form>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur rounded-2xl shadow border border-gray-200 p-6 md:p-8 sticky top-28">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Heads up</h2>
              <p className="text-sm text-gray-700">Delivery fee is calculated on the Cart page based on distance.</p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <button type="button" onClick={()=>router.push('/cart')}
                  className="px-3 py-2 rounded-xl bg-white border text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition">
                  Back to Cart
                </button>
                <button type="button" onClick={()=>window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="px-3 py-2 rounded-xl bg-gray-900 text-white hover:opacity-95 active:scale-[0.98] transition">
                  Edit Details
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
