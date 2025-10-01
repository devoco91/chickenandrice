// app/components/CartPage.jsx
'use client';
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Minus, Plus, Trash2, Star, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import NavbarDark from '../Navbar/NavbarDark';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import {
  incrementQuantity, decrementQuantity, removeItemCart, addItemCart,
} from './../../store/cartSlice';
import { setOrderDetails } from './../../store/orderSlice';

const RAW_API = process.env.NEXT_PUBLIC_API_URL || '';
const UPLOADS_BASE =
  process.env.NEXT_PUBLIC_BACKEND_UPLOADS_BASE ||
  (RAW_API ? RAW_API.replace(/\/api$/, '') + '/uploads' : '/uploads');

const PACK_PRICE = 200;

const getImageUrl = (val) => {
  let s = val;
  if (!s) return '/placeholder.png';
  if (typeof s !== 'string') {
    try {
      if (Array.isArray(s)) s = s[0] || '';
      else if (typeof s === 'object') s = s.url || s.path || s.filename || s.filepath || '';
    } catch {}
  }
  if (!s) return '/placeholder.png';
  if (/^https?:\/\//i.test(s)) return s;
  const cleaned = String(s).replace(/\\/g, '/').replace(/^\/+/, '').replace(/^uploads\//i, '');
  return `${UPLOADS_BASE}/${encodeURI(cleaned)}`;
};

const DrinksSlider = ({ items, onAdd }) => {
  if (!items?.length) return null;
  return (
    <div className="relative bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Star className="w-7 h-7 text-yellow-500 fill-current" />
          <h2 className="text-2xl font-extrabold text-gray-900">Suggested Drinks 🍹</h2>
        </div>
      </div>

      <button aria-label="Previous" className="drinks-prev absolute z-10 inline-flex items-center justify-center rounded-full border border-red-200 bg-white w-9 h-9 left-2 top-1/2 -translate-y-1/2 hover:bg-red-50 hover:border-red-300 active:scale-95 transition sm:left-auto sm:top-4 sm:-translate-y-0 sm:right-14 sm:w-10 sm:h-10">
        <ChevronLeft className="w-5 h-5 text-red-600" />
      </button>
      <button aria-label="Next" className="drinks-next absolute z-10 inline-flex items-center justify-center rounded-full border border-red-200 bg-white w-9 h-9 right-2 top-1/2 -translate-y-1/2 hover:bg-red-50 hover:border-red-300 active:scale-95 transition sm:right-4 sm:top-4 sm:-translate-y-0 sm:w-10 sm:h-10">
        <ChevronRight className="w-5 h-5 text-red-600" />
      </button>

      <Swiper modules={[Autoplay, Navigation]} autoplay={{ delay: 4500, disableOnInteraction: false }} loop={true}
        navigation={{ prevEl: '.drinks-prev', nextEl: '.drinks-next' }} spaceBetween={16} slidesPerView={1}
        breakpoints={{ 640: { slidesPerView: 2 }, 768: { slidesPerView: 3 }, 1024: { slidesPerView: 3 } }} className="pb-8">
        {items.map((item) => (
          <SwiperSlide key={item._id}>
            <div className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-red-300 hover:shadow-xl transition-all duration-300">
              <div className="relative overflow-hidden">
                {item.image && (
                  <img src={getImageUrl(item.image)} alt={item.name}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => (e.currentTarget.src = '/placeholder.png')} />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500"></div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-base text-gray-900 mb-2 line-clamp-1">{item.name}</h3>
                <p className="text-xl font-extrabold text-red-600 mb-3">₦{item.price.toLocaleString()}</p>
                <button onClick={() => onAdd(item)}
                  className="w-full bg-gradient-to-r from-red-500 to-red-700 text-white py-2.5 px-3 rounded-lg font-semibold hover:opacity-90 transition">
                  Add to Cart
                </button>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default function CartPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const cartItems = useSelector((s) => s.cart.cartItem || []);
  const order = useSelector((s) => s.order || {});
  const [suggestedItems, setSuggestedItems] = useState([]);

  useEffect(() => {
    const fetchSuggestedItems = async () => {
      try {
        const res = await fetch(`/api/drinks`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setSuggestedItems(Array.isArray(data) ? data : []);
      } catch (err) { console.error('Failed to fetch drinks:', err); }
    };
    fetchSuggestedItems();
  }, []);

  // restore any pending product
  useEffect(() => {
    const pending = localStorage.getItem('pendingProduct');
    if (pending) {
      try { dispatch(addItemCart(JSON.parse(pending))); } catch {}
      localStorage.removeItem('pendingProduct');
    }
  }, [dispatch]);

  // Totals
  const itemsSubtotal = cartItems.reduce((t, it) => t + it.price * it.quantity, 0);
  const foodItems = cartItems.filter((it) => !it.isDrink);
  const packCount = foodItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const packagingCost = packCount * PACK_PRICE;

  const deliveryFee = Number(order.deliveryFee || 0);

  // *** TAX = 2% of ITEMS ONLY (NO delivery, NO packaging) ***
  const tax = itemsSubtotal * 0.02;

  const subtotal = itemsSubtotal; // display as items-only
  const total = subtotal + deliveryFee + tax;

  useEffect(() => {
    dispatch(setOrderDetails({
      subtotal, packagingCost, packagingCount: packCount,
      deliveryFee, tax, total,
    }));
  }, [subtotal, packagingCost, packCount, deliveryFee, tax, total, dispatch]);

  // Cart actions
  const handleIncrement = (id) => dispatch(incrementQuantity(id));
  const handleDecrement = (id) => dispatch(decrementQuantity(id));
  const handleRemove = (id) => dispatch(removeItemCart(id));
  const handleAddSuggestion = (item) => dispatch(addItemCart({ ...item, isDrink: true }));

  // Always show top choice buttons. Bottom CTAs show only when address saved.
  const choosePickup = () => {
    dispatch(setOrderDetails({
      deliveryMethod: 'pickup',
      deliveryFee: 0,
      deliveryDistanceKm: 0,
      addressSaved: false, // ensure Proceed/Edit stay hidden
    }));
    router.push('/payment');
  };
  const chooseDelivery = () => { router.push('/checkout'); };

  const hasSavedAddress = order?.addressSaved === true;

  return (
    <>
      <NavbarDark />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8 pt-28">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-10 tracking-tight">
            {cartItems.length === 0 ? '🛒 Your Cart is Empty' : '🛍️ Your Cart'}
          </h1>

          {/* Empty */}
          {cartItems.length === 0 && (
            <>
              <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-white rounded-3xl shadow-lg border border-gray-200 animate-fadeIn">
                <ShoppingBag className="w-20 h-20 text-red-500 mb-6" />
                <h2 className="text-2xl font-bold text-gray-800 mb-3">Your cart is currently empty</h2>
                <p className="text-gray-600 mb-6 max-w-md">Looks like you haven’t added anything yet. Browse our menu and pick your favorites!</p>
                <Link href="/" className="bg-gradient-to-r from-red-500 to-red-700 text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition">Continue Shopping</Link>
              </div>
              <div className="mt-10"><DrinksSlider items={suggestedItems} onAdd={handleAddSuggestion} /></div>
            </>
          )}

          {/* Items */}
          {cartItems.length > 0 && (
            <div className={`grid grid-cols-1 ${suggestedItems.length > 0 ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-10 mb-12 animate-fadeIn`}>
              <div className="space-y-6">
                {cartItems.map((item) => {
                  const isFood = !item.isDrink;
                  return (
                    <div key={item._id} className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-md border border-gray-100 hover:shadow-lg hover:border-red-200 transition-all duration-300">
                      {item.image && (
                        <img src={getImageUrl(item.image)} alt={item.name}
                          className="w-24 h-24 object-cover rounded-xl"
                          onError={(e) => (e.currentTarget.src = '/placeholder.png')} />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">{item.name}</h3>
                        <p className="text-red-600 font-bold text-base">₦{item.price.toLocaleString()}</p>
                        {isFood && <p className="text-xs text-gray-500 mt-1">Pack × {item.quantity}</p>}
                        <div className="flex items-center gap-3 mt-2">
                          <button onClick={() => handleDecrement(item._id)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"><Minus className="w-4 h-4" /></button>
                          <span className="font-medium">{item.quantity}</span>
                          <button onClick={() => handleIncrement(item._id)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"><Plus className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <button onClick={() => handleRemove(item._id)} className="text-gray-400 hover:text-red-600 transition"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  );
                })}
              </div>

              {suggestedItems.length > 0 && <DrinksSlider items={suggestedItems} onAdd={handleAddSuggestion} />}
            </div>
          )}

          {/* Summary */}
          {cartItems.length > 0 && (
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Order Summary</h2>

              {/* Choice (always visible) */}
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={choosePickup} className="w-full rounded-xl border px-4 py-3 font-semibold hover:bg-gray-50 active:scale-[0.98] transition">
                  Pickup (₦0 delivery) → Pay Now
                </button>
                <button onClick={chooseDelivery} className="w-full rounded-xl bg-gradient-to-r from-red-500 to-red-700 text-white px-4 py-3 font-semibold hover:opacity-95 active:scale-[0.98] transition">
                  Delivery → Add Address
                </button>
              </div>

              <div className="space-y-4 text-gray-700">
                <div className="flex justify-between"><span>Subtotal (items)</span><span>₦{itemsSubtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Packaging — Packs × {packCount} <span className="text-gray-500">(₦{PACK_PRICE.toLocaleString()} each)</span></span><span>₦{packagingCost.toLocaleString()}</span></div>
                <div className="flex justify-between">
                  <span>Delivery Fee {order.deliveryMethod === 'delivery' ? `(distance: ${order.deliveryDistanceKm || 0} km)` : '(pickup)'}</span>
                  <span>₦{deliveryFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between"><span>Tax (2% of items)</span><span>₦{tax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                <div className="border-t pt-4 flex justify-between font-extrabold text-xl text-gray-900">
                  <span>Total</span><span className="text-red-600">₦{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Bottom CTAs — ONLY when address has been saved */}
              {hasSavedAddress && (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={() => router.push('/checkout')} className="w-full rounded-xl border px-4 py-3 font-semibold hover:bg-gray-50 active:scale-[0.98] transition">
                    Edit Delivery Address
                  </button>
                  <button onClick={() => router.push('/payment')} className="w-full rounded-xl bg-gray-900 text-white px-4 py-3 font-semibold hover:opacity-95 active:scale-[0.98] transition">
                    Proceed to Payment
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
