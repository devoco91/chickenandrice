"use client";

import { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";

import { setLocation } from "../../store/locationSlice";
import { setMeals } from "../../store/mealsSlice";
import { addItemCart } from "../../store/cartSlice";

import LocationSelector from "../LocationSelector/LocationSelector";

export default function LocationModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  const mealId = searchParams.get("mealId");

  const [location, setLocationState] = useState({ state: "", lga: "" });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [countdown, setCountdown] = useState(0);

  // why: debounce auto-search to avoid hammering API while user is still choosing
  const debounceRef = useRef(null);

  // helper: always close the modal when navigating away
  const closeAndNavigate = (path) => {
    if (typeof onClose === "function") onClose();
    router.push(path);
  };

  useEffect(() => {
    if (!status || status === "available") return;
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    } else if (countdown === 0 && status) {
      handleRedirect(status);
    }
    return () => clearTimeout(timer);
  }, [countdown, status]);

  const handleRedirect = (status) => {
    if (status === "alternatives") {
      closeAndNavigate("/Detailspage");
    } else {
      closeAndNavigate("/");
    }
  };

  const handleClose = () => {
    // go to homepage and hide modal
    closeAndNavigate("/");
  };

  const addPendingProductToCart = () => {
    const pending = localStorage.getItem("pendingProduct");
    if (pending) {
      const parsed = JSON.parse(pending);
      dispatch(addItemCart(parsed));
      localStorage.removeItem("pendingProduct");
    }
  };

  const clearPendingProduct = () => localStorage.removeItem("pendingProduct");

  const checkMealAvailability = async () => {
    const res = await fetch(
      `/api/check-meal/${mealId}?state=${location.state}&lga=${location.lga}`
    );
    if (!res.ok) throw new Error("Failed to check availability");
    return res.json();
  };

  const handleConfirm = async () => {
    if (!location.state || !location.lga) {
      alert("Please select state and LGA");
      return;
    }

    try {
      setLoading(true);
      const data = await checkMealAvailability();
      dispatch(setLocation({ ...location, isConfirmed: true }));

      if (data.available) {
        // Available: auto-add pending product to cart, show buttons
        await addPendingProductToCart();
        dispatch(setMeals(data.meals || []));
        setStatus("available");
      } else if (data.alternatives?.length > 0) {
        // Alternatives only: no add to cart, redirect to Detailspage
        clearPendingProduct();
        dispatch(setMeals(data.alternatives));
        setStatus("alternatives");
        setCountdown(3);
      } else {
        // None: no add to cart, redirect to homepage and load all meals
        clearPendingProduct();
        const res = await fetch("/api/foods");
        dispatch(setMeals(await res.json()));
        setStatus("none");
        setCountdown(3);
      }
    } catch (err) {
      console.error("Error checking availability:", err);
      clearPendingProduct();
      try {
        const res = await fetch("/api/foods");
        dispatch(setMeals(await res.json()));
      } catch {
        dispatch(setMeals([]));
      }
      setStatus("error");
      setCountdown(3);
    } finally {
      setLoading(false);
    }
  };

  // === Auto-search when state & LGA are both selected ===
  useEffect(() => {
    if (!location.state || !location.lga) return;
    if (loading) return; // avoid overlapping calls
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // fire the same logic as the old button
      handleConfirm();
    }, 500); // small debounce for “best searching display”
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, location.lga]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      {/* Solid white panel, slightly narrower (max-w-xl) */}
      <div className="w-full max-w-xl p-6 relative rounded-xl bg-white shadow-lg">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-red-600"
          aria-label="Close"
        >
          ✖
        </button>

        <h2 className="text-xl font-bold mb-4 text-center text-gray-900">Select Your Location</h2>

        <LocationSelector onChange={setLocationState} />

        {/* Auto-search indicator (replaces the old button) */}
        <div className="mt-6 w-full">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
              <span className="h-4 w-4 inline-block border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <span>Checking availability…</span>
            </div>
          ) : !location.state || !location.lga ? (
            <p className="text-center text-sm text-gray-500">
              Select state and LGA — we’ll check automatically.
            </p>
          ) : (
            <p className="text-center text-sm text-gray-500">
              Searching for the best match in your area…
            </p>
          )}
        </div>

        {status && (
          <div className="mt-6">
            {status === "available" && (
              <div className="text-green-700">
                <p className="text-2xl font-bold">
                  ✅ This meal is available in your location!
                </p>
                <div className="flex gap-4 mt-4">
                  
                  <button
                    onClick={() => closeAndNavigate("/Detailspage")}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            )}

            {status === "alternatives" && (
              <div className="text-yellow-700 text-2xl font-bold">
                ❌ Not available, but here are some other meals near you.
                Redirecting to Detailspage...
              </div>
            )}

            {status === "none" && (
              <p className="text-red-700 text-2xl font-bold">
                ❌ No meals in your location. Redirecting to Homepage...
              </p>
            )}

            {status === "error" && (
              <p className="text-red-700 text-2xl font-bold">
                ⚠️ Error checking availability. Redirecting to Homepage...
              </p>
            )}

            {status !== "available" && countdown > 0 && (
              <div className="mt-4">
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-blue-600 transition-all duration-1000"
                    style={{ width: `${(countdown / 3) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Redirecting in {countdown} seconds...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
