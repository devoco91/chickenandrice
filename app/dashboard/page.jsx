'use client'
import { useState, useEffect } from "react"
import NaijaStates from "naija-state-local-government"
import { useRouter } from "next/navigation"

const API_BASE = "/api"
const BACKEND_URL = "http://localhost:5000"

export default function Dashboard() {
  const [foods, setFoods] = useState([])
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "Main",
    isAvailable: true,
    isPopular: false,
    state: "",
    lgas: [],
  })
  const [editingFoodId, setEditingFoodId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(3)

  const router = useRouter()

  // ===== Fetch foods =====
  const fetchFoods = async () => {
    try {
      const res = await fetch(`${API_BASE}/foods`)
      if (!res.ok) throw new Error("Failed to fetch foods")
      setFoods(await res.json())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    fetchFoods()
  }, [])

  // ===== Input handlers =====
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    setImageFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target.result)
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
    }
  }

  const handleLgaChange = (e) => {
    const selected = Array.from(e.target.selectedOptions, (o) => o.value)
    setForm((prev) => ({
      ...prev,
      lgas: selected,
    }))
  }

  // ===== Submit form =====
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const url = editingFoodId
      ? `${API_BASE}/foods/${editingFoodId}`
      : `${API_BASE}/foods`

    const formData = new FormData()
    Object.entries(form).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        formData.append(key, JSON.stringify(val))
      } else {
        formData.append(key, val)
      }
    })
    if (imageFile) formData.append("imageFile", imageFile)

    try {
      const res = await fetch(url, {
        method: editingFoodId ? "PUT" : "POST",
        body: formData,
      })
      if (!res.ok) throw new Error("Failed to save food")
      await res.json()
      fetchFoods()
      setSuccess(editingFoodId ? "Food updated!" : "Food added!")
      resetForm()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      category: "Main",
      isAvailable: true,
      isPopular: false,
      state: "",
      lgas: [],
    })
    setImageFile(null)
    setImagePreview(null)
    setEditingFoodId(null)
    setShowForm(false)
  }

  const handleEdit = (food) => {
    setForm({
      name: food.name,
      description: food.description || "",
      price: food.price,
      category: food.category,
      isAvailable: food.isAvailable,
      isPopular: food.isPopular || false,
      state: food.state || "",
      lgas: food.lgas || [],
    })
    setImageFile(null)
    setImagePreview(food.image ? `${BACKEND_URL}${food.image}` : null)
    setEditingFoodId(food._id)
    setShowForm(true)
  }

  const handleDeleteFood = async (id) => {
    if (!confirm("Delete this food?")) return
    try {
      await fetch(`${API_BASE}/foods/${id}`, { method: "DELETE" })
      fetchFoods()
    } catch (err) {
      setError(err.message)
    }
  }

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    if (imagePath.startsWith("http")) return imagePath
    return `${BACKEND_URL}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`
  }

  const states = NaijaStates.states()
  const lgas = form.state ? NaijaStates.lgas(form.state).lgas : []

  // Pagination helpers
  const indexOfLast = currentPage * rowsPerPage
  const indexOfFirst = indexOfLast - rowsPerPage
  const currentFoods = foods.slice(indexOfFirst, indexOfLast)
  const totalPages = Math.ceil(foods.length / rowsPerPage)

  return (
    <div className="min-h-screen bg-red-50 p-6 text-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-red-700">Dashboard</h1>

      {success && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{success}</div>}
      {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          ➕ Add Food
        </button>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 bg-white p-6 shadow rounded-lg max-w-lg mx-auto space-y-3"
        >
          <h2 className="text-xl font-semibold mb-2 text-center">
            {editingFoodId ? "Edit Food" : "Add Food"}
          </h2>

          <input type="text" name="name" value={form.name} onChange={handleInputChange}
            placeholder="Food Name" required className="w-full border p-2 rounded" />

          <input type="number" name="price" value={form.price} onChange={handleInputChange}
            placeholder="Price" required className="w-full border p-2 rounded" />

          <select name="category" value={form.category} onChange={handleInputChange}
            className="w-full border p-2 rounded">
            <option>Main</option>
            <option>Drinks</option>
            <option>Dessert</option>
          </select>

          <textarea name="description" value={form.description} onChange={handleInputChange}
            placeholder="Description" className="w-full border p-2 rounded" />

          <select
            name="state"
            value={form.state}
            onChange={handleInputChange}
            className="w-full border p-2 rounded"
          >
            <option value="">-- Select State --</option>
            {states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {form.state && (
            <select
              multiple
              value={form.lgas}
              onChange={handleLgaChange}
              className="w-full border p-2 rounded h-32"
            >
              {lgas.map((lga) => (
                <option key={lga} value={lga}>{lga}</option>
              ))}
            </select>
          )}

          <label className="flex items-center space-x-2">
            <input type="checkbox" name="isAvailable" checked={form.isAvailable} onChange={handleInputChange} />
            <span>Available</span>
          </label>

          <label className="flex items-center space-x-2">
            <input type="checkbox" name="isPopular" checked={form.isPopular} onChange={handleInputChange} />
            <span>Popular</span>
          </label>

          <input type="file" accept="image/*" onChange={handleFileChange} />
          {imagePreview && <img src={imagePreview} className="w-24 h-24 object-cover rounded mx-auto" />}

          <div className="flex justify-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              {loading ? "Saving..." : editingFoodId ? "Update" : "Add"}
            </button>
            <button type="button" onClick={resetForm}
              className="px-4 py-2 bg-gray-400 text-white rounded">Cancel</button>
          </div>
        </form>
      )}

      {/* Foods grid */}
      <h2 className="text-xl font-semibold mb-4">Foods</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {currentFoods.map((food) => (
          <div key={food._id} className="border rounded-lg p-4 bg-white shadow h-full flex flex-col">
            {food.image && (
              <img src={getImageUrl(food.image)} alt={food.name}
                className="w-full h-40 object-cover rounded mb-2" />
            )}
            <h3 className="font-bold">{food.name}</h3>
            <p className="text-sm text-gray-600 flex-grow">{food.description}</p>
            <p className="text-red-600 font-semibold">₦{food.price}</p>
            {food.state && <p className="text-xs mt-1">📍 {food.state} ({food.lgas?.join(", ")})</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={() => handleEdit(food)} className="flex-1 px-2 py-1 bg-blue-500 text-white rounded">Edit</button>
              <button onClick={() => handleDeleteFood(food._id)} className="flex-1 px-2 py-1 bg-red-500 text-white rounded">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label>Rows per page:</label>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value))
              setCurrentPage(1)
            }}
            className="border p-1 rounded"
          >
            <option value={3}>3</option>
            <option value={6}>6</option>
            <option value={9}>9</option>
          </select>
        </div>
      </div>

      {/* Manage Orders button */}
      <div className="mt-6 text-center">
        <button
          onClick={() => router.push("/dispatchCenter")}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Manage Orders
        </button>
      </div>
    </div>
  )
}
