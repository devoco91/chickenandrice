'use client';

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Star } from 'lucide-react';
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const CartPage = () => {
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.cartItem);
  const [suggestedItems, setSuggestedItems] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);

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

    const fetchSuggestedItems = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/foods/sides-drinks`);
        const data = await res.json();
        setSuggestedItems(data);
      } catch (err) {
        console.error('Failed to fetch suggested items:', err);
      }
    };

    fetchSuggestedItems();
  }, [dispatch]);

  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const deliveryFee = 500;
  const tax = subtotal * 0.02;
  const total = subtotal + deliveryFee + tax;

  const handleIncrement = (id) => {
    dispatch(incrementQuantity(id));
  };

  const handleDecrement = (id) => {
    dispatch(decrementQuantity(id));
  };

  const handleRemove = (id) => {
    dispatch(removeItemCart(id));
  };

  const handleAddSuggestion = (item) => {
    const cartItem = {
      _id: item._id,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: 1,
      isSideOrDrink: true,
    };
    dispatch(addItemCart(cartItem));
  };

  if (cartItems.length === 0) {
    return (
      <>
        <NavbarDark />
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 py-8 pt-28">
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-12 h-12 text-gray-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Cart is Empty</h1>
              <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
                Discover our delicious selection of jollof rice, fried rice, and refreshing drinks to get started.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Start Shopping <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {suggestedItems.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Star className="w-6 h-6 text-yellow-500 fill-current" />
                  <h2 className="text-2xl font-bold text-gray-900">Popular Choices</h2>
                </div>
                <Swiper
                  modules={[Autoplay]}
                  autoplay={{ delay: 5000, disableOnInteraction: false }}
                  loop={true}
                  spaceBetween={24}
                  slidesPerView={1}
                  breakpoints={{
                    640: { slidesPerView: 2 },
                    768: { slidesPerView: 3 },
                    1024: { slidesPerView: 4 },
                  }}
                  className="pb-4"
                >
                  {suggestedItems.map((item) => (
                    <SwiperSlide key={item._id}>
                      <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-red-200 hover:shadow-lg transition-all duration-300">
                        <div className="relative overflow-hidden">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"></div>
                        </div>
                        <div className="p-5">
                          <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{item.name}</h3>
                          <p className="text-2xl font-bold text-red-600 mb-4">
                            ₦{item.price.toLocaleString()}
                          </p>
                          <button
                            onClick={() => handleAddSuggestion(item)}
                            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors duration-200"
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
  }


  return (
    <>
      <NavbarDark />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8 pt-28">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Shopping Cart</h1>
            <p className="text-gray-600">Review your items and proceed to checkout</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-8">
              {/* Main Items */}
              {cartItems.filter(item => !item.isSideOrDrink).length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Main Dishes</h2>
                    <p className="text-sm text-gray-600 mt-1">{cartItems.filter(item => !item.isSideOrDrink).length} item(s)</p>
                  </div>
                  <div className="p-6 space-y-4">
                    {cartItems
                      .filter(item => !item.isSideOrDrink)
                      .map((item) => (
                        <div
                          key={item._id}
                          className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-gray-900 mb-1">{item.name}</h3>
                            <p className="text-gray-600 text-sm mb-3">
                              ₦{item.price.toLocaleString()} per serving
                            </p>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleDecrement(item._id)}
                                className="w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-all duration-200"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="font-bold text-lg min-w-[40px] text-center">{item.quantity}</span>
                              <button
                                onClick={() => handleIncrement(item._id)}
                                className="w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-all duration-200"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-2xl font-bold text-red-600 mb-2">
                              ₦{(item.price * item.quantity).toLocaleString()}
                            </p>
                            <button
                              onClick={() => handleRemove(item._id)}
                              className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 font-medium text-sm transition-colors"
                            >
                              <Trash2 className="w-4 h-4" /> Remove
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Sides & Drinks */}
              {cartItems.filter(item => item.isSideOrDrink).length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Sides & Drinks</h2>
                    <p className="text-sm text-gray-600 mt-1">{cartItems.filter(item => item.isSideOrDrink).length} item(s)</p>
                  </div>
                  <div className="p-6 space-y-4">
                    {cartItems
                      .filter(item => item.isSideOrDrink)
                      .map((item) => (
                        <div
                          key={item._id}
                          className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 mb-1">{item.name}</h3>
                            <p className="text-gray-600 text-sm mb-3">
                              ₦{item.price.toLocaleString()} each
                            </p>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleDecrement(item._id)}
                                className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-md hover:border-red-300 transition-colors"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-semibold min-w-[24px] text-center">{item.quantity}</span>
                              <button
                                onClick={() => handleIncrement(item._id)}
                                className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-md hover:border-red-300 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-red-600 text-lg mb-2">
                              ₦{(item.price * item.quantity).toLocaleString()}
                            </p>
                            <button
                              onClick={() => handleRemove(item._id)}
                              className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 font-medium text-sm transition-colors"
                            >
                              <Trash2 className="w-3 h-3" /> Remove
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Suggested Items */}
              {suggestedItems.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Complete Your Order</h2>
                      <p className="text-sm text-gray-600 mt-1">Add drinks and sides to enhance your meal</p>
                    </div>
                    {cartItems.some(item => item.isSideOrDrink) && (
                      <button
                        onClick={() => setShowSuggestions(!showSuggestions)}
                        className="text-red-600 hover:text-red-700 font-semibold text-sm transition-colors"
                      >
                        {showSuggestions ? 'Hide' : 'Show'} Options
                      </button>
                    )}
                  </div>

                  {(showSuggestions || !cartItems.some(item => item.isSideOrDrink)) && (
                    <div className="p-6">
                      <Swiper
                        modules={[Autoplay]}
                        autoplay={{ delay: 4000, disableOnInteraction: false }}
                        spaceBetween={16}
                        slidesPerView={1}
                        breakpoints={{
                          480: { slidesPerView: 2 },
                          640: { slidesPerView: 3 },
                          768: { slidesPerView: 4 },
                          1024: { slidesPerView: 5 },
                        }}
                        className="pb-4"
                      >
                        {suggestedItems
                          .filter(suggestedItem =>
                            !cartItems.some(cartItem =>
                              cartItem._id === suggestedItem._id && cartItem.isSideOrDrink
                            )
                          )
                          .map((item) => (
                            <SwiperSlide key={item._id}>
                              <div className="bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 border border-gray-200">
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-24 object-cover"
                                />
                                <div className="p-3">
                                  <h4 className="font-bold text-sm text-gray-900 mb-1 line-clamp-1">{item.name}</h4>
                                  <p className="text-red-600 font-bold mb-3">
                                    ₦{item.price.toLocaleString()}
                                  </p>
                                  <button
                                    onClick={() => handleAddSuggestion(item)}
                                    className="w-full bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
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
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 h-fit sticky top-28">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-gray-700">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-semibold">₦{subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center text-gray-700">
                  <span className="font-medium">DELIVERY FEE</span>
                  <span className="font-semibold">₦500</span>
                </div>

                <div className="flex justify-between items-center text-gray-700">
                  <span className="font-medium">Tax (2%)</span>
                  <span className="font-semibold">₦{tax.toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-red-600">₦{total.toLocaleString()}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="block w-full bg-gradient-to-r from-red-600 to-red-700 text-white text-center text-lg font-bold py-4 rounded-xl shadow-md hover:from-red-700 hover:to-red-800 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CartPage;