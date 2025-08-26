"use client";
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { incrementQuantity, decrementQuantity } from "./../../store/cartSlice";
import { setMeals } from "./../../store/mealsSlice";
import { ShoppingCart, Plus, Minus, Star } from "lucide-react";
import { useRouter } from "next/navigation";

const API_BASE = "/api";
const BACKEND_URL = "http://localhost:5000";

const FastFoodProducts = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const cartItems = useSelector((state) => state.cart.cartItem);
  const location = useSelector((state) => state.location);
  const mealsFromStore = useSelector((state) => state.meals.meals);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [allPage, setAllPage] = useState(1);
  const [popularPage, setPopularPage] = useState(1);
  const itemsPerPage = 8;

  const getQuantity = (id) => {
    const item = cartItems.find((i) => i._id === id);
    return item ? item.quantity : 0;
  };

  // 🚨 Always redirect to select-location, never add directly
  const handleAddToCart = (product) => {
    const cartProduct = {
      ...product,
      image: getImageUrl(product.image),
    };

    localStorage.setItem("pendingProduct", JSON.stringify(cartProduct));
    router.push(`/select-location?mealId=${product._id}`);
  };

  const handleIncrement = (id) => dispatch(incrementQuantity(id));
  const handleDecrement = (id) => dispatch(decrementQuantity(id));

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        let url = `${API_BASE}/foods`;

        if (location?.isConfirmed && location?.state && location?.lga) {
          url = `${API_BASE}/foods?state=${location.state}&lga=${location.lga}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        const filtered = data.filter(
          (item) => !["Side", "Drink"].includes(item.category)
        );

        setProducts(filtered);
        dispatch(setMeals(filtered));
      } catch (err) {
        console.error("Failed to fetch products:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    // ✅ If Redux already has meals, use them
    if (mealsFromStore.length > 0) {
      setProducts(mealsFromStore);
      setLoading(false);
    } else {
      fetchProducts();
    }
  }, [location, mealsFromStore, dispatch]);

  const getImageUrl = (image) => {
    if (!image) return "";
    if (image.startsWith("http")) return image;
    return `${BACKEND_URL}${image.startsWith("/") ? image : `/${image}`}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl">Loading menu...</p>
      </div>
    );
  }

  const popularProducts = products.filter((p) => p.isPopular);
  const paginatedAll = products.slice((allPage - 1) * itemsPerPage, allPage * itemsPerPage);
  const paginatedPopular = popularProducts.slice((popularPage - 1) * itemsPerPage, popularPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-gray-50 to-green-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Popular Items */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <h2 className="text-3xl font-bold">🔥 Popular Items</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paginatedPopular.map((product) => {
              const quantity = getQuantity(product._id);
              return (
                <div key={product._id} className="bg-white rounded-xl shadow-md p-4">
                  <img src={getImageUrl(product.image)} alt={product.name} className="w-full h-48 object-cover rounded-lg" />
                  <h3 className="text-lg font-bold mt-2">{product.name}</h3>
                  <p className="text-gray-600 text-sm">{product.description}</p>
                  <p className="font-bold text-green-600">₦{product.price}</p>

                  {/* ⭐ Rating */}
                  <div className="flex items-center text-yellow-500 mt-2">
                    {[1,2,3,4].map(i => (
                      <Star key={i} className="w-5 h-5 fill-yellow-500" />
                    ))}
                    <Star className="w-5 h-5 fill-yellow-500" style={{ clipPath: "inset(0 50% 0 0)" }} />
                  </div>

                  {quantity > 0 ? (
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleDecrement(product._id)}
                        className="bg-gray-200 px-3 py-1 rounded"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span>{quantity}</span>
                      <button
                        onClick={() => handleIncrement(product._id)}
                        className="bg-gray-200 px-3 py-1 rounded"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="mt-3 bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" /> Add to Cart
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* All Items */}
        <section>
          <h2 className="text-3xl font-bold mb-6">All Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedAll.map((product) => {
              const quantity = getQuantity(product._id);
              return (
                <div key={product._id} className="bg-white rounded-xl shadow-md p-4">
                  <img src={getImageUrl(product.image)} alt={product.name} className="w-full h-48 object-cover rounded-lg" />
                  <h3 className="text-lg font-bold mt-2">{product.name}</h3>
                  <p className="text-gray-600 text-sm">{product.description}</p>
                  <p className="font-bold text-green-600">₦{product.price}</p>

                  {quantity > 0 ? (
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleDecrement(product._id)}
                        className="bg-gray-200 px-3 py-1 rounded"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span>{quantity}</span>
                      <button
                        onClick={() => handleIncrement(product._id)}
                        className="bg-gray-200 px-3 py-1 rounded"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="mt-3 bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" /> Add to Cart
                    </button>
                  )}
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
