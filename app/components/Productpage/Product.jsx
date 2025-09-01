"use client";
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { incrementQuantity, decrementQuantity } from "./../../store/cartSlice";
import { setMeals } from "./../../store/mealsSlice";
import { ShoppingCart, Plus, Minus, Star } from "lucide-react";
import { motion } from "framer-motion";

// ---- API + Upload bases (robust to env values with/without /api)
const RAW = process.env.NEXT_PUBLIC_API_URL || "/api";
const API_BASE = RAW.endsWith("/api") ? RAW : `${RAW.replace(/\/+$/, "")}/api`;
const UPLOADS_BASE = API_BASE.replace(/\/api$/, "/uploads");

// ---- One image normalizer used everywhere
const getImageUrl = (val) => {
  let s = val;
  if (!s) return "/fallback.jpg";
  if (typeof s !== "string") {
    try {
      if (Array.isArray(s)) s = s[0] || "";
      else if (typeof s === "object") s = s.url || s.path || s.filename || s.filepath || "";
    } catch {}
  }
  if (!s) return "/fallback.jpg";
  if (/^https?:\/\//i.test(s)) return s;
  const cleaned = String(s)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^uploads\//i, "");
  return `${UPLOADS_BASE}/${encodeURI(cleaned)}`;
};

// ---- Popular flag normalizer (handles various backends)
const toBool = (v) =>
  v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true";

const isPopularItem = (p) =>
  toBool(p?.isPopular) ||
  toBool(p?.popular) ||
  toBool(p?.featured) ||
  (Array.isArray(p?.tags) &&
    p.tags.some((t) => String(t).toLowerCase() === "popular"));

const FastFoodProducts = ({ onRequireLocation }) => {
  const dispatch = useDispatch();

  const cartItems = useSelector((state) => state.cart.cartItem);
  const location = useSelector((state) => state.location);
  const mealsFromStore = useSelector((state) => state.meals.meals);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [allPage, setAllPage] = useState(1);
  const [popularPage, setPopularPage] = useState(1);
  const itemsPerPage = 6;

  const getQuantity = (id) => {
    const item = cartItems.find((i) => i._id === id);
    return item ? item.quantity : 0;
  };

  // Always open Location modal first. Do NOT add directly here.
  const handleAddToCart = (product) => {
    try {
      localStorage.setItem("pendingProduct", JSON.stringify(product));
    } catch {}
    if (typeof onRequireLocation === "function") {
      onRequireLocation(product._id);
    }
  };

  const handleIncrement = (id) => dispatch(incrementQuantity(id));
  const handleDecrement = (id) => dispatch(decrementQuantity(id));

  useEffect(() => {
    let aborted = false;

    const fetchProducts = async () => {
      try {
        let url = `${API_BASE}/foods`;
        if (location?.isConfirmed && location?.state && location?.lga) {
          url = `${API_BASE}/foods?state=${encodeURIComponent(
            location.state
          )}&lga=${encodeURIComponent(location.lga)}`;
        }
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
        const data = await res.json();

        if (!aborted) {
          setProducts(data);
          dispatch(setMeals(data));
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
        // ❌ Do NOT clear products; keep whatever is currently shown
      } finally {
        if (!aborted) setLoading(false);
      }
    };

    // Prefer Redux meals when available; otherwise fetch.
    if (mealsFromStore && mealsFromStore.length > 0) {
      setProducts(mealsFromStore);
      setLoading(false);
    } else if (products.length === 0) {
      // Only fetch if we have nothing shown yet
      fetchProducts();
    } else {
      // We already have products showing; ensure loading is false
      setLoading(false);
    }

    return () => {
      aborted = true;
    };
    // Track location parts explicitly to avoid unnecessary reruns
  }, [
    location?.isConfirmed,
    location?.state,
    location?.lga,
    mealsFromStore,
    dispatch,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl">Loading menu...</p>
      </div>
    );
  }

  // ✅ Popular supports multiple field names/shapes
  const popularProducts = products.filter(isPopularItem);

  const itemsPer = itemsPerPage;
  const paginatedAll = products.slice((allPage - 1) * itemsPer, allPage * itemsPer);
  const paginatedPopular = popularProducts.slice(
    (popularPage - 1) * itemsPer,
    popularPage * itemsPer
  );
  const allTotalPages = Math.ceil(products.length / itemsPer);
  const popularTotalPages = Math.ceil(popularProducts.length / itemsPer);

  const renderCard = (product, idx) => {
    const quantity = getQuantity(product._id);
    const src = getImageUrl(product.image);

    return (
      <motion.div
        key={product._id}
        className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-5 flex flex-col"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.05, duration: 0.4 }}
      >
        <div className="relative overflow-hidden rounded-lg">
          <img
            src={src}
            alt={product.name}
            className="w-full h-48 object-cover rounded-lg transform group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => (e.currentTarget.src = "/fallback.jpg")}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
        </div>

        <div className="mt-4 flex-1 flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="text-gray-600 text-sm flex-grow">{product.description}</p>
          <p className="font-bold text-green-600 mt-1">₦{product.price}</p>

          <div className="flex items-center text-yellow-500 mt-2">
            {[1, 2, 3, 4].map((i) => (
              <Star key={i} className="w-5 h-5 fill-yellow-500" />
            ))}
            <Star className="w-5 h-5 fill-yellow-500" style={{ clipPath: "inset(0 50% 0 0)" }} />
          </div>

          {quantity > 0 ? (
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => handleDecrement(product._id)} className="bg-gray-200 px-3 py-1 rounded">
                <Minus className="w-4 h-4" />
              </button>
              <span>{quantity}</span>
              <button onClick={() => handleIncrement(product._id)} className="bg-gray-200 px-3 py-1 rounded">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleAddToCart(product)}
              className="mt-3 bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" /> Add to Cart
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-gray-50 to-green-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Popular Items */}
        <section id="popular-items" className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <h2 className="text-3xl font-bold">🔥 Popular Items</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paginatedPopular.map((p, idx) => renderCard(p, idx))}
          </div>

          {popularTotalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                onClick={() => setPopularPage((p) => Math.max(p - 1, 1))}
                disabled={popularPage === 1}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <span>Page {popularPage} of {popularTotalPages}</span>
              <button
                onClick={() => setPopularPage((p) => Math.min(p + 1, popularTotalPages))}
                disabled={popularPage === popularTotalPages}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </section>

        {/* All Items */}
        <section>
          <h2 className="text-3xl font-bold mb-6">All Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedAll.map((p, idx) => renderCard(p, idx))}
          </div>

          {allTotalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                onClick={() => setAllPage((p) => Math.max(p - 1, 1))}
                disabled={allPage === 1}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <span>Page {allPage} of {allTotalPages}</span>
              <button
                onClick={() => setAllPage((p) => Math.min(p + 1, allTotalPages))}
                disabled={allPage === allTotalPages}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default FastFoodProducts;
