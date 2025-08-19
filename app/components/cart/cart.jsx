'use client';
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Minus, Plus, Trash2, Star } from 'lucide-react';
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

const BACKEND_URL = "http://localhost:5000";

const CartPage = () => {
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.cartItem || []);
  const [suggestedItems, setSuggestedItems] = useState([]);

  // Helper to ensure all images are correct URLs
  const getImageUrl = (image) => {
    if (!image) return '';
    if (image.startsWith('http')) return image;
    return `${BACKEND_URL}${image.startsWith('/') ? image : `/${image}`}`;
  };

  // Fetch sides & drinks
  useEffect(() => {
    const fetchSuggestedItems = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/foods/sides-drinks`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setSuggestedItems(data.map(item => ({ ...item, image: getImageUrl(item.image) })));
      } catch (err) {
        console.error('Failed to fetch suggested items:', err);
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
        dispatch(addItemCart({ ...product, image: getImageUrl(product.image) }));
      } catch (err) {
        console.error('Failed to parse pendingProduct:', err);
      }
      localStorage.removeItem('pendingProduct');
    }
  }, [dispatch]);

  // Compute totals
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
    const cartItem = { ...item, quantity: 1, isSideOrDrink: true, image: getImageUrl(item.image) };
    dispatch(addItemCart(cartItem));
  };

  return (
    <>
      <NavbarDark />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8 pt-28">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            {cartItems.length === 0 ? 'Your Cart is Empty' : 'Your Cart'}
          </h1>

          {/* Cart Items */}
          {cartItems.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="lg:col-span-2 space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100"
                  >
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">{item.name}</h3>
                      <p className="text-red-600 font-bold">₦{item.price.toLocaleString()}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => handleDecrement(item._id)}
                          className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleIncrement(item._id)}
                          className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(item._id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₦{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Fee</span>
                    <span>₦{deliveryFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (2%)</span>
                    <span>₦{tax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-bold text-lg text-gray-900">
                    <span>Total</span>
                    <span>₦{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <Link
                  href="/checkout"
                  className="mt-6 block w-full bg-red-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  Proceed to Checkout
                </Link>
              </div>
            </div>
          )}

          {/* Suggested Drinks/Side Slider */}
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
                          src={getImageUrl(item.image)}
                          alt={item.name}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"></div>
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">
                          {item.name}
                        </h3>
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
};

export default CartPage;
