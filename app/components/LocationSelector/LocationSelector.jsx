"use client";
import { useState, useEffect } from "react";
import NaijaStates from "naija-state-local-government";

export default function LocationSelector({ onChange }) {
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [lgas, setLgas] = useState([]);

  const states = NaijaStates.states();

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

  useEffect(() => {
    if (onChange) {
      onChange({ state, lga });
    }
  }, [state, lga, onChange]);

  return (
    <div className="space-y-4 border p-4 rounded-lg shadow-md bg-white">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">
        Enter your location
      </h2>

      <div>
        <label className="block text-gray-700 mb-1">Select State</label>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500"
        >
          <option value="">-- Choose State --</option>
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
