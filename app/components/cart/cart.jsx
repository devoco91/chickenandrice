// app/components/CartPage.jsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
import { buildImgSources } from '../../utils/img';

const MIN_ORDER_AMOUNT = 8850;

const DrinksSlider = ({ items, onAdd }) => {
  if (!items?.length) return null;
  const canLoop = items.length > 3;

  return (
    <div className="relative bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Star className="w-7 h-7 text-yellow-500 fill-current" />
          <h2 className="text-2xl font-extrabold text-gray-900">Suggested Drinks 🍹</h2>
        </div>
      </div>

      <button
        aria-label="Previous"
        className="drinks-prev absolute z-10 inline-flex items-center justify-center rounded-full border border-red-200 bg-white w-9 h-9 left-2 top-1/2 -translate-y-1/2 hover:bg-red-50 hover:border-red-300 active:scale-95 transition sm:left-auto sm:top-4 sm:-translate-y-0 sm:right-14 sm:w-10 sm:h-10"
      >
        <ChevronLeft className="w-5 h-5 text-red-600" />
      </button>
      <button
        aria-label="Next"
        className="drinks-next absolute z-10 inline-flex items-center justify-center rounded-full border border-red-200 bg-white w-9 h-9 right-2 top-1/2 -translate-y-1/2 hover:bg-red-50 hover:border-red-300 active:scale-95 transition sm:right-4 sm:top-4 sm:-translate-y-0 sm:w-10 sm:h-10"
      >
        <ChevronRight className="w-5 h-5 text-red-600" />
      </button>

      <Swiper
        modules={[Autoplay, Navigation]}
        autoplay={{ delay: 4500, disableOnInteraction: false, pauseOnMouseEnter: true }}
        loop={canLoop}
        navigation={{ prevEl: '.drinks-prev', nextEl: '.drinks-next' }}
        spaceBetween={16}
        slidesPerView={1}
        breakpoints={{ 640: { slidesPerView: 2 }, 768: { slidesPerView: 3 }, 1024: { slidesPerView: 3 } }}
        className="pb-8"
      >
        {items.map((item) => (
          <SwiperSlide key={item._id}>
            <div className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-red-300 hover:shadow-xl transition-all duration-300">
              <div className="relative overflow-hidden">
                {item.image ? (
                  (() => {
                    const { src, srcSet, sizes } = buildImgSources(item.image, [240, 320, 480]);
                    return (
                      <img
                        src={src}
                        srcSet={srcSet}
                        sizes={sizes}
                        alt={item.name}
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.currentTarget.src = '/placeholder.png'; e.currentTarget.srcset = ''; }}
                        loading="lazy"
                        decoding="async"
                      />
                    );
                  })()
                ) : (
                  <img
                    src="/placeholder.png"
                    alt=""
                    className="w-full h-40 object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-base text-gray-900 mb-2 line-clamp-1">{item.name}</h3>
                <p className="text-xl font-extrabold text-red-600 mb-3">
                  ₦{Number(item.price || 0).toLocaleString()}
                </p>
                <button
                  onClick={() => onAdd(item)}
                  className="w-full bg-gradient-to-r from-red-500 to-red-700 text-white py-2.5 px-3 rounded-lg font-semibold hover:opacity-90 transition"
                >
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
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSuggestedItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch drinks:', err);
      }
    };
    fetchSuggestedItems();
  }, []);

  useEffect(() => {
    const pending = localStorage.getItem('pendingProduct');
    if (pending) {
      try { dispatch(addItemCart(JSON.parse(pending))); } catch {}
      localStorage.removeItem('pendingProduct');
    }
  }, [dispatch]);

  // Derived totals (memoized)
  const itemsSubtotal = useMemo(
    () => (cartItems || []).reduce((t, it) => t + Number(it.price || 0) * Number(it.quantity || 0), 0),
    [cartItems]
  );
  const deliveryFee = Number(order.deliveryFee || 0);
  const tax = useMemo(() => itemsSubtotal * 0.02, [itemsSubtotal]);
  const subtotal = itemsSubtotal;
  const total = useMemo(() => subtotal + deliveryFee + tax, [subtotal, deliveryFee, tax]);

  useEffect(() => {
    // why: keep order summary consistent (packaging not used here)
    dispatch(setOrderDetails({
      subtotal,
      packagingCost: 0,
      packagingCount: 0,
      deliveryFee,
      tax,
      total,
    }));
  }, [subtotal, deliveryFee, tax, total, dispatch]);

  const belowMin = itemsSubtotal < MIN_ORDER_AMOUNT;

  const isBulk = (item) => item?.isBulk === true || String(item?.category || '').toLowerCase() === 'bulk';
  const minQty = (item) => (isBulk(item) ? 25 : 1);

  const handleIncrement = (id) => dispatch(incrementQuantity(id));
  const handleDecrement = (item) => {
    const canDec = item.quantity > minQty(item);
    if (!canDec) return; // guard (why: enforce min)
    dispatch(decrementQuantity(item._id));
  };
  const handleRemove = (id) => dispatch(removeItemCart(id));
  const handleAddSuggestion = (item) => dispatch(addItemCart({ ...item, isDrink: true }));

  const choosePickup = () => {
    if (belowMin) return;
    dispatch(setOrderDetails({
      deliveryMethod: 'pickup',
      deliveryFee: 0,
      deliveryDistanceKm: 0,
      addressSaved: false,
    }));
    router.push('/payment');
  };
  const chooseDelivery = () => {
    if (belowMin) return;
    router.push('/checkout');
  };

  const hasSavedAddress = order?.addressSaved === true;

  return (
    <>
      <NavbarDark />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8 pt-28">
          <div className="mb-4">
            <Link
              href="/Detailspage"
              className="inline-flex items-center gap-2 text-white px-4 py-2 rounded-xl shadow hover:opacity-90 transition"
              style={{ backgroundColor: '#2563eb' }}
            >
              <ChevronLeft className="w-4 h-4" />
              Go back to shopping
            </Link>
          </div>

          <h1 className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">
            {cartItems.length === 0 ? '🛒 Your Cart is Empty' : '🛍️ Your Cart'}
          </h1>

          {belowMin && cartItems.length > 0 && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 font-semibold">
              Order subtotal can’t be less than ₦{MIN_ORDER_AMOUNT.toLocaleString()}.
            </div>
          )}

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

          {cartItems.length > 0 && (
            <div className={`grid grid-cols-1 ${suggestedItems.length > 0 ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-10 mb-12 animate-fadeIn`}>
              <div className="space-y-6">
                {cartItems.map((item) => {
                  const min = minQty(item);
                  const canDec = item.quantity > min;
                  return (
                    <div
                      key={item._id}
                      className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-md border border-gray-100 hover:shadow-lg hover:border-red-200 transition-all duration-300"
                    >
                      {item.image ? (
                        (() => {
                          const { src, srcSet, sizes } = buildImgSources(item.image, [160, 240, 320]);
                          return (
                            <img
                              src={src}
                              srcSet={srcSet}
                              sizes={sizes}
                              alt={item.name}
                              className="w-24 h-24 object-cover rounded-xl"
                              onError={(e) => { e.currentTarget.src = '/placeholder.png'; e.currentTarget.srcset = ''; }}
                              loading="lazy"
                              decoding="async"
                            />
                          );
                        })()
                      ) : (
                        <img
                          src="/placeholder.png"
                          alt=""
                          className="w-24 h-24 object-cover rounded-xl"
                          loading="lazy"
                          decoding="async"
                        />
                      )}

                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">{item.name}</h3>
                        <p className="text-red-600 font-bold text-base">
                          ₦{Number(item.price || 0).toLocaleString()}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            onClick={() => handleDecrement(item)}
                            disabled={!canDec}
                            title={!canDec && isBulk(item) ? "Bulk orders can’t go below 25" : undefined}
                            className={`p-2 rounded-lg transition ${canDec ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-100 opacity-50 cursor-not-allowed'}`}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span
                            className="font-medium"
                            title={isBulk(item) ? "Minimum 25 for bulk" : undefined}
                          >
                            {item.quantity}
                          </span>
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
                  );
                })}
              </div>

              {suggestedItems.length > 0 && <DrinksSlider items={suggestedItems} onAdd={handleAddSuggestion} />}
            </div>
          )}

          {cartItems.length > 0 && (
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Order Summary</h2>

              {!belowMin ? (
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={choosePickup}
                    className="w-full rounded-xl border px-4 py-3 font-semibold hover:bg-gray-50 active:scale-[0.98] transition"
                  >
                    Pickup (₦0 delivery) → Pay Now
                  </button>
                  <button
                    onClick={chooseDelivery}
                    className="w-full rounded-xl bg-gradient-to-r from-red-500 to-red-700 text-white px-4 py-3 font-semibold hover:opacity-95 active:scale-[0.98] transition"
                  >
                    Delivery → Add Address
                  </button>
                </div>
              ) : (
                <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-800 px-4 py-3 font-semibold">
                  Add items worth at least ₦{MIN_ORDER_AMOUNT.toLocaleString()} to continue to checkout.
                </div>
              )}

              <div className="space-y-4 text-gray-700">
                <div className="flex justify-between">
                  <span>Subtotal (items)</span>
                  <span>₦{itemsSubtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    Delivery Fee {order.deliveryMethod === 'delivery' ? `(distance: ${order.deliveryDistanceKm || 0} km)` : '(pickup)'}
                  </span>
                  <span>₦{deliveryFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (2% of items)</span>
                  <span>₦{tax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t pt-4 flex justify-between font-extrabold text-xl text-gray-900">
                  <span>Total</span>
                  <span className="text-red-600">₦{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {!belowMin && hasSavedAddress && (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => router.push('/checkout')}
                    className="w-full rounded-xl border px-4 py-3 font-semibold hover:bg-gray-50 active:scale-[0.98] transition"
                  >
                    Edit Delivery Address
                  </button>
                  <button
                    onClick={() => router.push('/payment')}
                    className="w-full rounded-xl bg-gray-900 text-white px-4 py-3 font-semibold hover:opacity-95 active:scale-[0.98] transition"
                  >
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
