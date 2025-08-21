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

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0 && status) {
      router.push("/");
    }
    return () => clearTimeout(timer);
  }, [countdown, status, router]);

  const handlePendingProduct = async () => {
    if (typeof window === "undefined") return;
    const pending = localStorage.getItem("pendingProduct");
    if (pending) {
      const parsed = JSON.parse(pending);
      dispatch(addItemCart(parsed)); // ✅ Add only after location is confirmed
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
        await handlePendingProduct();
        dispatch(setMeals(data.meals || []));
        setStatus("available");
        setCountdown(3);
      } else if (data.alternatives?.length > 0) {
        dispatch(setMeals(data.alternatives));
        setAlternatives(data.alternatives);
        await handlePendingProduct();
        setStatus("alternatives");
        setCountdown(3);
      } else {
        dispatch(setMeals([]));
        await handlePendingProduct();
        setStatus("none");
        setCountdown(3);
      }
    } catch (err) {
      console.error("Error checking availability:", err);
      setStatus("error");
      setCountdown(3);
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
            <p className="text-green-600">
              ✅ This meal is available in your location! Redirecting to homepage...
            </p>
          )}

          {status === "alternatives" && (
            <div className="text-yellow-600">
              ❌ Not available, but here are some other meals near you. Redirecting...
              <ul className="list-disc ml-6 mt-2">
                {alternatives.map((meal) => (
                  <li key={meal._id}>
                    {meal.name} – ₦{meal.price}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status === "none" && (
            <p className="text-red-600">
              ❌ No meals in your location. Redirecting to homepage...
            </p>
          )}

          {status === "error" && (
            <p className="text-red-600">
              ⚠️ Error checking availability. Redirecting...
            </p>
          )}

          {countdown > 0 && (
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
