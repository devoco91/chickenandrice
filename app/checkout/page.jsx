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

/** Config */
const SHOP = { lat: 6.651608, lng: 3.323317 };
// 6.651608, 3.323317
const RATE_PER_KM = 300;

/** Distance fallback */
const rad = (d) => (d * Math.PI) / 180;
const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Smarter GPS collector: rejects ultra-coarse fixes */
async function getBestPositionSmart({
  targetAcc = 25,
  acceptAcc = 120,
  maxPoorAccAccept = 1000,        // hard cap to avoid 50km “fixes”
  minFixes = 2,
  hardTimeoutMs = 60000,
  dropVeryPoorAfterMs = 15000,
  onUpdate = () => {},
} = {}) {
  if (!('geolocation' in navigator)) throw new Error('GEO_UNSUPPORTED');
  const geo = navigator.geolocation;
  const options = { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 };

  let bestFix = null;
  let fixes = 0;
  let lastErr = null;
  const t0 = Date.now();
  let wid = null;

  const clear = () => { if (wid != null) geo.clearWatch(wid); };

  return new Promise((resolve, reject) => {
    const finishOk = (type, pos) => { clear(); clearTimeout(timer); resolve({ type, pos }); };
    const finishErr = (name) => { clear(); clearTimeout(timer); reject(new Error(name)); };

    const onSuccess = (pos) => {
      const acc = pos?.coords?.accuracy ?? 9999;
      const age = Date.now() - t0;
      const veryPoor = acc > 300;

      if (!bestFix || acc < bestFix.coords.accuracy) bestFix = pos;
      if (!veryPoor) fixes += 1;

      onUpdate({ fixes, acc, bestAcc: bestFix?.coords?.accuracy, veryPoor, age });

      if (acc <= targetAcc && fixes >= minFixes) return finishOk('target', pos);
      if (acc <= acceptAcc && fixes >= minFixes && age > 8000) return finishOk('accept', bestFix);

      // After some time with only poor fixes, accept only if not ultra-coarse
      if (age > dropVeryPoorAfterMs && fixes === 0 && bestFix) {
        const bAcc = bestFix.coords.accuracy ?? 9999;
        if (bAcc <= maxPoorAccAccept) return finishOk('fallback_ok', bestFix);
      }
    };

    const onError = (err) => {
      lastErr = err;
      onUpdate({ error: err });
      if (err?.code === err?.PERMISSION_DENIED) return finishErr('PERMISSION_DENIED');
    };

    geo.getCurrentPosition(onSuccess, onError, { ...options, timeout: 8000 });
    wid = geo.watchPosition(onSuccess, onError, options);

    const timer = setTimeout(() => {
      if (bestFix) {
        const bAcc = bestFix.coords?.accuracy ?? 9999;
        if (bAcc <= maxPoorAccAccept) return finishOk('timeout_ok', bestFix);
        return finishErr('ONLY_VERY_POOR');
      }
      if (lastErr) {
        const e = lastErr;
        if (e.code === e.PERMISSION_DENIED) return finishErr('PERMISSION_DENIED');
        if (e.code === e.POSITION_UNAVAILABLE) return finishErr('POSITION_UNAVAILABLE');
        if (e.code === e.TIMEOUT) return finishErr('TIMEOUT');
      }
      return finishErr('HARD_TIMEOUT');
    }, hardTimeoutMs);
  });
}

function mapGeoErr(err) {
  if (!err || typeof err.code !== 'number') return 'UNKNOWN';
  if (err.code === err.PERMISSION_DENIED) return 'PERMISSION_DENIED';
  if (err.code === err.POSITION_UNAVAILABLE) return 'POSITION_UNAVAILABLE';
  if (err.code === err.TIMEOUT) return 'TIMEOUT';
  return 'UNKNOWN';
}

function toProgressText(info) {
  if (!info) return '';
  if (info.error) {
    const code = mapGeoErr(info.error);
    if (code === 'PERMISSION_DENIED') return 'Location permission denied — enable “Precise Location”.';
    if (code === 'POSITION_UNAVAILABLE') return 'Location unavailable (GPS/Wi-Fi off or blocked).';
    if (code === 'TIMEOUT') return 'Location timed out; still trying…';
    return 'Location error — still trying…';
  }
  const parts = [];
  if (typeof info.bestAcc === 'number') parts.push(`best ±${Math.round(info.bestAcc)}m`);
  parts.push(`${info.fixes} good fix${info.fixes === 1 ? '' : 'es'}`);
  return `Refining… ${parts.join(' · ')}`;
}

/** Parse address_components -> structured */
function parseAddressComponents(components = []) {
  const get = (type) => components.find(c => c.types?.includes(type))?.long_name || '';
  const streetNumber = get('street_number');
  const route = get('route');
  const city = get('locality') || get('administrative_area_level_2') || get('postal_town');
  const state = get('administrative_area_level_1');
  const postal = get('postal_code');
  return {
    houseNumber: streetNumber || '',
    street: route || '',           // keep street clean; no neighborhood here
    city: city || '',
    state: state || '',
    postal: postal || '',
  };
}

/** Geocoder helpers */
const geocodeByLatLng = (gmaps, latLng) =>
  new Promise((resolve, reject) => {
    const geocoder = new gmaps.Geocoder();
    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status === 'OK' && results?.length) resolve(results);
      else reject(new Error(status || 'GEOCODER_ERROR'));
    });
  });

const getPlaceDetails = (gmaps, placeId) =>
  new Promise((resolve, reject) => {
    const svc = new gmaps.places.PlacesService(document.createElement('div'));
    svc.getDetails(
      { placeId, fields: ['formatted_address', 'geometry', 'address_components', 'name'] },
      (place, status) => {
        if (status === gmaps.places.PlacesServiceStatus.OK && place) resolve(place);
        else reject(new Error(status || 'PLACES_DETAILS_ERROR'));
      }
    );
  });

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const cartItems = useSelector((s) => s.cart.cartItem || []);

  const [formData, setFormData] = useState({
    name: '', phone: '', houseNumber: '', street: '', landmark: '', notes: '',
    location: null, city: '', state: '', postal: '',
  });
  const [usingLocation, setUsingLocation] = useState(false);
  const [usedCurrentLocation, setUsedCurrentLocation] = useState(false);
  const [geoStatus, setGeoStatus] = useState({ text: '', accuracy: null, permission: 'prompt' });

  const [suggestions, setSuggestions] = useState([]);
  const [mapsReady, setMapsReady] = useState(false);

  const autoServiceRef = useRef(null);
  const suggestionBoxRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchBoxRef = useRef(null);
  const lastBestAccRef = useRef(null);

  /** Load Google Maps */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onReady = () => {
      if (window.google?.maps) {
        setMapsReady(true);
        if (window.google.maps.places && !autoServiceRef.current) {
          autoServiceRef.current = new window.google.maps.places.AutocompleteService();
        }
      }
    };
    if (window.google?.maps) { onReady(); return; }
    const existing = document.querySelector('script[data-gmaps="true"],script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing) { existing.addEventListener('load', onReady); return () => existing.removeEventListener('load', onReady); }
    if (window.__GMAPS_LOADING__) { window.addEventListener('__gmaps_ready__', onReady); return () => window.removeEventListener('__gmaps_ready__', onReady); }
    window.__GMAPS_LOADING__ = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
    script.async = true; script.defer = true; script.setAttribute('data-gmaps', 'true');
    script.onload = () => { window.__GMAPS_LOADING__ = false; window.dispatchEvent(new Event('__gmaps_ready__')); onReady(); };
    document.head.appendChild(script);
    return () => { script.onload = null; };
  }, []);

  /** Permissions info */
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

  /** Close suggestions */
  useEffect(() => {
    const onDoc = (e) => {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(e.target)) setSuggestions([]);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  /** Autocomplete typing */
  const handleStreetChange = (e) => {
    const value = e.target.value;
    setFormData((p) => ({ ...p, street: value }));
    if (usedCurrentLocation) return;
    if (value.length > 2 && autoServiceRef.current && window.google?.maps?.places) {
      const bounds = mapInstanceRef.current?.getBounds?.();
      autoServiceRef.current.getPlacePredictions(
        { input: value, componentRestrictions: { country: 'NG' }, bounds },
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
          const res = results[0];
          const loc = res.geometry.location;
          const parts = parseAddressComponents(res.address_components);
          setFormData((p) => ({
            ...p,
            houseNumber: parts.houseNumber || p.houseNumber,
            street: res.formatted_address || parts.street || p.street,
            city: parts.city || p.city,
            state: parts.state || p.state,
            postal: parts.postal || p.postal,
            location: { lat: loc.lat(), lng: loc.lng() },
          }));
        }
      });
    }
  };

  const handleSuggestionClick = async (prediction) => {
    if (usedCurrentLocation) return;
    if (!window.google?.maps) return;
    try {
      const place = await getPlaceDetails(window.google.maps, prediction.place_id);
      const loc = place.geometry.location;
      const parts = parseAddressComponents(place.address_components || []);
      setFormData((p) => ({
        ...p,
        houseNumber: parts.houseNumber || p.houseNumber,
        street: place.formatted_address || place.name || parts.street || p.street,
        city: parts.city || p.city,
        state: parts.state || p.state,
        postal: parts.postal || p.postal,
        location: { lat: loc.lat(), lng: loc.lng() },
      }));
      setSuggestions([]);
    } catch {
      setSuggestions([]);
    }
  };

  /** Apply preferred geocoder result */
  const applyGeocodeResult = (res, { lat, lng } = {}) => {
    if (!res) return;
    const preferred = ['street_address', 'premise', 'subpremise', 'route'];
    const pick = res.find(r => (r.types || []).some(t => preferred.includes(t))) || res[0];
    const parts = parseAddressComponents(pick.address_components || []);
    setFormData((p) => ({
      ...p,
      houseNumber: parts.houseNumber || p.houseNumber,
      street: pick.formatted_address || parts.street || p.street,
      city: parts.city || p.city,
      state: parts.state || p.state,
      postal: parts.postal || p.postal,
      location: { lat, lng },
    }));
  };

  /** High-accuracy locate; reject ultra-coarse */
  const tryLocate = async () => {
    setUsingLocation(true);
    lastBestAccRef.current = null;
    setGeoStatus((g) => ({ ...g, text: 'Getting precise location…', accuracy: null }));
    try {
      const { type, pos } = await getBestPositionSmart({
        targetAcc: 25,
        acceptAcc: 120,
        maxPoorAccAccept: 1000,
        minFixes: 2,
        hardTimeoutMs: 60000,
        onUpdate: (info) => {
          lastBestAccRef.current = typeof info?.bestAcc === 'number' ? info.bestAcc : lastBestAccRef.current;
          const text = toProgressText(info);
          const acc = (typeof info?.bestAcc === 'number') ? info.bestAcc : null;
          setGeoStatus((g) => ({ ...g, text: text || g.text, accuracy: acc ?? g.accuracy }));
        },
      });

      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      setGeoStatus((g) => ({ ...g, text: `Location acquired (${type}, ±${Math.round(accuracy)}m).`, accuracy }));

      // Only accept as “current location” when accuracy is acceptable
      if (accuracy > 1000) {
        setGeoStatus((g) => ({ ...g, text: 'Very coarse location (±>1000m). Use search or move to improve signal.', accuracy }));
        return;
      }

      setUsedCurrentLocation(true);
      setSuggestions([]);
      if (window.google?.maps) {
        try {
          const res = await geocodeByLatLng(window.google.maps, { lat, lng });
          applyGeocodeResult(res, { lat, lng });
        } catch {
          setFormData((p) => ({ ...p, street: p.street || 'Using current location', location: { lat, lng } }));
        }
      } else {
        setFormData((p) => ({ ...p, street: p.street || 'Using current location', location: { lat, lng } }));
      }
    } catch (e) {
      const code = e?.message || 'UNKNOWN';
      const best = lastBestAccRef.current;
      const maybe = typeof best === 'number' ? ` (best seen ±${Math.round(best)}m)` : '';
      const hint =
        code === 'ONLY_VERY_POOR' ? `Device returned only very coarse location${maybe}. Turn on Precise Location / High accuracy and try again.` :
        code === 'PERMISSION_DENIED' ? 'Location permission denied. Enable it and turn on “Precise Location”.' :
        code === 'POSITION_UNAVAILABLE' ? 'Location unavailable. Turn on GPS + Wi-Fi scanning and move near a window/outdoors.' :
        code === 'TIMEOUT' ? `Timed out${maybe}. Keep the screen on and try again.` :
        code === 'GEO_UNSUPPORTED' ? 'This device/browser does not support geolocation.' :
        'Could not get a precise fix. Use search or drop the pin manually.';
      setGeoStatus((g) => ({ ...g, text: hint, accuracy: best ?? null }));
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

  /** Map + SearchBox + Marker + Accuracy circle */
  useEffect(() => {
    if (!mapsReady || !window.google?.maps) return;

    const centerLatLng = formData.location
      ? new window.google.maps.LatLng(formData.location.lat, formData.location.lng)
      : new window.google.maps.LatLng(SHOP.lat, SHOP.lng);

    if (!mapInstanceRef.current) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: centerLatLng,
        zoom: formData.location ? 17 : 13,
        mapTypeControl: false,
        streetViewControl: false,
      });
      mapInstanceRef.current = map;

      // Search box (bounds-biased)
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Search address or place…';
      input.className = 'gm-searchbox-input';
      input.style.cssText = 'box-sizing:border-box;border:1px solid #ccc;border-radius:8px;padding:8px 12px;margin:12px;min-width:260px;';
      searchInputRef.current = input;
      map.controls[window.google.maps.ControlPosition.TOP_LEFT].push(input);
      const sb = new window.google.maps.places.SearchBox(input);
      searchBoxRef.current = sb;

      sb.addListener('places_changed', async () => {
        const places = sb.getPlaces() || [];
        if (!places.length) return;
        const place = places[0];
        const loc = place.geometry?.location;
        if (!loc) return;
        const newLatLng = { lat: loc.lat(), lng: loc.lng() };
        try {
          if (place.place_id) {
            const details = await getPlaceDetails(window.google.maps, place.place_id);
            const parts = parseAddressComponents(details.address_components || []);
            setFormData((prev) => ({
              ...prev,
              houseNumber: parts.houseNumber || prev.houseNumber,
              street: details.formatted_address || place.name || parts.street || prev.street,
              city: parts.city || prev.city,
              state: parts.state || prev.state,
              postal: parts.postal || prev.postal,
              location: newLatLng,
            }));
          } else {
            setFormData((prev) => ({
              ...prev,
              street: place.formatted_address || place.name || prev.street,
              location: newLatLng,
            }));
          }
        } catch {
          setFormData((prev) => ({ ...prev, street: place.formatted_address || place.name, location: newLatLng }));
        }
      });

      map.addListener('bounds_changed', () => {
        try { searchBoxRef.current?.setBounds(map.getBounds()); } catch {}
      });

      // Draggable marker
      const marker = new window.google.maps.Marker({
        position: centerLatLng,
        map,
        draggable: true,
      });
      markerRef.current = marker;

      marker.addListener('dragend', async () => {
        const p = marker.getPosition();
        const newLatLng = { lat: p.lat(), lng: p.lng() };
        setFormData((prev) => ({ ...prev, location: newLatLng }));
        try {
          const res = await geocodeByLatLng(window.google.maps, newLatLng);
          applyGeocodeResult(res, { lat: newLatLng.lat, lng: newLatLng.lng });
        } catch {}
      });

      map.addListener('click', async (e) => {
        const newLatLng = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        marker.setPosition(e.latLng);
        setFormData((prev) => ({ ...prev, location: newLatLng }));
        try {
          const res = await geocodeByLatLng(window.google.maps, newLatLng);
          applyGeocodeResult(res, { lat: newLatLng.lat, lng: newLatLng.lng });
        } catch {}
      });
    } else {
      mapInstanceRef.current.setCenter(centerLatLng);
      markerRef.current.setPosition(centerLatLng);
      if (formData.location) mapInstanceRef.current.setZoom(17);
    }
  }, [mapsReady, formData.location]);

  /** Accuracy circle */
  useEffect(() => {
    if (!mapsReady || !window.google?.maps || !mapInstanceRef.current) return;
    const acc = geoStatus.accuracy;
    if (!formData.location || !acc) {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setMap(null);
        accuracyCircleRef.current = null;
      }
      return;
    }
    const map = mapInstanceRef.current;
    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = new window.google.maps.Circle({
        map,
        center: new window.google.maps.LatLng(formData.location.lat, formData.location.lng),
        radius: Math.max(10, Math.min(acc, 1000)), // cap visual to 1km
        strokeOpacity: 0.4,
        strokeWeight: 1,
        fillOpacity: 0.1,
      });
    } else {
      accuracyCircleRef.current.setCenter(new window.google.maps.LatLng(formData.location.lat, formData.location.lng));
      accuracyCircleRef.current.setRadius(Math.max(10, Math.min(acc, 1000)));
      accuracyCircleRef.current.setMap(map);
    }
  }, [mapsReady, geoStatus.accuracy, formData.location]);

  const enableManualEntry = () => {
    setUsedCurrentLocation(false);
    setFormData((p) => ({ ...p, houseNumber: '', street: '', city: '', state: '', postal: '', location: null }));
    setSuggestions([]);
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setMap(null);
      accuracyCircleRef.current = null;
    }
  };

  /** Validation */
  const nameOk = formData.name.trim() !== '';
  const phoneOk = formData.phone.trim() !== '';
  const streetOk = formData.street.trim() !== '';
  const houseOk = usedCurrentLocation ? true : formData.houseNumber.trim() !== '';
  const cartOk = (cartItems || []).length > 0;
  const isFormValid = nameOk && phoneOk && streetOk && houseOk && cartOk;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /** Submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    if (!formData.location) { setError('Please set your exact map pin or select a place.'); return; }

    setLoading(true); setError(null);
    try {
      const customer = { lat: +formData.location.lat, lng: +formData.location.lng };

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
        houseNumber: usedCurrentLocation ? (formData.houseNumber || '') : formData.houseNumber,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        postal: formData.postal,
        landmark: formData.landmark,
        specialNotes: formData.notes,
        location: { type: 'Point', coordinates: [customer.lng, customer.lat] },
        deliveryDistanceKm,
        deliveryFee,
        addressSaved: true,
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
                Enable “Precise Location” then retry. Wi-Fi **helps** accuracy but isn’t required.
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
                <div className="text-xs text-gray-600">
                  Tip: turn on **Precise/High accuracy**. Wi-Fi helps accuracy but is not required.
                </div>
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

              {/* Auto-filled (read-only) */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={formData.city} className="bg-gray-50 rounded-xl px-3 py-2 border outline-none" placeholder="City" disabled />
                <input value={formData.state} className="bg-gray-50 rounded-xl px-3 py-2 border outline-none" placeholder="State" disabled />
                <input value={formData.postal} className="bg-gray-50 rounded-xl px-3 py-2 border outline-none" placeholder="Postal code" disabled />
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
