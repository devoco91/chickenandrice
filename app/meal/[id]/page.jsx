"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useDispatch } from "react-redux"
import { setLocation, resetLocation } from "@/store/locationSlice"
import NaijaStates from "naija-state-local-government"

export default function MealPage() {
  const { id } = useParams()
  const router = useRouter()
  const dispatch = useDispatch()

  const [meal, setMeal] = useState(null)
  const [state, setState] = useState("")
  const [lga, setLga] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    async function fetchMeal() {
      try {
        const res = await fetch(`/api/foods/${id}`)
        const data = await res.json()
        setMeal(data)
      } catch (err) {
        console.error("Error fetching meal:", err)
      }
    }
    fetchMeal()
    dispatch(resetLocation())
  }, [id, dispatch])

  if (!meal) return <p className="p-4">Loading...</p>

  const handleCheckAvailability = async () => {
    if (!state || !lga) {
      alert("Please select both state and LGA.")
      return
    }

    dispatch(setLocation({ state, lga }))

    try {
      const res = await fetch(
        `/api/check-meal?mealId=${id}&state=${encodeURIComponent(state)}&lga=${encodeURIComponent(lga)}`
      )
      const data = await res.json()

      if (res.ok && data.available) {
        setMessage("✅ Meal is available in your location. Redirecting...")
        setTimeout(() => router.push("/"), 2000)
      } else if (data.alternatives && data.alternatives.length > 0) {
        setMessage(
          `❌ Selected meal not available in your location. Redirecting to homepage to load meals in ${state}...`
        )
        setTimeout(() => router.push("/"), 2500)
      } else {
        setMessage("🚫 No meal available in your location. Redirecting to homepage...")
        setTimeout(() => router.push("/"), 2500)
      }
    } catch (err) {
      console.error("Error checking availability:", err)
      setMessage("⚠️ Error checking availability. Try again later.")
    }
  }

  const allStates = NaijaStates.states()
  const allLgas = state ? NaijaStates.lgas(state).lgas : []

  return (
    <div className="p-6 max-w-xl mx-auto bg-white shadow rounded-lg">
      <img
        src={meal.image}
        alt={meal.name}
        className="w-full h-40 object-cover rounded"
      />
      <h1 className="text-2xl font-bold mt-3">{meal.name}</h1>
      <p className="text-gray-600">{meal.description}</p>
      <p className="text-red-600 font-semibold">₦{meal.price}</p>

      {/* Location Selection */}
      <div className="mt-4 space-y-2">
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="">-- Select State --</option>
          {allStates.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {state && (
          <select
            value={lga}
            onChange={(e) => setLga(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="">-- Select LGA --</option>
            {allLgas.map((lgaOption) => (
              <option key={lgaOption} value={lgaOption}>
                {lgaOption}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={handleCheckAvailability}
          className="w-full mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Check Availability
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className="mt-4 text-center text-gray-800 font-medium">
          {message}
        </div>
      )}
    </div>
  )
}
