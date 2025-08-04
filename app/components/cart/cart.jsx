'use client';
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Minus, Plus, Trash2 } from 'lucide-react';
import NavbarDark from '../Navbar/NavbarDark';
import Link from 'next/link';
import {
  incrementQuantity,
  decrementQuantity,
  removeItemCart,
} from './../../store/cartSlice';


import products from './../Availableitems/Items'

const CartPage = () => {
  const dispatch = useDispatch();
  const cartItems = useSelector(state => state.cart.cartItem);


  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const handleIncrement = (id) => {
    dispatch(incrementQuantity(id));
  };

  const handleDecrement = (id) => {
    dispatch(decrementQuantity(id));
  };

  const handleRemove = (id) => {
    dispatch(removeItemCart(id));
  };

  return (
    <>
      <NavbarDark />

      <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
        <h1 className="text-3xl font-bold mb-6">Your Cart</h1>

        {cartItems.length === 0 ? (
          <>
            <p className="text-gray-500 mb-4">
              Your cart is currently empty. Here are some popular items:
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {products.map(item => (
                <div key={item.id} className="flex items-center gap-4 bg-white shadow p-4 rounded-lg">
                  <img src={item.image} alt={item.name} className="w-24 h-24 object-cover rounded" />
                  <div>
                    <h2 className="text-lg font-semibold">{item.name}</h2>
                    <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 bg-white shadow p-4 rounded-lg"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">{item.name}</h2>
                    <p className="text-sm text-gray-500">
                      ${item.price.toFixed(2)} each
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => handleDecrement(item.id)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-medium">{item.quantity}</span>
                      <button
                        onClick={() => handleIncrement(item.id)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Remove Button & Total */}
                  <div className="text-right">
                    <p className="text-red-600 font-bold">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="text-sm text-red-500 mt-2 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
              <h2 className="text-xl font-semibold">Order Summary</h2>
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Tax</span>
                <span>${(subtotal * 0.08).toFixed(2)}</span>
              </div>
              <hr />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${(subtotal * 1.08).toFixed(2)}</span>
              </div>
              <Link
                href="/checkout"
                className="inline-flex items-center justify-center w-full bg-gradient-to-r from-red-600 to-red-700 text-white text-lg font-bold py-3 rounded-lg shadow-md hover:from-red-700 hover:to-red-800 hover:shadow-lg transition-all duration-300"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CartPage;
