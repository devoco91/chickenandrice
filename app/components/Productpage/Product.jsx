// components/FastFoodProducts.jsx
"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { incrementQuantity, decrementQuantity } from "./../../store/cartSlice";
import { setMeals } from "./../../store/mealsSlice";
import {
  ShoppingCart,
  Plus,
  Minus,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE } from "../../../app/utils/apiBase";
import { getImageUrl } from "../../../app/utils/img";

// ---- helpers (exported for tests) ----
export const toBool = (v) =>
  v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true";

export const isPopularItem = (p) => {
  const tagPopular =
    Array.isArray(p?.tags) &&
    p.tags.some((t) => String(t).trim().toLowerCase() === "popular");
  const flagPopular =
    p?.isPopular === true || p?.popular === true || p?.featured === true;
  return tagPopular || flagPopular;
};

export const paginate = (arr, page, per) =>
  Array.isArray(arr) && per > 0 && page > 0
    ? arr.slice((page - 1) * per, page * per)
    : [];

const clamp = (n, min, max) => Math.max(min, Math.min(n, max || min));
const formatNaira = (n) =>
  typeof n === "number"
    ? n.toLocaleString("en-NG", { maximumFractionDigits: 0 })
    : String(n || "");

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
      <button onClick={() => go(1)} disabled={page === 1} className="h-9 px-3 rounded-lg bg-white/70 backdrop-blur border border-gray-200 hover:bg-white disabled:opacity-50 shadow-sm" aria-label="First page">
        <ChevronsLeft className="w-4 h-4" />
      </button>
      <button onClick={() => go(page - 1)} disabled={page === 1} className="h-9 px-3 rounded-lg bg-white/70 backdrop-blur border border-gray-200 hover:bg-white disabled:opacity-50 shadow-sm" aria-label="Previous page">
        <ChevronLeft className="w-4 h-4" />
      </button>

      {begin > 1 && (
        <>
          <button onClick={() => go(1)} className="h-9 min-w-9 px-3 rounded-lg bg-white/90 border border-gray-200 hover:bg-white shadow-sm" aria-label="Go to page 1">
            1
          </button>
          <span className="px-1 text-gray-500">…</span>
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => go(p)}
          aria-current={p === page ? "page" : undefined}
          className={[
            "h-9 min-w-9 px-3 rounded-lg border shadow-sm",
            p === page ? "bg-emerald-600 text-white border-emerald-600" : "bg-white/90 border-gray-200 hover:bg-white",
          ].join(" ")}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          <span className="px-1 text-gray-500">…</span>
          <button onClick={() => go(totalPages)} className="h-9 min-w-9 px-3 rounded-lg bg-white/90 border border-gray-200 hover:bg-white shadow-sm" aria-label={`Go to page ${totalPages}`}>
            {totalPages}
          </button>
        </>
      )}

      <button onClick={() => go(page + 1)} disabled={page === totalPages} className="h-9 px-3 rounded-lg bg-white/70 backdrop-blur border border-gray-200 hover:bg-white disabled:opacity-50 shadow-sm" aria-label="Next page">
        <ChevronRight className="w-4 h-4" />
      </button>
      <button onClick={() => go(totalPages)} disabled={page === totalPages} className="h-9 px-3 rounded-lg bg-white/70 backdrop-blur border border-gray-200 hover:bg-white disabled:opacity-50 shadow-sm" aria-label="Last page">
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

  const itemsPerPage = 9;
  const [allPage, setAllPage] = useState(1);
  const [popularPage, setPopularPage] = useState(1);

  // One-time override to force Fit by default after deploy
  useEffect(() => {
    try {
      if (localStorage.getItem("imgFitMode") !== "contain") {
        localStorage.setItem("imgFitMode", "contain");
      }
    } catch {}
  }, []);

  const [fitMode, setFitMode] = useState(() => {
    try { return localStorage.getItem("imgFitMode") || "contain"; } catch { return "contain"; }
  });
  useEffect(() => { try { localStorage.setItem("imgFitMode", fitMode); } catch {} }, [fitMode]);

  const [zoomSrc, setZoomSrc] = useState(null);

  const getQuantity = (id) => cartItems.find((i) => i._id === id)?.quantity || 0;

  const handleAddToCart = (product) => {
    try { localStorage.setItem("pendingProduct", JSON.stringify(product)); } catch {}
    if (typeof onRequireLocation === "function") onRequireLocation(product._id);
  };
  const handleIncrement = (id) => dispatch(incrementQuantity(id));
  const handleDecrement = (id) => dispatch(decrementQuantity(id));

  useEffect(() => {
    let aborted = false;
    const fetchProducts = async () => {
      try {
        let url = `${API_BASE}/foods`;
        if (location?.isConfirmed && location?.state && location?.lga) {
          url = `${API_BASE}/foods?state=${encodeURIComponent(location.state)}&lga=${encodeURIComponent(location.lga)}`;
        }
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
        const data = await res.json();
        if (!aborted) { setProducts(data); dispatch(setMeals(data)); }
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        if (!aborted) setLoading(false);
      }
    };

    if (mealsFromStore?.length) {
      setProducts(mealsFromStore);
      setLoading(false);
    } else if (!products.length) {
      fetchProducts();
    } else {
      setLoading(false);
    }
    return () => { aborted = true; };
  }, [location?.isConfirmed, location?.state, location?.lga, mealsFromStore, dispatch]);

  const popularProducts = useMemo(() => products.filter(isPopularItem), [products]);

  const allTotalPages = Math.max(1, Math.ceil((products.length || 0) / itemsPerPage));
  const popularTotalPages = Math.max(1, Math.ceil((popularProducts.length || 0) / itemsPerPage));
  useEffect(() => {
    const fixedAll = clamp(allPage, 1, allTotalPages);
    if (fixedAll !== allPage) setAllPage(fixedAll);
    const fixedPop = clamp(popularPage, 1, popularTotalPages);
    if (fixedPop !== popularPage) setPopularPage(fixedPop);
  }, [products.length, popularProducts.length]);

  const paginatedAll = paginate(products, allPage, itemsPerPage);
  const paginatedPopular = paginate(popularProducts, popularPage, itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(16,185,129,0.12),rgba(255,255,255,0))]" />
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-3xl overflow-hidden bg-white/70 backdrop-blur border border-gray-100 shadow-sm">
                <div className="animate-pulse">
                  <div className="h-56 bg-gray-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 w-2/3 bg-gray-200 rounded" />
                    <div className="h-4 w-1/3 bg-gray-200 rounded" />
                    <div className="h-10 w-full bg-gray-200 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderCard = (product, idx) => {
    const quantity = getQuantity(product._id);
    const src = getImageUrl(product.image);

    const imgFit = fitMode === "contain" ? "object-contain" : "object-cover";
    const mediaAspect = fitMode === "contain" ? "aspect-[16/10]" : "aspect-[4/3]";

    return (
      <motion.div
        key={product._id}
        className="group bg-white/90 backdrop-blur rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(idx * 0.03, 0.18), duration: 0.35, ease: "easeOut" }}
      >
        <div className={`relative ${mediaAspect} w-[120%] -mx-[10%] rounded-t-3xl overflow-hidden bg-gray-100`}>
          <motion.img
            src={src}
            alt={product.name}
            className={`${imgFit} w-full h-full will-change-transform cursor-zoom-in group-hover:brightness-110 group-hover:contrast-105`}
            loading="lazy"
            onError={(e) => (e.currentTarget.src = "/fallback.jpg")}
            whileHover={fitMode === "cover" ? { scale: 1.08 } : { scale: 1.05 }}
            transition={{ type: "spring", stiffness: 120, damping: 16 }}
            onClick={() => setZoomSrc(src)}
          />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
          {isPopularItem(product) && (
            <div className="absolute top-3 right-5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 backdrop-blur border border-white/60 shadow">
              ⭐ Popular
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col grow">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 leading-snug break-words line-clamp-2 md:line-clamp-3 lg:line-clamp-none">
              {product.name}
            </h3>
            <p className="text-emerald-700 font-extrabold text-lg shrink-0 group-hover:text-emerald-800">
              ₦{formatNaira(product.price)}
            </p>
          </div>

          <div className="mt-1 hidden sm:flex items-center text-yellow-500">
            {[1, 2, 3, 4].map((i) => <Star key={i} className="w-4 h-4 fill-yellow-500" />)}
            <Star className="w-4 h-4 fill-yellow-500" style={{ clipPath: "inset(0 50% 0 0)" }} />
          </div>

          {product.description ? (
            <p className="mt-2 text-sm text-gray-600 group-hover:text-gray-700 line-clamp-2 break-words">
              {product.description}
            </p>
          ) : null}

          <div className="mt-4 md:mt-auto">
            {quantity > 0 ? (
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-1.5">
                <button onClick={() => dispatch(decrementQuantity(product._id))} className="px-3 py-2 rounded-lg hover:bg-white active:scale-95 transition" aria-label="Decrease">
                  <Minus className="w-5 h-5" />
                </button>
                <span className="min-w-8 text-center font-semibold">{quantity}</span>
                <button onClick={() => dispatch(incrementQuantity(product._id))} className="px-3 py-2 rounded-lg hover:bg-white active:scale-95 transition" aria-label="Increase">
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
    <div className="min-h-screen relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_60%_at_50%_-10%,rgba(16,185,129,0.15),rgba(255,255,255,0)),radial-gradient(40%_30%_at_100%_10%,rgba(59,130,246,0.12),rgba(255,255,255,0))]" />
      <div className="max-w-7xl mx-auto px-4 pt-4">
        {/* Fit/Fill toggle */}
        <div className="mb-3 flex items-center justify-end">
          <div className="inline-flex rounded-xl bg-white/70 backdrop-blur p-1 shadow-inner border border-gray-200">
            <button
              type="button"
              onClick={() => setFitMode("cover")}
              className={`px-3 py-1.5 rounded-lg text-sm ${fitMode === "cover" ? "bg-white shadow border border-gray-200" : "opacity-75 hover:opacity-100"}`}
              aria-pressed={fitMode === "cover"}
              title="Fill image (may crop slightly)"
            >
              Fill
            </button>
            <button
              type="button"
              onClick={() => setFitMode("contain")}
              className={`px-3 py-1.5 rounded-lg text-sm ${fitMode === "contain" ? "bg-white shadow border border-gray-200" : "opacity-75 hover:opacity-100"}`}
              aria-pressed={fitMode === "contain"}
              title="Show entire photo (no crop)"
            >
              Fit
            </button>
          </div>
        </div>

        {/* Popular Items */}
        <section id="popular-items" className="mb-8">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-2xl md:text-3xl font-bold">🔥 Popular Items</h2>
            <div className="text-sm text-gray-500">{popularProducts.length} item(s)</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedPopular.map((p, idx) => renderCard(p, idx))}
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

        {/* All Items */}
        <section id="all-items" className="pb-10">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-2xl md:text-3xl font-bold">🍲 All Items</h2>
            <div className="text-sm text-gray-500">{products.length} item(s)</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedAll.map((p, idx) => renderCard(p, idx))}
          </div>

          {allTotalPages > 1 && (
            <Pagination
              id="all"
              page={allPage}
              totalPages={allTotalPages}
              onChange={(p) => setAllPage(clamp(p, 1, allTotalPages))}
            />
          )}
        </section>
      </div>

      {/* Image Zoom Modal */}
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
              <button className="absolute -top-10 right-0 text-white/80 hover:text-white" onClick={() => setZoomSrc(null)} aria-label="Close">
                <X className="w-6 h-6" />
              </button>
              <img src={zoomSrc} alt="Zoomed food" className="w-full h-auto rounded-2xl object-contain shadow-2xl" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FastFoodProducts;
