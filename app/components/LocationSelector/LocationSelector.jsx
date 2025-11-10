// app/components/LocationSelector/LocationSelector.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import NaijaStates from "naija-state-local-government";

/**
 * Props:
 * - onChange({ state, lga })
 * - autoFocusLga?: boolean  // focuses the LGA select once options are ready
 */
export default function LocationSelector({ onChange, autoFocusLga = false }) {
  const [state, setState] = useState("Lagos");
  const [lga, setLga] = useState("");
  const [lgas, setLgas] = useState([]);

  const lgaRef = useRef(null);

  const states = ["Lagos"];

  useEffect(() => {
    if (state) {
      const result = NaijaStates.lgas(state);
      setLgas(result.lgas);
      setLga("");
    } else {
      setLgas([]);
      setLga("");
    }
  }, [state]);

  // Auto-focus LGA when requested and list is ready
  useEffect(() => {
    if (autoFocusLga && lgas.length > 0 && lgaRef.current) {
      try { lgaRef.current.focus(); } catch {}
    }
  }, [autoFocusLga, lgas]);

  useEffect(() => {
    onChange?.({ state, lga });
  }, [state, lga, onChange]);

  return (
    <div className="space-y-4 border p-4 rounded-lg shadow-md bg-white">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Enter your location</h2>

      <div>
        <label className="block text-gray-700 mb-1">Select State</label>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500"
        >
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {lgas.length > 0 && (
        <div>
          <label className="block text-gray-700 mb-1">Select LGA</label>
          <select
            ref={lgaRef}
            value={lga}
            onChange={(e) => setLga(e.target.value)}
            className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500"
          >
            <option value="">-- Choose LGA --</option>
            {lgas.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
