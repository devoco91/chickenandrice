"use client";

import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";

import { setLocation } from "../store/locationSlice";
import { setMeals } from "../store/mealsSlice";
import { addItemCart } from "../store/cartSlice";

import LocationSelector from "../components/LocationSelector/LocationSelector";

export default function LocationModal({ onClose }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  const mealId = searchParams.get("mealId");

  const [location, setLocationState] = useState({ state: "", lga: "" });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [countdown, setCountdown] = useState(0);

  // countdown for auto-redirect in alternatives/none/error cases
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
      router.push("/Detailspage");
    } else {
      router.push("/");
    }
    onClose?.(); // close modal when redirecting
  };

  const addPendingProductToCart = async () => {
    if (typeof window === "undefined") return;

    const pending = localStorage.getItem("pendingProduct");
    if (pending) {
      const parsed = JSON.parse(pending);
      dispatch(addItemCart(parsed));
      localStorage.removeItem("pendingProduct");
    }
  };

  const clearPendingProduct = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("pendingProduct");
  };

  const checkMealAvailability = async () => {
    const res = await fetch(
      `/api/check-meal/${mealId}?state=${location.state}&lga=${location.lga}`,
      { headers: { "Content-Type": "application/json" } }
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
        await addPendingProductToCart();
        dispatch(setMeals(data.meals || []));
        setStatus("available");
        onClose?.(); // ✅ close modal if available
      } else if (data.alternatives?.length > 0) {
        clearPendingProduct();
        dispatch(setMeals(data.alternatives));
        setStatus("alternatives");
        setCountdown(3);
      } else {
        clearPendingProduct();
        try {
          const res = await fetch("/api/foods");
          const allMeals = await res.json();
          dispatch(setMeals(allMeals));
        } catch (error) {
          console.error("Failed to load all meals:", error);
          dispatch(setMeals([]));
        }
        setStatus("none");
        setCountdown(3);
      }
    } catch (err) {
      console.error("Error checking availability:", err);
      clearPendingProduct();
      try {
        const res = await fetch("/api/foods");
        const allMeals = await res.json();
        dispatch(setMeals(allMeals));
      } catch (error) {
        console.error("Failed to load all meals on error:", error);
        dispatch(setMeals([]));
      }
      setStatus("error");
      setCountdown(3);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative animate-fadeIn">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-red-600 text-center mb-6">
          Select Your Location
        </h2>

        <LocationSelector onChange={setLocationState} />

        <button
          onClick={handleConfirm}
          disabled={loading}
          className={`mt-6 w-full px-4 py-2 rounded-lg transition ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
        >
          {loading ? "Checking..." : "Check Availability"}
        </button>

        {status && (
          <div className="mt-6 text-center">
            {status === "available" && (
              <div className="text-green-600">
                <p>✅ This meal is available in your location!</p>
              </div>
            )}

            {status === "alternatives" && (
              <div className="text-yellow-600">
                ❌ Not available, showing alternatives. Redirecting...
              </div>
            )}

            {status === "none" && (
              <p className="text-red-600">
                ❌ No meals in your location. Redirecting...
              </p>
            )}

            {status === "error" && (
              <p className="text-red-600">
                ⚠️ Error checking availability. Redirecting...
              </p>
            )}

            {status !== "available" && countdown > 0 && (
              <div className="mt-4">
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-blue-600 transition-all duration-1000"
                    style={{ width: `${(countdown / 3) * 100}%` }}
                  ></div>
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
