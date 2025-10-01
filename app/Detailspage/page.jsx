// app/Detailspage/page.jsx
"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  incrementQuantity,
  decrementQuantity,
  addItemCart,
  resetCart,
} from "./../store/cartSlice";
import { setMeals, resetMeals } from "./../store/mealsSlice";
import { resetLocation } from "./../store/locationSlice";
import { ShoppingCart, Plus, Minus, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar/Navbar";
import { motion, AnimatePresence } from "framer-motion";

const RAW = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/+$/, "");
const API_BASE = /\/api(?:\/v\d+)?$/i.test(RAW) ? RAW : `${RAW}/api`;
const EXPLICIT_UPLOADS_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_UPLOADS_BASE ||
  process.env.NEXT_PUBLIC_IMAGE_BASE_URL ||
  ""
).replace(/\/+$/, "");
const API_ROOT = API_BASE.replace(/\/api(?:\/v\d+)?$/i, "");
const UPLOADS_BASE = EXPLICIT_UPLOADS_BASE || `${API_ROOT}/uploads`;

const getImageUrl = (val) => {
  let s = val;
  if (!s) return "/placeholder.png";
  if (typeof s !== "string") {
    try {
      if (Array.isArray(s)) s = s[0] || "";
      else if (typeof s === "object") s = s.url || s.path || s.filename || s.filepath || "";
    } catch {}
  }
  if (!s) return "/placeholder.png";
  if (/^https?:\/\//i.test(s)) return s;
  const cleaned = String(s).replace(/\\/g, "/").replace(/^\/+/, "").replace(/^uploads\//i, "");
  return `${UPLOADS_BASE}/${encodeURI(cleaned)}`;
};

const formatNaira = (n) =>
  typeof n === "number" ? n.toLocaleString("en-NG", { maximumFractionDigits: 0 }) : String(n || "");

const Detailspage = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const cartItems = useSelector((s) => s.cart.cartItem);
  const location = useSelector((s) => s.location);
  const mealsFromStore = useSelector((s) => s.meals.meals);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Force default image fit to "contain" once after deploy
  useEffect(() => {
    try {
      if (localStorage.getItem("imgFitMode") !== "contain") {
        localStorage.setItem("imgFitMode", "contain");
      }
    } catch {}
  }, []);

  // Default to FIT (contain). Respects saved preference (now set by the override above).
  const [fitMode, setFitMode] = useState(() => {
    try { return localStorage.getItem("imgFitMode") || "contain"; } catch { return "contain"; }
  });
  useEffect(() => { try { localStorage.setItem("imgFitMode", fitMode); } catch {} }, [fitMode]);

  const [zoomSrc, setZoomSrc] = useState(null);

  const getQuantity = (id) => {
    const item = cartItems.find((i) => i._id === id);
    return item ? item.quantity : 0;
  };

  const handleAddToCart = (product) => {
    const cartProduct = { ...product };
    if (location?.isConfirmed) {
      dispatch(addItemCart(cartProduct));
    } else {
      try { localStorage.setItem("pendingProduct", JSON.stringify(cartProduct)); } catch {}
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
          setLoading(false);
          return;
        }
        let url = `${API_BASE}/foods`;
        if (location?.isConfirmed && location?.state && location?.lga) {
          url = `${API_BASE}/foods?state=${encodeURIComponent(location.state)}&lga=${encodeURIComponent(location.lga)}`;
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

  const popularProducts = useMemo(() => products.filter((p) => p?.isPopular === true), [products]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <p className="text-xl text-gray-700 animate-pulse">Loading menu...</p>
      </div>
    );
  }

  const renderCard = (product, idx) => {
    const quantity = getQuantity(product._id);
    const src = getImageUrl(product.image); // <-- fixed

    const imgFit = fitMode === "contain" ? "object-contain" : "object-cover";
    const mediaAspect = fitMode === "contain" ? "aspect-[16/10]" : "aspect-[4/3]";

    return (
      <motion.div
        key={product._id}
        className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(idx * 0.03, 0.18), duration: 0.35, ease: "easeOut" }}
      >
        <div className={`relative ${mediaAspect} w-[120%] -mx-[10%] rounded-t-3xl overflow-hidden bg-gray-100`}>
          <img
            src={src}
            alt={product.name}
            className={`${imgFit} w-full h-full transition-transform duration-500 ${fitMode === "cover" ? "group-hover:scale-[1.04]" : ""} cursor-zoom-in`}
            loading="lazy"
            onError={(e) => (e.currentTarget.src = "/placeholder.png")}
            onClick={() => setZoomSrc(src)}
          />
        </div>

        <div className="p-5 flex flex-col grow">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 leading-snug break-words line-clamp-2 md:line-clamp-3 lg:line-clamp-none">
              {product.name}
            </h3>
            <p className="text-emerald-700 font-extrabold text-lg shrink-0">
              ₦{formatNaira(product.price)}
            </p>
          </div>

          {product.description ? (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2 break-words">{product.description}</p>
          ) : null}

          <div className="mt-2 flex items-center text-yellow-500">
            {[1, 2, 3, 4].map((i) => <Star key={i} className="w-4 h-4 fill-yellow-500" />)}
            <Star className="w-4 h-4 fill-yellow-500" style={{ clipPath: "inset(0 50% 0 0)" }} />
          </div>

          <div className="mt-4 md:mt-auto">
            {quantity > 0 ? (
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-1.5">
                <button onClick={() => handleDecrement(product._id)} className="px-3 py-2 rounded-lg hover:bg-white active:scale-95 transition" aria-label="Decrease">
                  <Minus className="w-5 h-5" />
                </button>
                <span className="min-w-8 text-center font-semibold">{quantity}</span>
                <button onClick={() => handleIncrement(product._id)} className="px-3 py-2 rounded-lg hover:bg-white active:scale-95 transition" aria-label="Increase">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleAddToCart(product)}
                className="w-full bg-emerald-600 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-[0.99] transition shadow"
              >
                <ShoppingCart className="w-5 h-5" /> Add to Cart
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-green-50 pt-24">
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_60%_at_50%_-10%,rgba(16,185,129,0.12),rgba(255,255,255,0)),radial-gradient(40%_30%_at_100%_10%,rgba(59,130,246,0.10),rgba(255,255,255,0))]" />
        <div className="relative max-w-7xl mx-auto px-6 py-10">
          <div className="flex justify-end mb-10">
            <button
              onClick={handleChangeLocation}
              className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-5 py-2.5 rounded-xl shadow hover:opacity-95 transition"
            >
              Change Location
            </button>
          </div>

          {/* Popular Items */}
          <section className="mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">🔥 Popular Items</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {popularProducts.map((p, idx) => renderCard(p, idx))}
            </div>
          </section>

          {/* All Items */}
          <section>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">🍲 All Items</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((p, idx) => renderCard(p, idx))}
            </div>
          </section>
        </div>
      </div>

      {cartItems.length > 0 && (
        <button
          onClick={() => router.push("/cart")}
          className="fixed bottom-20 right-6 bg-gradient-to-r from-red-600 to-rose-600 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2 hover:opacity-90 transition z-50"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="font-semibold">({cartItems.length})</span>
        </button>
      )}

      <AnimatePresence>
        {zoomSrc && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomSrc(null)}
          >
            <motion.div
              className="relative max-w-5xl w-full"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute -top-10 right-0 text-white/80 hover:text-white"
                onClick={() => setZoomSrc(null)}
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
              <img src={zoomSrc} alt="Zoomed food" className="w-full h-auto rounded-2xl object-contain shadow-2xl" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Detailspage;
