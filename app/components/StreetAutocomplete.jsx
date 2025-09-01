// components/StreetAutocomplete.jsx
'use client'
import React, { useState, useRef, useEffect } from 'react'

const StreetAutocomplete = ({ value, onChange, onSelect, disabled }) => {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const serviceRef = useRef(null)
  const suggestionBoxRef = useRef(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
      serviceRef.current = new window.google.maps.places.AutocompleteService()
    }
  }, [])

  // outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(e.target)) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    onChange(val)

    if (val.length > 2 && serviceRef.current) {
      setLoading(true)
      serviceRef.current.getPlacePredictions(
        { input: val, componentRestrictions: { country: 'NG' } },
        (predictions, status) => {
          setLoading(false)
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            setSuggestions(predictions || [])
          } else {
            setSuggestions([])
          }
        }
      )
    } else {
      setSuggestions([])
    }
  }

  const handleSelect = (prediction) => {
    const placesService = new window.google.maps.places.PlacesService(document.createElement('div'))
    placesService.getDetails(
      { placeId: prediction.place_id, fields: ['formatted_address', 'geometry'] },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          onSelect({
            address: place.formatted_address,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          })
          setSuggestions([])
        }
      }
    )
  }

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
  )
}

export default StreetAutocomplete
