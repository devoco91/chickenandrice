// app/components/maps/useGoogleMaps.js
"use client";

import { useEffect, useRef, useState } from "react";

const cache = new Map(); // src -> Promise<void>

function buildSrc(key, libraries = []) {
  const libs = libraries.length ? `&libraries=${encodeURIComponent(libraries.join(","))}` : "";
  return `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}${libs}&loading=async`;
}

export function useGoogleMaps({ apiKey, libraries = [] }) {
  const [ready, setReady] = useState(!!(typeof window !== "undefined" && window.google?.maps));
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  useEffect(() => {
    if (!apiKey) {
      setError(new Error("Missing Google Maps API key."));
      return;
    }
    if (typeof window !== "undefined" && window.google?.maps) {
      setReady(true);
      return;
    }

    const src = buildSrc(apiKey, libraries);
    let p = cache.get(src);
    if (!p) {
      p = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.defer = true;
        s.onerror = () => reject(new Error("Failed to load Google Maps JS"));
        s.onload = () => resolve();
        document.head.appendChild(s);
      });
      cache.set(src, p);
    }

    p.then(() => {
      if (!mounted.current) return;
      if (window.google?.maps) setReady(true);
      else setError(new Error("google.maps not available after load"));
    }).catch((e) => mounted.current && setError(e));
  }, [apiKey, libraries.join(",")]);

  return { ready, error };
}
