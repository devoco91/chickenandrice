"use client";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import { setLocation } from "../store/locationSlice";
import LocationSelector from "../components/LocationSelector/LocationSelector";

export default function SelectLocationPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  const mealId = searchParams.get("mealId");
  const [location, setLocationState] = useState({ state: "", lga: "" });
  const [status, setStatus] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const handleConfirm = async () => {
    if (!location.state || !location.lga) {
      alert("Please select state and LGA");
      return;
    }

    try {
      const res = await fetch(
        `/api/check-meal/${mealId}?state=${location.state}&lga=${location.lga}`
      );

      if (!res.ok) throw new Error("Failed to check availability");

      const data = await res.json();

      if (data.available) {
        dispatch(setLocation(location));

        const pending = localStorage.getItem("pendingProduct");
        if (pending) {
          await fetch("/api/cart", {
            method: "POST",
            body: JSON.stringify(JSON.parse(pending)),
            headers: { "Content-Type": "application/json" },
          });
          localStorage.removeItem("pendingProduct");
        }

        setStatus("available");
        setSuggestions([]);
        setTimeout(() => router.push("/"), 2000);
      } else if (data.alternatives?.length > 0) {
        setStatus("not-available");
        setSuggestions(data.alternatives);
      } else {
        setStatus("none");
      }
    } catch (err) {
      console.error("Error checking availability:", err);
      setStatus("error");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <LocationSelector onChange={setLocationState} />

      <button
        onClick={handleConfirm}
        className="mt-6 w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
      >
        Check Availability
      </button>

      {status === "available" && (
        <div className="mt-4 text-green-600">
          ✅ This meal is available in your location! Added to cart.
        </div>
      )}

      {status === "not-available" && (
        <div className="mt-4">
          ❌ This meal is not available. Here are some meals in your area:
          <ul className="list-disc ml-6 mt-2">
            {suggestions.map((meal) => (
              <li key={meal._id}>{meal.name} – ₦{meal.price}</li>
            ))}
          </ul>
        </div>
      )}

      {status === "none" && (
        <div className="mt-4 text-red-600">
          ❌ No meals available in your area. Please go back to{" "}
          <a href="/" className="underline text-blue-600">
            homepage
          </a>
          .
        </div>
      )}

      {status === "error" && (
        <div className="mt-4 text-red-600">
          ⚠️ Error checking availability. Try again later.
        </div>
      )}
    </div>
  );
}
