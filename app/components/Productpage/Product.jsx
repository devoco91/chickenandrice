'use client';
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addItemCart,
  incrementQuantity,
  decrementQuantity
} from './../../store/cartSlice';
import { ShoppingCart, Plus, Minus, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

const BACKEND_URL = 'http://localhost:5000';

const FastFoodProducts = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const cartItems = useSelector((state) => state.cart.cartItem);
  const locationConfirmed = useSelector((state) => state.location.isConfirmed);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const getQuantity = (id) => {
    const item = cartItems.find((i) => i._id === id);
    return item ? item.quantity : 0;
  };

  const handleAddToCart = (product) => {
    if (!locationConfirmed || locationConfirmed === false) {
      localStorage.setItem('pendingProduct', JSON.stringify(product));
      router.push('/location');
      return;
    }

    dispatch(addItemCart(product));
  };

  const handleIncrement = (id) => dispatch(incrementQuantity(id));
  const handleDecrement = (id) => dispatch(decrementQuantity(id));

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/foods');
        const data = await res.json();


        const filtered = data.filter(
          (item) => !['Side', 'Drink'].includes(item.category)
        );
        setProducts(filtered);
      } catch (err) {
        console.error('Failed to fetch products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const getImageUrl = (image) => {
    if (!image) return '';
    return image.startsWith('http') ? image : `${BACKEND_URL}${image}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading delicious menu...</p>
        </div>
      </div>
    );
  }
//  Filter popular products 
  const popularProducts = products.filter((p) => p.isPopular);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-gray-50 to-green-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Popular Items */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-8 bg-green-600 rounded-full"></div>
            <h2 className="text-3xl font-bold text-gray-900">🔥 Popular Items</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {popularProducts.map((product) => {
              const quantity = getQuantity(product._id);
              return (
                <div key={product._id} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl overflow-hidden transform hover:scale-[1.02] transition-all duration-300 border border-green-100">
                  <div className="relative group">
                    <img
                      src={getImageUrl(product.image)}
                      alt={product.name}
                      className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute top-4 right-4">
                      <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        Popular
                      </div>
                    </div>
                    {quantity === 0 && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transform hover:scale-105 transition-all duration-200 shadow-lg"
                        >
                          Add to Cart
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>

                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-green-600">₦{product.price}</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-gray-600 font-medium">{product.rating || '4.5'}</span>
                      </div>
                    </div>

                    {quantity > 0 && (
                      <div className="flex items-center justify-center gap-4 bg-green-50 rounded-xl py-3">
                        <button
                          onClick={() => handleDecrement(product._id)}
                          className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-full transform hover:scale-110 transition-all duration-200 shadow-md"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-xl font-bold text-green-700 min-w-[2rem] text-center">{quantity}</span>
                        <button
                          onClick={() => handleIncrement(product._id)}
                          className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-full transform hover:scale-110 transition-all duration-200 shadow-md"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* All Items */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-8 bg-green-600 rounded-full"></div>
            <h2 className="text-3xl font-bold text-gray-900">All Items</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const quantity = getQuantity(product._id);
              return (
                <div key={product._id} className="bg-white rounded-xl shadow-md hover:shadow-xl overflow-hidden transform hover:scale-[1.02] transition-all duration-300 border border-gray-100">
                  <div className="relative group">
                    <img
                      src={getImageUrl(product.image)}
                      alt={product.name}
                      className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {quantity === 0 && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transform hover:scale-105 transition-all duration-200"
                        >
                          Add to Cart
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{product.name}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-green-600">₦{product.price}</span>

                      {quantity > 0 ? (
                        <div className="flex items-center gap-2 bg-green-50 rounded-lg p-1">
                          <button
                            onClick={() => handleDecrement(product._id)}
                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-full transform hover:scale-110 transition-all duration-200"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-green-700 min-w-[1.5rem] text-center">{quantity}</span>
                          <button
                            onClick={() => handleIncrement(product._id)}
                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-full transform hover:scale-110 transition-all duration-200"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-full transform hover:scale-110 transition-all duration-200 shadow-md"
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
    </div>
  );
};

export default FastFoodProducts;

