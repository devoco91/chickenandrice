'use client'
import { useState } from "react"

export default function PopulateForm({ category }) {
  const [name, setName] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    // In future: send POST to `/api/${category.toLowerCase()}`
    console.log(`Submitting ${category}:`, name)
    setName("")
    alert(`${category} added successfully!`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-4 shadow rounded-lg max-w-sm mx-auto space-y-3"
    >
      <h2 className="text-lg font-semibold text-center">Add {category}</h2>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={`${category} name`}
        required
        className="w-full border p-2 rounded"
      />
      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Submit
      </button>
    </form>
  )
}
