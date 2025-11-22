// app/components/MapsScriptGate.jsx
'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

const NEEDS_MAPS = new Set([
  '/checkout',           // adjust as needed
  '/address',
  '/delivery',
]);

export default function MapsScriptGate() {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const pathname = usePathname() || '/';

  // Load only on routes that need Maps
  const shouldLoad =
    key &&
    ([...NEEDS_MAPS].some(p => pathname.startsWith(p)));

  if (!shouldLoad) return null;

  // One async loader, once
  return (
    <Script
      id="gmaps"
      strategy="afterInteractive"
      src={`https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`}
    />
  );
}
