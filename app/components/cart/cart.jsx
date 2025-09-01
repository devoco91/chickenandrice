'use client';
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Minus, Plus, Trash2, Star, ShoppingBag } from 'lucide-react';
import NavbarDark from '../Navbar/NavbarDark';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import {
  incrementQuantity,
  decrementQuantity,
  removeItemCart,
  addItemCart,
} from './../../store/cartSlice';
import { setOrderDetails } from './../../store/orderSlice';

const RAW_API = process.env.NEXT_PUBLIC_API_URL || '';
const UPLOADS_BASE =
  process.env.NEXT_PUBLIC_BACKEND_UPLOADS_BASE ||
  (RAW_API ? RAW_API.replace(/\/api$/, '') + '/uploads' : '/uploads');

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

const CartPage = () => {
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.cartItem || []);
  const [suggestedItems, setSuggestedItems] = useState([]);

  // ✅ Fetch drinks only
  useEffect(() => {
    const fetchSuggestedItems = async () => {
      try {
        const res = await fetch(`/api/drinks`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setSuggestedItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch drinks:', err);
      }
    };
    fetchSuggestedItems();
  }, []);

  // Restore pending product from localStorage
  useEffect(() => {
    const pending = localStorage.getItem('pendingProduct');
    if (pending) {
      try {
        const product = JSON.parse(pending);
        dispatch(addItemCart(product));
      } catch (err) {
        console.error('Failed to parse pendingProduct:', err);
      }
      localStorage.removeItem('pendingProduct');
    }
  }, [dispatch]);

  // Totals
  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const deliveryFee = 500;
  const tax = subtotal * 0.02;
  const total = subtotal + deliveryFee + tax;

  // Sync totals to Redux
  useEffect(() => {
    dispatch(setOrderDetails({ subtotal, deliveryFee, tax, total }));
  }, [subtotal, deliveryFee, tax, total, dispatch]);

  const handleIncrement = (id) => dispatch(incrementQuantity(id));
  const handleDecrement = (id) => dispatch(decrementQuantity(id));
  const handleRemove = (id) => dispatch(removeItemCart(id));
  const handleAddSuggestion = (item) => {
    const cartItem = { ...item, quantity: 1, isDrink: true };
    dispatch(addItemCart(cartItem));
  };

  return (
    <>
      <NavbarDark />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8 pt-28">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-10 tracking-tight">
            {cartItems.length === 0 ? '🛒 Your Cart is Empty' : '🛍️ Your Cart'}
          </h1>

          {/* ===== Empty Cart Premium State ===== */}
          {cartItems.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-white rounded-3xl shadow-lg border border-gray-200 animate-fadeIn">
              <ShoppingBag className="w-20 h-20 text-red-500 mb-6" />
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                Your cart is currently empty
              </h2>
              <p className="text-gray-600 mb-6 max-w-md">
                Looks like you haven’t added anything yet. Browse our menu and pick your favorites!
              </p>
              <Link
                href="/"
                className="bg-gradient-to-r from-red-500 to-red-700 text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition"
              >
                Continue Shopping
              </Link>
            </div>
          )}

          {/* ===== Cart Items ===== */}
          {cartItems.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12 animate-fadeIn">
              <div className="lg:col-span-2 space-y-6">
                {cartItems.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-md border border-gray-100 hover:shadow-lg hover:border-red-200 transition-all duration-300"
                  >
                    {item.image && (
                      <img
                        src={getImageUrl(item.image)}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-xl"
                        onError={(e) => (e.currentTarget.src = '/placeholder.png')}
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">{item.name}</h3>
                      <p className="text-red-600 font-bold text-base">
                        ₦{item.price.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => handleDecrement(item._id)}
                          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleIncrement(item._id)}
                          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(item._id)}
                      className="text-gray-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* ===== Order Summary ===== */}
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>
                <div className="space-y-4 text-gray-700">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₦{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>₦{deliveryFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (2%)</span>
                    <span>₦{tax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t pt-4 flex justify-between font-extrabold text-xl text-gray-900">
                    <span>Total</span>
                    <span className="text-red-600">
                      ₦{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <Link
                  href="/checkout"
                  className="mt-8 block w-full bg-gradient-to-r from-red-500 to-red-700 text-white text-center py-3 rounded-xl font-semibold hover:opacity-90 transition"
                >
                  Proceed to Checkout
                </Link>
              </div>
            </div>
          )}

          {/* ===== Suggested Drinks Slider ===== */}
          {suggestedItems.length > 0 && (
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-10 mt-12">
              <div className="flex items-center gap-3 mb-8">
                <Star className="w-7 h-7 text-yellow-500 fill-current" />
                <h2 className="text-3xl font-extrabold text-gray-900">
                  Suggested Drinks 🍹
                </h2>
              </div>
              <Swiper
                modules={[Autoplay]}
                autoplay={{ delay: 4500, disableOnInteraction: false }}
                loop={true}
                spaceBetween={28}
                slidesPerView={1}
                breakpoints={{
                  640: { slidesPerView: 2 },
                  768: { slidesPerView: 3 },
                  1024: { slidesPerView: 4 },
                }}
                className="pb-6"
              >
                {suggestedItems.map((item) => (
                  <SwiperSlide key={item._id}>
                    <div className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-red-300 hover:shadow-xl transition-all duration-300">
                      <div className="relative overflow-hidden">
                        {item.image && (
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name}
                            className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => (e.currentTarget.src = '/placeholder.png')}
                          />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500"></div>
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">
                          {item.name}
                        </h3>
                        <p className="text-2xl font-extrabold text-red-600 mb-4">
                          ₦{item.price.toLocaleString()}
                        </p>
                        <button
                          onClick={() => handleAddSuggestion(item)}
                          className="w-full bg-gradient-to-r from-red-500 to-red-700 text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CartPage;
