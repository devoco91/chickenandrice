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
import { ShoppingCart, Plus, Minus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar/Navbar";
import MinOrderNotice from "../components/MinOrderNotice";
import { motion, AnimatePresence } from "framer-motion";

/* API + image utils */
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

/* Match product page helpers/skin */
export const isPopularItem = (p) => {
  const tagPopular = Array.isArray(p?.tags) && p.tags.some((t) => String(t).trim().toLowerCase() === "popular");
  const flagPopular = p?.isPopular === true || p?.popular === true || p?.featured === true;
  return tagPopular || flagPopular;
};
const PATTERN_SVG = encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'>
  <g stroke='#e7d8bf' stroke-width='2' fill='none' opacity='0.65' stroke-linecap='round' stroke-linejoin='round'>
    <path d='M20 60h80a28 28 0 0 1-28 28H48A28 28 0 0 1 20 60z'/><path d='M15 60h90'/>
    <circle cx='160' cy='52' r='20'/>
    <path d='M185 90c8 0 14 6 14 14s-6 14-14 14c-8 0-14-6-14-14s6-14 14-14z'/><path d='M185 118v22'/>
    <path d='M40 150c20-22 52-22 72 0-10 20-32 28-52 20l-10 10a8 8 0 1 1-11-11l10-10'/>
    <circle cx='135' cy='150' r='12'/><path d='M135 138l4 -6m-4 6l-4 -6'/>
    <path d='M170 165c10-10 25-10 30 2-8 6-18 10-30 -2z'/>
  </g>
</svg>
`);
const PATTERN_URL = `url("data:image/svg+xml,${PATTERN_SVG}")`;
const MEDIA_H = "h-[170px] sm:h-[185px] md:h-[200px] lg:h-[210px] xl:h-[220px]";
const BORDER_SOFT = "border-orange-200";

const Detailspage = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const cartItems = useSelector((s) => s.cart.cartItem);
  const location = useSelector((s) => s.location);
  const mealsFromStore = useSelector((s) => s.meals.meals);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Floating cart state */
  const totalPacks = useMemo(
    () => (Array.isArray(cartItems) ? cartItems.reduce((s, i) => s + (i?.quantity || 0), 0) : 0),
    [cartItems]
  );
  const [message, setMessage] = useState("");

  const handleCartFabClick = () => {
    if (totalPacks < 3) {
      setMessage(
        `⚠️ You currently have ${totalPacks} item${totalPacks === 1 ? "" : "s"}. Minimum of 3 items required before checkout.`
      );
      setTimeout(() => setMessage(""), 6000);
      return;
    }
    router.push("/cart");
  };

  const getQuantity = (id) => cartItems.find((i) => i._id === id)?.quantity || 0;

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

  const popularProducts = useMemo(() => products.filter(isPopularItem), [products]);

  const handleCardClick = (product) => {
    const qty = getQuantity(product._id);
    if (qty > 0) dispatch(incrementQuantity(product._id));
    else handleAddToCart(product);
  };
  const stopEnterSpace = (e) => {
    if (e.key === "Enter" || e.key === " ") e.stopPropagation(); // prevent double fire from card
  };

  const renderCard = (product, idx) => {
    const quantity = getQuantity(product._id);
    const src = getImageUrl(product.image);

    return (
      <motion.div
        key={product._id}
        role="button"
        tabIndex={0}
        onClick={() => handleCardClick(product)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleCardClick(product)}
        className={`group rounded-2xl overflow-hidden border ${BORDER_SOFT} bg-white shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col`}
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(idx * 0.02, 0.16), duration: 0.3, ease: "easeOut" }}
      >
        <div className={`px-4 border-b ${BORDER_SOFT} h-[56px] md:h-[60px] flex items-center`}>
          <h3 className="text-[15px] md:text-base font-semibold text-gray-900 leading-snug line-clamp-2">
            {product.name}
          </h3>
        </div>

        <div className={`relative ${MEDIA_H} w-full bg-white`}>
          <motion.img
            src={src}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => (e.currentTarget.src = "/fallback.jpg")}
          />
          {isPopularItem(product) && (
            <span className="absolute top-2 left-2 bg-red-600 text-white text-[11px] font-semibold px-2 py-[2px] rounded">
              Popular
            </span>
          )}
          <span className="absolute bottom-2 right-2 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
            ₦{formatNaira(product.price)}
          </span>
        </div>

        <div className="px-4 pt-3 pb-4 mt-auto">
          {quantity > 0 ? (
            /* === Compact, no-wrap controls === */
            <div
              className={`flex items-center justify-between flex-nowrap whitespace-nowrap gap-2 max-[403px]:gap-1 rounded-xl p-1.5 bg-white border ${BORDER_SOFT}`}
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleDecrement(product._id); }}
                onKeyDown={stopEnterSpace}
                className="px-3 py-2 max-[403px]:p-2 rounded-lg hover:bg-orange-50"
              >
                <Minus className="w-5 h-5 max-[403px]:w-4 max-[403px]:h-4" />
              </button>

              <span className="min-w-8 text-center font-semibold max-[403px]:text-sm">
                {quantity}
              </span>

              <button
                onClick={(e) => { e.stopPropagation(); handleIncrement(product._id); }}
                onKeyDown={stopEnterSpace}
                className="px-3 py-2 max-[403px]:p-2 rounded-lg hover:bg-orange-50"
              >
                <Plus className="w-5 h-5 max-[403px]:w-4 max-[403px]:h-4" />
              </button>
            </div>
          ) : (
            /* === Compact, no-wrap CTA === */
            <button
              onClick={(e) => { e.stopPropagation(); handleCardClick(product); }}
              onKeyDown={stopEnterSpace}
              className="w-full text-white px-4 py-3 max-[403px]:px-3 max-[403px]:py-2 rounded-xl flex items-center justify-center gap-2 max-[403px]:gap-1 whitespace-nowrap transition shadow"
              style={{ backgroundColor: "#2563eb" }} /* blue-600 */
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1d4ed8")} /* blue-700 */
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
            >
              <ShoppingCart className="w-5 h-5 max-[403px]:w-4 max-[403px]:h-4" />
              <span className="max-[403px]:text-sm">Add to Cart</span>
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#fff6e5", backgroundImage: PATTERN_URL, backgroundRepeat: "repeat", backgroundSize: "220px 220px" }}
      >
        <p className="text-xl text-gray-700 animate-pulse">Loading menu...</p>
      </div>
    );
  }

  const isInactive = totalPacks === 0;

  return (
    <>
      <Navbar />
      <div
        className="min-h-screen relative overflow-hidden pt-16"
        style={{ backgroundColor: "#fff6e5", backgroundImage: PATTERN_URL, backgroundRepeat: "repeat", backgroundSize: "220px 220px" }}
      >
        <div className="relative max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-end mb-6">
            <button
              onClick={handleChangeLocation}
              className="text-white px-5 py-2.5 rounded-xl shadow hover:opacity-95 transition"
              style={{ backgroundColor: "oklch(85.2% 0.199 91.936)" }}
            >
              Change Location
            </button>
          </div>

          <MinOrderNotice />

          <section className="mb-12" id="popular-items">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">🔥 Popular Items</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {popularProducts.map((p, idx) => renderCard(p, idx))}
            </div>
          </section>

          <section id="all-items">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">🍲 All Items</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {products.map((p, idx) => renderCard(p, idx))}
            </div>
          </section>
        </div>
      </div>

      {/* Right-side FAB + message beneath */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col items-end gap-2">
        <button
          onClick={handleCartFabClick}
          aria-disabled={isInactive}
          data-inactive={isInactive ? "true" : "false"}
          className={[
            "text-white px-5 py-3 rounded-full shadow-lg",
            "flex items-center gap-2 hover:opacity-90 transition relative",
            isInactive ? "opacity-50 cursor-not-allowed" : "",
          ].join(" ")}
          style={{ backgroundColor: "#2563eb" }} /* blue-600 */
          aria-label="Open cart"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="font-semibold">( {totalPacks} )</span>
          {totalPacks > 0 && (
            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[11px] font-bold rounded-full min-w-5 h-5 px-[6px] flex items-center justify-center shadow-md">
              {totalPacks}
            </span>
          )}
        </button>

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="max-w-[260px] bg-white border border-red-200 text-red-700 font-semibold text-sm rounded-xl px-3 py-2 shadow-lg"
              aria-live="polite"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Optional: image zoom modal kept from prior versions if needed */}
      <AnimatePresence>{/* ... */}</AnimatePresence>
    </>
  );
};

export default Detailspage;
