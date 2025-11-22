// components/StreetAutocomplete.jsx
"use client";
import React, { useState, useRef, useEffect } from "react";
import { useGoogleMaps } from "@/app/components/maps/useGoogleMaps";

export default function StreetAutocomplete({ value, onChange, onSelect, disabled }) {
  const { ready } = useGoogleMaps({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const serviceRef = useRef(null);
  const suggestionBoxRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!ready) return;
      const { AutocompleteService } = await google.maps.importLibrary("places");
      if (!mounted) return;
      serviceRef.current = new AutocompleteService();
    })();
    return () => { mounted = false; };
  }, [ready]);

  useEffect(() => {
    const onDown = (e) => {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);

    if (!ready || !serviceRef.current || val.length <= 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    serviceRef.current.getPlacePredictions(
      { input: val, componentRestrictions: { country: "NG" } },
      (preds, status) => {
        setLoading(false);
        const OK = google.maps.places.PlacesServiceStatus.OK;
        setSuggestions(status === OK ? preds || [] : []);
      }
    );
  };

  const handleSelect = async (prediction) => {
    const { PlacesService } = await google.maps.importLibrary("places");
    const svc = new PlacesService(document.createElement("div"));
    svc.getDetails(
      { placeId: prediction.place_id, fields: ["formatted_address", "geometry"] },
      (place, status) => {
        const OK = google.maps.places.PlacesServiceStatus.OK;
        if (status === OK && place?.geometry?.location) {
          onSelect({
            address: place.formatted_address,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
          setSuggestions([]);
        }
      }
    );
  };

  return (
    <div className="relative" ref={suggestionBoxRef}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Street (start typing...)"
        disabled={disabled}
        className="w-full border border-gray-300 p-3 rounded"
      />
      {loading && <div className="absolute right-2 top-2 text-gray-400">...</div>}
      {suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 bg-white border border-gray-300 rounded mt-1 max-h-60 overflow-auto z-50 shadow-lg">
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              onClick={() => handleSelect(s)}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              {s.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
