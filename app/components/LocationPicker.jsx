// src/components/LocationPicker.jsx
"use client";
import { useEffect, useRef } from "react";
import { useGoogleMaps } from "@/app/components/maps/useGoogleMaps";

export default function LocationPicker({ onLocationSelect }) {
  const { ready } = useGoogleMaps({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });
  const inputRef = useRef(null);

  useEffect(() => {
    if (!ready || !inputRef.current) return;
    (async () => {
      const { Autocomplete } = await google.maps.importLibrary("places");
      const autocomplete = new Autocomplete(inputRef.current, {
        types: ["geocode"],
        fields: ["formatted_address", "geometry", "name", "place_id"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const loc = place?.geometry?.location;
        if (loc) onLocationSelect({ lat: loc.lat(), lng: loc.lng() });
      });
    })();
  }, [ready, onLocationSelect]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => onLocationSelect({ lat: coords.latitude, lng: coords.longitude }),
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location. Please type your address.");
      }
    );
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="text"
        placeholder="Enter your address"
        className="border p-2 w-full rounded"
      />
      <button
        type="button"
        className="px-4 py-2 bg-blue-500 text-white rounded w-full"
        onClick={handleUseCurrentLocation}
      >
        Use My Current Location
      </button>
    </div>
  );
}
