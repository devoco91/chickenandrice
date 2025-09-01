"use client"

import { LoadScript } from "@react-google-maps/api"

export default function GoogleMapsProvider({ children }) {
  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
      libraries={["places"]}
    >
      {children}
    </LoadScript>
  )
}
