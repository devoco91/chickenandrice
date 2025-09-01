// app/components/PopulateForm.jsx
"use client"
import { useState } from "react"

export default function PopulateForm({ onSubmit, loading }) {
  const [name, setName] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Please enter a food name")
      return
    }
    setError("")
    onSubmit({ name })
    setName("")
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center w-full">
      <label htmlFor="food-name" className="sr-only">
        Food name
      </label>
      <input
        id="food-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter food name"
        required
        className="border p-2 rounded flex-1"
      />
      <button
        type="submit"
        disabled={loading}
        className={`px-4 py-2 rounded text-white transition-colors ${
          loading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {loading ? "Adding..." : "Add"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  )
}
