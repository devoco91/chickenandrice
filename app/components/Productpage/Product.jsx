"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { incrementQuantity, decrementQuantity } from "./../../store/cartSlice";
import { setMeals } from "./../../store/mealsSlice";
import {
  ShoppingCart,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { API_BASE } from "../../../app/utils/apiBase";
import { getImageUrl, buildImgSources } from "../../../app/utils/img";
import MinOrderNotice from "../MinOrderNotice";
import SupportWhatsApp from "../SupportWhatsApp"; // <-- added

/* Popular logic */
export const isPopularItem = (p) => {
  const tagPopular =
    Array.isArray(p?.tags) &&
    p.tags.some((t) => String(t).trim().toLowerCase() === "popular");
  const flagPopular =
    p?.isPopular === true || p?.popular === true || p?.featured === true;
  return tagPopular || flagPopular;
};

/* Pagination helper */
export const paginate = (arr, page, per) =>
  Array.isArray(arr) && per > 0 && page > 0 ? arr.slice((page - 1) * per, page * per) : [];

const clamp = (n, min, max) => Math.max(min, Math.min(n, max || min));
const formatNaira = (n) =>
  typeof n === "number" ? n.toLocaleString("en-NG", { maximumFractionDigits: 0 }) : String(n || "");

/* Food-filled wallpaper */
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

/* UI tokens */
const MEDIA_H = "h-[170px] sm:h-[185px] md:h-[200px] lg:h-[210px] xl:h-[220px]";
const BORDER_SOFT = "border-orange-200";

/* Pagination UI */
const Pagination = ({ id, page, totalPages, onChange }) => {
  const windowSize = 5;
  const start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  const begin = Math.max(1, end - windowSize + 1);
  const pages = [];
  for (let p = begin; p <= end; p += 1) pages.push(p);

  const go = (next) => {
    const val = clamp(next, 1, totalPages);
    onChange(val);
    const el = document.getElementById(id === "popular" ? "popular-items" : "all-items");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowLeft") go(page - 1);
      if (e.key === "ArrowRight") go(page + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [page, totalPages]);

  return (
    <nav aria-label={`${id} pagination`} className="mt-6 flex items-center justify-center gap-1.5 select-none">
      <button
        onClick={() => go(1)}
        disabled={page === 1}
        className={`h-9 px-3 rounded-lg bg-white/80 border ${BORDER_SOFT} hover:bg-white disabled:opacity-50 shadow-sm`}
      >
        <ChevronsLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => go(page - 1)}
        disabled={page === 1}
        className={`h-9 px-3 rounded-lg bg-white/80 border ${BORDER_SOFT} hover:bg-white disabled:opacity-50 shadow-sm`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {begin > 1 && (
        <>
          <button
            onClick={() => go(1)}
            className={`h-9 min-w-9 px-3 rounded-lg bg-white border ${BORDER_SOFT} hover:bg-orange-50 shadow-sm`}
          >
            1
          </button>
          <span className="px-1 text-orange-600/70">…</span>
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => go(p)}
          aria-current={p === page ? "page" : undefined}
          className={[
            "h-9 min-w-9 px-3 rounded-lg border shadow-sm",
            p === page ? "text-white" : `bg-white border ${BORDER_SOFT} hover:bg-orange-50`,
          ].join(" ")}
          style={
            p === page
              ? { backgroundColor: "oklch(85.2% 0.199 91.936)", borderColor: "oklch(85.2% 0.199 91.936)" }
              : undefined
          }
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          <span className="px-1 text-orange-600/70">…</span>
          <button
            onClick={() => go(totalPages)}
            className={`h-9 min-w-9 px-3 rounded-lg bg-white border ${BORDER_SOFT} hover:bg-orange-50 shadow-sm`}
          >
            {totalPages}
          </button>
        </>
      )}
      <button
        onClick={() => go(page + 1)}
        disabled={page === totalPages}
        className={`h-9 px-3 rounded-lg bg-white/80 border ${BORDER_SOFT} hover:bg-white disabled:opacity-50 shadow-sm`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <button
        onClick={() => go(totalPages)}
        disabled={page === totalPages}
        className={`h-9 px-3 rounded-lg bg-white/80 border ${BORDER_SOFT} hover:bg-white disabled:opacity-50 shadow-sm`}
      >
        <ChevronsRight className="w-4 h-4" />
      </button>
    </nav>
  );
};

const FastFoodProducts = ({ onRequireLocation }) => {
  const dispatch = useDispatch();
  const cartItems = useSelector((s) => s.cart.cartItem);
  const location = useSelector((s) => s.location);
  const mealsFromStore = useSelector((s) => s.meals.meals);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const itemsPerPage = 10;
  const [allPage, setAllPage] = useState(1);
  const [popularPage, setPopularPage] = useState(1);

  useEffect(() => {
    let aborted = false;
    const fetchProducts = async () => {
      try {
        let url = `${API_BASE}/foods`;
        if (location?.isConfirmed && location?.state && location?.lga) {
          url = `${API_BASE}/foods?state=${encodeURIComponent(location.state)}&lga=${encodeURIComponent(
            location.lga
          )}`;
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
      } finally {
        if (!aborted) setLoading(false);
      }
    };

    if (mealsFromStore?.length) {
      setProducts(mealsFromStore);
      setLoading(false);
    } else {
      fetchProducts();
    }
    return () => {
      aborted = true;
    };
  }, [location?.isConfirmed, location?.state, location?.lga, mealsFromStore, dispatch]);

  const popularProducts = useMemo(() => products.filter(isPopularItem), [products]);

  const allTotalPages = Math.max(1, Math.ceil((products.length || 0) / itemsPerPage));
  const popularTotalPages = Math.max(1, Math.ceil((popularProducts.length || 0) / itemsPerPage));

  useEffect(() => {
    if (allPage > allTotalPages) setAllPage(allTotalPages);
    if (popularPage > popularTotalPages) setPopularPage(popularTotalPages);
  }, [products.length, popularProducts.length]); // keep deps in sync

  const getQuantity = (id) => cartItems.find((i) => i._id === id)?.quantity || 0;

  const handleAddToCart = (product) => {
    try {
      localStorage.setItem("pendingProduct", JSON.stringify(product));
    } catch {}
    if (typeof onRequireLocation === "function") onRequireLocation(product._id);
  };
  const handleIncrement = (id) => dispatch(incrementQuantity(id));
  const handleDecrement = (id) => dispatch(decrementQuantity(id));

  const handleCardClick = (product) => {
    const qty = getQuantity(product._id);
    if (qty > 0) dispatch(incrementQuantity(product._id));
    else handleAddToCart(product);
  };

  const renderCard = (product, idx) => {
    const quantity = getQuantity(product._id);
    const { src, srcSet, sizes } = buildImgSources(product.image);

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
        {/* FIXED 2-LINE HEADER */}
        <div className={`px-4 border-b ${BORDER_SOFT} h-[56px] md:h-[60px] flex items-center`}>
          <h3 className="text-[15px] md:text-base font-semibold text-gray-900 leading-snug line-clamp-2">
            {product.name}
          </h3>
        </div>

        {/* IMAGE */}
        <div className={`relative ${MEDIA_H} w-full bg-white`}>
          <motion.img
            src={src}
            srcSet={srcSet}
            sizes={sizes}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => (e.currentTarget.src = "/fallback.jpg")}
            loading="lazy"
            decoding="async"
            fetchPriority={idx === 0 ? "high" : "low"}   // ✅ camelCase fixes React warning
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

        {/* ACTIONS (no wrap at ≤403px) */}
        <div className="px-4 pt-3 pb-4 mt-auto">
          {quantity > 0 ? (
            <div
              className={`flex items-center justify-between flex-nowrap whitespace-nowrap gap-2 max-[403px]:gap-1 rounded-xl p-1.5 bg-white border ${BORDER_SOFT}`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDecrement(product._id);
                }}
                className="px-3 py-2 max-[403px]:p-2 rounded-lg hover:bg-orange-50"
              >
                <Minus className="w-5 h-5 max-[403px]:w-4 max-[403px]:h-4" />
              </button>
              <span className="min-w-8 text-center font-semibold max-[403px]:text-sm">{quantity}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleIncrement(product._id);
                }}
                className="px-3 py-2 max-[403px]:p-2 rounded-lg hover:bg-orange-50"
              >
                <Plus className="w-5 h-5 max-[403px]:w-4 max-[403px]:h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick(product);
              }}
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
        className="min-h-screen relative"
        style={{ backgroundColor: "#fff6e5", backgroundImage: PATTERN_URL, backgroundRepeat: "repeat", backgroundSize: "220px 220px" }}
      >
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <MinOrderNotice />
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 pt-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className={`rounded-2xl overflow-hidden bg-white border ${BORDER_SOFT} shadow-sm`}>
                <div className="animate-pulse">
                  <div className={`px-4 h-[56px] md:h-[60px] flex items-center border-b ${BORDER_SOFT}`}>
                    <div className="h-4 w-3/4 bg-orange-100 rounded" />
                  </div>
                  <div className={`${MEDIA_H} bg-orange-50`} />
                  <div className="px-4 pt-3 pb-4">
                    <div className="h-10 w-full bg-orange-100 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating WhatsApp support */}
        <SupportWhatsApp />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: "#fff6e5", backgroundImage: PATTERN_URL, backgroundRepeat: "repeat", backgroundSize: "220px 220px" }}
    >
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <MinOrderNotice />

        {/* Popular */}
        <section id="popular-items" className="mb-8">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">🔥 Popular Items</h2>
            <div className="text-sm text-gray-600">{products.filter(isPopularItem).length} item(s)</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {paginate(popularProducts, popularPage, itemsPerPage).map((p, idx) => renderCard(p, idx))}
          </div>
          {popularTotalPages > 1 && (
            <Pagination
              id="popular"
              page={popularPage}
              totalPages={popularTotalPages}
              onChange={(p) => setPopularPage(clamp(p, 1, popularTotalPages))}
            />
          )}
        </section>

        {/* All */}
        <section id="all-items" className="pb-10">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">🍲 All Items</h2>
            <div className="text-sm text-gray-600">{products.length} item(s)</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {paginate(products, allPage, itemsPerPage).map((p, idx) => renderCard(p, idx))}
          </div>
          {Math.max(1, Math.ceil((products.length || 0) / itemsPerPage)) > 1 && (
            <Pagination
              id="all"
              page={allPage}
              totalPages={Math.max(1, Math.ceil((products.length || 0) / itemsPerPage))}
              onChange={(p) => setAllPage(clamp(p, 1, Math.max(1, Math.ceil((products.length || 0) / itemsPerPage))))}
            />
          )}
        </section>
      </div>

      {/* Floating WhatsApp support */}
      <SupportWhatsApp />
    </div>
  );
};

export default FastFoodProducts;
