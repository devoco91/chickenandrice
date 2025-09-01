"use client";
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  incrementQuantity,
  decrementQuantity,
  addItemCart,
  resetCart,
} from "./../store/cartSlice";
import { setMeals, resetMeals } from "./../store/mealsSlice";
import { resetLocation } from "./../store/locationSlice";
import { ShoppingCart, Plus, Minus, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar/Navbar";
import { motion } from "framer-motion";

// ---- Robust API + Upload bases (works for dev/prod and with/without trailing /api)
const RAW = process.env.NEXT_PUBLIC_API_URL || "/api";
const API_BASE = RAW.endsWith("/api") ? RAW : `${RAW.replace(/\/+$/, "")}/api`;
const UPLOADS_BASE = API_BASE.replace(/\/api$/, "/uploads");

// ---- One image normalizer used everywhere
const getImageUrl = (val) => {
  let s = val;
  if (!s) return "/placeholder.png";
  if (typeof s !== "string") {
    try {
      if (Array.isArray(s)) s = s[0] || "";
      else if (typeof s === "object")
        s = s.url || s.path || s.filename || s.filepath || "";
    } catch {}
  }
  if (!s) return "/placeholder.png";
  if (/^https?:\/\//i.test(s)) return s;
  const cleaned = String(s)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^uploads\//i, "");
  return `${UPLOADS_BASE}/${encodeURI(cleaned)}`;
};

const Detailspage = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const cartItems = useSelector((state) => state.cart.cartItem);
  const location = useSelector((state) => state.location);
  const mealsFromStore = useSelector((state) => state.meals.meals);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [allPage, setAllPage] = useState(1);
  const [popularPage, setPopularPage] = useState(1);
  const itemsPerPage = 9;

  const getQuantity = (id) => {
    const item = cartItems.find((i) => i._id === id);
    return item ? item.quantity : 0;
  };

  const handleAddToCart = (product) => {
    const cartProduct = { ...product };
    if (location?.isConfirmed) {
      dispatch(addItemCart(cartProduct));
    } else {
      localStorage.setItem("pendingProduct", JSON.stringify(cartProduct));
      router.push(`/select-location?mealId=${product._id}`);
    }
  };

  const handleIncrement = (id) => dispatch(incrementQuantity(id));
  const handleDecrement = (id) => dispatch(decrementQuantity(id));

  const handleChangeLocation = () => {
    dispatch(resetCart());
    dispatch(resetMeals());
    dispatch(resetLocation());
    router.push("/");
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (mealsFromStore.length > 0) {
          setProducts(mealsFromStore);
          return;
        }

        let url = `${API_BASE}/foods`;
        if (location?.isConfirmed && location?.state && location?.lga) {
          url = `${API_BASE}/foods?state=${encodeURIComponent(
            location.state
          )}&lga=${encodeURIComponent(location.lga)}`;
        }

        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();

        setProducts(data);
        dispatch(setMeals(data));
      } catch (err) {
        console.error("Failed to fetch products:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [location, mealsFromStore, dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <p className="text-xl text-gray-700 animate-pulse">Loading menu...</p>
      </div>
    );
  }

  const popularProducts = products.filter((p) => p.isPopular);
  const paginatedAll = products.slice(
    (allPage - 1) * itemsPerPage,
    allPage * itemsPerPage
  );
  const paginatedPopular = popularProducts.slice(
    (popularPage - 1) * itemsPerPage,
    popularPage * itemsPerPage
  );

  const allTotalPages = Math.ceil(products.length / itemsPerPage);
  const popularTotalPages = Math.ceil(popularProducts.length / itemsPerPage);

  const renderCard = (product, idx) => {
    const quantity = getQuantity(product._id);

    return (
      <motion.div
        key={product._id}
        className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-5 flex flex-col"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.05, duration: 0.4 }}
      >
        <img
          src={getImageUrl(product.image)}
          alt={product.name}
          className="w-full h-56 object-cover rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-300"
          onError={(e) => (e.currentTarget.src = "/placeholder.png")}
          loading="lazy"
        />
        <div className="mt-4 flex-1 flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="text-gray-500 text-sm mt-1 line-clamp-2">
            {product.description}
          </p>
          <p className="font-bold text-green-600 text-xl mt-3">
            ₦{product.price}
          </p>

          <div className="flex items-center text-yellow-500 mt-2">
            {[1, 2, 3, 4].map((i) => (
              <Star key={i} className="w-5 h-5 fill-yellow-500" />
            ))}
            <Star
              className="w-5 h-5 fill-yellow-500"
              style={{ clipPath: "inset(0 50% 0 0)" }}
            />
          </div>

          {quantity > 0 ? (
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => handleDecrement(product._id)}
                className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-semibold">{quantity}</span>
              <button
                onClick={() => handleIncrement(product._id)}
                className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleAddToCart(product)}
              className="mt-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow hover:opacity-95 transition"
            >
              <ShoppingCart className="w-4 h-4 inline-block mr-1" /> Add to Cart
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  const Pagination = ({ currentPage, totalPages, setPage }) => (
    <div className="flex items-center justify-center gap-4 mt-8 pb-20 md:pb-0 md:static fixed bottom-0 left-0 w-full bg-white/90 md:bg-transparent backdrop-blur-md md:backdrop-blur-0 p-4 md:p-0 shadow-t md:shadow-none z-40">
      <button
        onClick={() => setPage((p) => Math.max(p - 1, 1))}
        disabled={currentPage === 1}
        className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition"
      >
        Prev
      </button>
      <span className="font-medium text-gray-700">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
        disabled={currentPage === totalPages}
        className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition"
      >
        Next
      </button>
    </div>
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-gray-50 to-green-50 pt-24">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex justify-end mb-10">
            <button
              onClick={handleChangeLocation}
              className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-5 py-2.5 rounded-xl shadow hover:opacity-95 transition"
            >
              Change Location
            </button>
          </div>

          {/* Popular Items */}
          <section className="mb-20">
            <h2 className="text-4xl font-extrabold mb-10 text-gray-900">
              🔥 Popular Items
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedPopular.map((product, idx) => renderCard(product, idx))}
            </div>

            {popularTotalPages > 1 && (
              <Pagination
                currentPage={popularPage}
                totalPages={popularTotalPages}
                setPage={setPopularPage}
              />
            )}
          </section>

          {/* All Items */}
          <section>
            <h2 className="text-4xl font-extrabold mb-10 text-gray-900">
              🍲 All Items
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedAll.map((product, idx) => renderCard(product, idx))}
            </div>

            {allTotalPages > 1 && (
              <Pagination
                currentPage={allPage}
                totalPages={allTotalPages}
                setPage={setAllPage}
              />
            )}
          </section>
        </div>
      </div>

      {/* 🛒 Floating Cart Button */}
      {cartItems.length > 0 && (
        <button
          onClick={() => router.push("/cart")}
          className="fixed bottom-20 right-6 bg-gradient-to-r from-red-600 to-rose-600 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2 hover:opacity-90 transition z-50"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="font-semibold">({cartItems.length})</span>
        </button>
      )}
    </>
  );
};

export default Detailspage;
