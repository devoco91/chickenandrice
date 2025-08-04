'use client';
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addItemCart,
  incrementQuantity,
  decrementQuantity,
} from './../../store/cartSlice';
import { ShoppingCart, Plus, Minus, Star } from 'lucide-react';

const FastFoodProducts = () => {
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.cartItem);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const getQuantity = (id) => {
    const item = cartItems.find((i) => i.id === id);
    return item ? item.quantity : 0;
  };

  const handleAddToCart = (product) => dispatch(addItemCart(product));
  const handleIncrement = (id) => dispatch(incrementQuantity(id));
  const handleDecrement = (id) => dispatch(decrementQuantity(id));

  const categories = [
    { id: 'all', name: 'All Items', count: 32 },
    { id: 'burgers', name: 'Burgers', count: 8 },
    { id: 'chicken', name: 'Chicken', count: 6 },
    { id: 'classicfries', name: 'Classic Fries', count: 4 },
    { id: 'drinks', name: 'Drinks', count: 5 },
    { id: 'hotdogs', name: 'Hot Dogs', count: 4 },
    { id: 'onionrings', name: 'Onion Rings', count: 3 },
    { id: 'cheese', name: 'Cheese Specials', count: 3 },
    { id: 'pizza', name: 'Pizza', count: 4 },
    { id: 'sides', name: 'Sides', count: 6 },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/foods');
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error('Failed to fetch products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading menu...</div>;

  const popularProducts = products.filter((product) => product.isPopular);

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Delicious Menu</h1>
        <p className="text-xl opacity-90">Fresh ingredients, bold flavors, fast delivery</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category, index) => (
            <button
              key={category.id}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                index === 0
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {category.name}{' '}
              <span className="ml-2 text-sm opacity-75">({category.count})</span>
            </button>
          ))}
        </div>

        {/* Popular Items */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🔥 Popular Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularProducts.map((product) => {
              const quantity = getQuantity(product._id);

              return (
                <div
                  key={product._id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-200"
                >
                  <div className="relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                    {product.originalPrice && (
                      <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                        Save ${(product.originalPrice - product.price).toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                    <p className="text-gray-600 text-sm mb-3">{product.description}</p>

                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-red-600">${product.price}</span>
                        {product.originalPrice && (
                          <span className="text-sm text-gray-500 line-through">
                            ${product.originalPrice}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-gray-600">{product.rating}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      {quantity > 0 ? (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleDecrement(product._id)}
                            className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-semibold text-lg">{quantity}</span>
                          <button
                            onClick={() => handleIncrement(product._id)}
                            className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-semibold"
                        >
                          Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* All Items */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">All Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const quantity = getQuantity(product._id);

              return (
                <div
                  key={product._id}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="relative group">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {product.badges?.map((badge, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${
                            badge === 'Bestseller'
                              ? 'bg-red-600'
                              : badge === 'New'
                              ? 'bg-green-600'
                              : badge === 'Spicy'
                              ? 'bg-orange-600'
                              : badge === 'Popular'
                              ? 'bg-purple-600'
                              : badge === 'Premium'
                              ? 'bg-yellow-600'
                              : 'bg-gray-600'
                          }`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>

                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300"
                      >
                        Quick Add
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-900 text-lg">{product.name}</h3>
                      <div className="flex items-center gap-1 ml-2">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-gray-600">{product.rating}</span>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-red-600">#{product.price}</span>
                        {product.originalPrice && (
                          <span className="text-xs text-gray-500 line-through">{product.originalPrice}</span>
                        )}
                      </div>

                      {quantity > 0 ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDecrement(product._id)}
                            className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-semibold min-w-[20px] text-center">{quantity}</span>
                          <button
                            onClick={() => handleIncrement(product._id)}
                            className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Floating Cart Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button className="bg-red-600 text-white p-4 rounded-full shadow-2xl hover:bg-red-700 transition-colors relative">
          <ShoppingCart className="w-6 h-6" />
          {cartItems.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-yellow-400 text-red-900 rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center">
              {cartItems.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default FastFoodProducts;
