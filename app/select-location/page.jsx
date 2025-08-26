"use client";

import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";

import { setLocation } from "../store/locationSlice";
import { setMeals } from "../store/mealsSlice";
import { addItemCart } from "../store/cartSlice";

import LocationSelector from "../components/LocationSelector/LocationSelector";

export default function SelectLocationPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  const mealId = searchParams.get("mealId");

  const [location, setLocationState] = useState({ state: "", lga: "" });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [countdown, setCountdown] = useState(0);

  // countdown effect (only for alternatives, none, error)
  useEffect(() => {
    if (!status || status === "available") return; // skip case 1

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
      router.push("/"); // none or error → homepage
    }
  };

  const handlePendingProduct = async () => {
    if (typeof window === "undefined") return;

    const pending = localStorage.getItem("pendingProduct");
    if (pending) {
      const parsed = JSON.parse(pending);
      dispatch(addItemCart(parsed));
      localStorage.removeItem("pendingProduct");
    }
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
        await handlePendingProduct(); // ✅ auto add to cart
        dispatch(setMeals(data.meals || []));
        setStatus("available");
      } else if (data.alternatives?.length > 0) {
        dispatch(setMeals(data.alternatives));
        setAlternatives(data.alternatives);
        setStatus("alternatives");
        setCountdown(3); // ✅ auto redirect
      } else {
        try {
          const res = await fetch("/api/foods");
          const allMeals = await res.json();
          dispatch(setMeals(allMeals));
        } catch (error) {
          console.error("Failed to load all meals:", error);
          dispatch(setMeals([]));
        }
        setStatus("none");
        setCountdown(3); // ✅ auto redirect
      }
    } catch (err) {
      console.error("Error checking availability:", err);
      try {
        const res = await fetch("/api/foods");
        const allMeals = await res.json();
        dispatch(setMeals(allMeals));
      } catch (error) {
        console.error("Failed to load all meals on error:", error);
        dispatch(setMeals([]));
      }
      setStatus("error");
      setCountdown(3); // ✅ auto redirect
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
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
        <div className="mt-6">
          {status === "available" && (
            <div className="text-green-600">
              <p>✅ This meal is available in your location!</p>
              <div className="flex gap-4 mt-4">
                <button
                  onClick={() => router.push("/cart")}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                >
                  Checkout
                </button>
                <button
                  onClick={() => router.push("/Detailspage")}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}

          {status === "alternatives" && (
            <div className="text-yellow-600">
              ❌ Not available, but here are some other meals near you.
              Redirecting to Detailspage...
            </div>
          )}

          {status === "none" && (
            <p className="text-red-600">
              ❌ No meals in your location. Redirecting to Homepage...
            </p>
          )}

          {status === "error" && (
            <p className="text-red-600">
              ⚠️ Error checking availability. Redirecting to Homepage...
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
  );
}
