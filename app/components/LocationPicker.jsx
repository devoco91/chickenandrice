// src/components/LocationPicker.jsx
import { useEffect } from "react";

export default function LocationPicker({ onLocationSelect }) {
  useEffect(() => {
    if (!window.google) return;

    const autocomplete = new window.google.maps.places.Autocomplete(
      document.getElementById("autocomplete"),
      { types: ["geocode"] }
    );

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        onLocationSelect({ lat, lng });
      }
    });
  }, [onLocationSelect]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onLocationSelect({ lat: latitude, lng: longitude });
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location. Please type your address.");
      }
    );
  };

  return (
    <div className="space-y-2">
      <input
        id="autocomplete"
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
