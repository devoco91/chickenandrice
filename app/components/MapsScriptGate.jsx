// app/components/MapsScriptGate.jsx
"use client";
import { usePathname } from "next/navigation";
import Script from "next/script";

// Extend this list if other routes need Google Maps
const ROUTES_NEEDING_MAPS = ["/checkout"]; 

export default function MapsScriptGate() {
  const pathname = usePathname();
  const needsMaps = ROUTES_NEEDING_MAPS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!needsMaps) return null;

  return (
    <Script
      src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
      strategy="afterInteractive"
    />
  );
}
