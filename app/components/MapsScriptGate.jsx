// app/components/MapsScriptGate.jsx
"use client";
import { usePathname } from "next/navigation";
import { useGoogleMaps } from "./maps/useGoogleMaps";

const ROUTES_NEEDING_MAPS = ["/checkout"];

export default function MapsScriptGate() {
  const pathname = usePathname();
  const needsMaps = ROUTES_NEEDING_MAPS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  useGoogleMaps({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: needsMaps ? ["places"] : [],
  });

  return null;
}
