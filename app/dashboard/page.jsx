"use client"
import { useState, useEffect } from "react"
import NaijaStates from "naija-state-local-government"
import { useRouter } from "next/navigation"
import Link from 'next/link'
import { ArrowRightCircle } from 'lucide-react'
import { buildImgSources } from "../utils/img"

/* =========================
   API + Upload base helpers
   ========================= */
const API_BASE = "/api" // relies on next.config rewrites in prod

const RAW_API = process.env.NEXT_PUBLIC_API_URL || ''
const UPLOADS_BASE =
  process.env.NEXT_PUBLIC_BACKEND_UPLOADS_BASE ||
  (RAW_API ? RAW_API.replace(/\/api(?:\/v\\d+)?$/i, '') + '/uploads' : '/uploads')

const getImageUrl = (val) => {
  let s = val
  if (!s) return "/fallback.jpg"
  if (typeof s !== "string") {
    try {
      if (Array.isArray(s)) s = s[0] || ""
      else if (typeof s === "object") s = s.url || s.path || s.filename || s.filepath || ""
    } catch {}
  }
  if (!s) return "/fallback.jpg"
  if (/^https?:\/\//i.test(s)) return s
  const cleaned = String(s)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^uploads\//i, "")
  return `${UPLOADS_BASE}/${encodeURI(cleaned)}`
}

/** ------- “Popular” normalization ------- **/
const toBool = (v) =>
  v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true"

const isPopularItem = (p) =>
  toBool(p?.isPopular) ||
  toBool(p?.popular) ||
  toBool(p?.featured) ||
  (Array.isArray(p?.tags) && p.tags.some((t) => String(t).toLowerCase() === "popular"))

const resolveCategoryLabel = (item) =>
  isPopularItem(item) ? "Popular" : (item?.category || "All Items")

/* =========================
   Small fetch helper (better errors)
   ========================= */
async function fetchJSON(input, init) {
  const res = await fetch(input, init)
  let data = null
  const ct = res.headers.get('content-type') || ''
  try {
    data = ct.includes('application/json') ? await res.json() : await res.text()
  } catch {}
  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && data.error) ||
      (typeof data === 'string' && data) ||
      `HTTP ${res.status}`
    const err = new Error(msg)
    err.status = res.status
    err.body = data
    throw err
  }
  return data
}

export default function Dashboard() {
  // ===== FOOD STATE =====
  const [foods, setFoods] = useState([])
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "All Items",
    isAvailable: true,
    state: "Lagos",
    lgas: [],
  })
  const [editingFoodId, setEditingFoodId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(3)

  // ===== DRINK STATE =====
  const [drinks, setDrinks] = useState([])
  const [drinkImageFile, setDrinkImageFile] = useState(null)
  const [drinkImagePreview, setDrinkImagePreview] = useState(null)
  const [drinkForm, setDrinkForm] = useState({ name: "", price: "" })
  const [editingDrinkId, setEditingDrinkId] = useState(null)
  const [drinkLoading, setDrinkLoading] = useState(false)
  const [drinkError, setDrinkError] = useState(null)
  const [drinkSuccess, setDrinkSuccess] = useState(null)
  const [showDrinkForm, setShowDrinkForm] = useState(false)
  const [currentDrinkPage, setCurrentDrinkPage] = useState(1)
  const [drinkRowsPerPage, setDrinkRowsPerPage] = useState(3)

  // ===== OTHER UI =====
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const router = useRouter()

  // ===== FETCHERS =====
  const fetchFoods = async () => {
    try {
      const data = await fetchJSON(`${API_BASE}/foods`, { cache: "no-store" })
      setFoods(data)
      if (process.env.NODE_ENV !== 'production') console.log('[foods] fetched', data.length)
    } catch (err) {
      console.error("fetchFoods failed:", err)
      setError(err.message || 'Failed to fetch foods')
    }
  }

  const fetchDrinks = async () => {
    try {
      const data = await fetchJSON(`${API_BASE}/drinks`, { cache: "no-store" })
      setDrinks(data)
      if (process.env.NODE_ENV !== 'production') console.log('[drinks] fetched', data.length)
    } catch (err) {
      console.error("fetchDrinks failed:", err)
      setDrinkError(err.message || 'Failed to fetch drinks')
    }
  }

  useEffect(() => {
    fetchFoods()
    fetchDrinks()
  }, [])

  // ===== FOOD HANDLERS =====
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
      reader.onload = (ev) => setImagePreview(ev.target.result)
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const url = editingFoodId
      ? `${API_BASE}/foods/${editingFoodId}`
      : `${API_BASE}/foods`

    const isPopular = form.category === "Popular"

    const fd = new FormData()
    fd.append("name", form.name)
    fd.append("description", form.description || "")
    fd.append("price", String(form.price || ""))
    fd.append("category", form.category || "All Items")
    fd.append("isAvailable", String(!!form.isAvailable))
    fd.append("state", form.state || "Lagos")
    fd.append("lgas", JSON.stringify(Array.isArray(form.lgas) ? form.lgas : []))
    fd.set("isPopular", String(isPopular))
    fd.set("popular", String(isPopular))
    fd.set("featured", String(isPopular))
    if (imageFile) fd.append("imageFile", imageFile)

    try {
      const data = await fetchJSON(url, {
        method: editingFoodId ? "PUT" : "POST",
        body: fd,
      })
      setSuccess(`${editingFoodId ? "Food updated!" : "Food added!"}${data?.image ? `  (image: ${data.image})` : ""}`)
      if (process.env.NODE_ENV !== 'production') console.log('[foods] save success:', data)
      await fetchFoods()
      resetForm()
    } catch (err) {
      console.error("save food failed:", { message: err.message, status: err.status, body: err.body })
      setError(err.message || 'Failed to save food')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      category: "All Items",
      isAvailable: true,
      state: "Lagos",
      lgas: [],
    })
    setImageFile(null)
    setImagePreview(null)
    setEditingFoodId(null)
    setShowForm(false)
    setDropdownOpen(false)
  }

  const handleEdit = (food) => {
    setForm({
      name: food.name,
      description: food.description || "",
      price: food.price,
      category: isPopularItem(food) ? "Popular" : "All Items",
      isAvailable: food.isAvailable,
      state: "Lagos",
      lgas: food.lgas || [],
    })
    setImageFile(null)
    setImagePreview(food.image ? getImageUrl(food.image) : null)
    setEditingFoodId(food._id)
    setShowForm(true)
  }

  const handleDeleteFood = async (id) => {
    if (!confirm("Delete this food?")) return
    try {
      await fetchJSON(`${API_BASE}/foods/${id}`, { method: "DELETE" })
      await fetchFoods()
      setSuccess("Food deleted")
    } catch (err) {
      console.error("delete food failed:", err)
      setError(err.message || 'Failed to delete food')
    }
  }

  // ===== DRINK HANDLERS =====
  const handleDrinkInputChange = (e) => {
    const { name, value } = e.target
    setDrinkForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleDrinkFileChange = (e) => {
    const file = e.target.files[0]
    setDrinkImageFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setDrinkImagePreview(ev.target.result)
      reader.readAsDataURL(file)
    } else {
      setDrinkImagePreview(null)
    }
  }

  const handleDrinkSubmit = async (e) => {
    e.preventDefault()
    setDrinkLoading(true)
    setDrinkError(null)
    setDrinkSuccess(null)

    const url = editingDrinkId
      ? `${API_BASE}/drinks/${editingDrinkId}`
      : `${API_BASE}/drinks`

    const fd = new FormData()
    fd.append("name", drinkForm.name)
    fd.append("price", String(drinkForm.price || ""))
    if (drinkImageFile) fd.append("imageFile", drinkImageFile)

    try {
      const data = await fetchJSON(url, {
        method: editingDrinkId ? "PUT" : "POST",
        body: fd,
      })
      setDrinkSuccess(`${editingDrinkId ? "Drink updated!" : "Drink added!"}${data?.image ? `  (image: ${data.image})` : ""}`)
      if (process.env.NODE_ENV !== 'production') console.log('[drinks] save success:', data)
      await fetchDrinks()
      resetDrinkForm()
    } catch (err) {
      console.error("save drink failed:", { message: err.message, status: err.status, body: err.body })
      setDrinkError(err.message || 'Failed to save drink')
    } finally {
      setDrinkLoading(false)
    }
  }

  const handleEditDrink = (drink) => {
    setDrinkForm({
      name: drink.name || "",
      price: drink.price || "",
    })
    setDrinkImageFile(null)
    setDrinkImagePreview(drink.image ? getImageUrl(drink.image) : null)
    setEditingDrinkId(drink._id)
    setShowDrinkForm(true)
  }

  const handleDeleteDrink = async (id) => {
    if (!confirm("Delete this drink?")) return
    try {
      await fetchJSON(`${API_BASE}/drinks/${id}`, { method: "DELETE" })
      await fetchDrinks()
      setDrinkSuccess("Drink deleted")
    } catch (err) {
      console.error("delete drink failed:", err)
      setDrinkError(err.message || 'Failed to delete drink')
    }
  }

  const resetDrinkForm = () => {
    setDrinkForm({ name: "", price: "" })
    setDrinkImageFile(null)
    setDrinkImagePreview(null)
    setEditingDrinkId(null)
    setShowDrinkForm(false)
  }

  // ===== DATA/VIEW HELPERS =====
  const lgas = NaijaStates.lgas("Lagos").lgas

  // foods pagination
  const indexOfLast = currentPage * rowsPerPage
  const indexOfFirst = indexOfLast - rowsPerPage
  const currentFoods = foods.slice(indexOfFirst, indexOfLast)
  const totalPages = Math.ceil(Math.max(foods.length, 1) / Math.max(rowsPerPage, 1))

  // drinks pagination
  const drinkIndexOfLast = currentDrinkPage * drinkRowsPerPage
  const drinkIndexOfFirst = drinkIndexOfLast - drinkRowsPerPage
  const currentDrinks = drinks.slice(drinkIndexOfFirst, drinkIndexOfLast)
  const drinkTotalPages = Math.ceil(Math.max(drinks.length, 1) / Math.max(drinkRowsPerPage, 1))

  return (
    <div className="min-h-screen bg-red-50 p-6 text-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-red-700">Dashboard</h1>

      <div className="relative inline-block mb-6">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-2 mx-3 bg-gradient-to-r from-orange-500 to-red-500 text-white px-5 py-3 rounded-2xl shadow hover:shadow-lg transition"
        >
          Inventory <ArrowRightCircle className="w-5 h-5" />
        </Link>
      </div>

      <div className="relative inline-block mb-6">
        <Link
          href="/foodpopdashboard"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-5 py-3 rounded-2xl shadow hover:shadow-lg transition"
        >
          Populate <ArrowRightCircle className="w-5 h-5" />
        </Link>
      </div>

      {success && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{success}</div>}
      {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}
      {drinkSuccess && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{drinkSuccess}</div>}
      {drinkError && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{drinkError}</div>}

      <div className="flex flex-wrap gap-3 mb-6">
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-2xl shadow hover:opacity-95"
          >
            ➕ Add Food
          </button>
        )}
        {!showDrinkForm && (
          <button
            onClick={() => setShowDrinkForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl shadow hover:opacity-95"
          >
            🥤 Add Drink
          </button>
        )}
      </div>

      {/* ===== FOOD FORM ===== */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 bg-white p-6 shadow rounded-2xl max-w-lg mx-auto space-y-3 border border-gray-200"
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
            <option>All Items</option>
            <option>Popular</option>
          </select>

          <textarea name="description" value={form.description} onChange={handleInputChange}
            placeholder="Description" className="w-full border p-2 rounded" />

          <input type="text" value="Lagos" disabled className="w-full border p-2 rounded bg-gray-100" />

          {/* LGAs */}
          <div className="border rounded p-2 max-h-32 overflow-y-auto">
            {lgas.map((lga) => (
              <label key={lga} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  value={lga}
                  checked={form.lgas.includes(lga)}
                  onChange={(e) => {
                    const { checked, value } = e.target
                    setForm((prev) => ({
                      ...prev,
                      lgas: checked
                        ? [...prev.lgas, value]
                        : prev.lgas.filter((x) => x !== value),
                    }))
                  }}
                />
                <span>{lga}</span>
              </label>
            ))}
          </div>

          <input type="file" accept="image/*" onChange={handleFileChange} />
          {imagePreview && (
            <img
              src={imagePreview}
              className="w-24 h-24 object-cover rounded mx-auto"
              alt="Preview"
              onError={(e) => { e.currentTarget.src = "/fallback.jpg" }}
              /* ✅ Fix + perf */
              fetchPriority="low"
              loading="lazy"
              decoding="async"
            />
          )}

          <div className="flex justify-center gap-2">
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl shadow hover:opacity-95">
              {loading ? "Saving..." : editingFoodId ? "Update" : "Add"}
            </button>
            <button type="button" onClick={resetForm}
              className="px-4 py-2 bg-gray-400 text-white rounded-2xl shadow">Cancel</button>
          </div>
        </form>
      )}

      {/* ===== DRINK FORM ===== */}
      {showDrinkForm && (
        <form
          onSubmit={handleDrinkSubmit}
          className="mb-10 bg-white p-6 shadow rounded-2xl max-w-lg mx-auto space-y-3 border border-gray-200"
        >
          <h2 className="text-xl font-semibold mb-2 text-center">
            {editingDrinkId ? "Edit Drink" : "Add Drink"}
          </h2>

          <input type="text" name="name" value={drinkForm.name} onChange={handleDrinkInputChange}
            placeholder="Drink Name" required className="w-full border p-2 rounded" />

          <input type="number" name="price" value={drinkForm.price} onChange={handleDrinkInputChange}
            placeholder="Price" required className="w-full border p-2 rounded" />

          <input type="file" accept="image/*" onChange={handleDrinkFileChange} />
          {drinkImagePreview && (
            <img
              src={drinkImagePreview}
              className="w-24 h-24 object-cover rounded mx-auto"
              alt="Preview"
              onError={(e) => { e.currentTarget.src = "/fallback.jpg" }}
              /* ✅ Fix + perf */
              fetchPriority="low"
              loading="lazy"
              decoding="async"
            />
          )}

          <div className="flex justify-center gap-2">
            <button type="submit" disabled={drinkLoading}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl shadow hover:opacity-95">
              {drinkLoading ? "Saving..." : editingDrinkId ? "Update" : "Add"}
            </button>
            <button type="button" onClick={resetDrinkForm}
              className="px-4 py-2 bg-gray-400 text-white rounded-2xl shadow">Cancel</button>
          </div>
        </form>
      )}

      {/* ===== FOODS GRID ===== */}
      <h2 className="text-xl font-semibold mb-4">Foods</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {currentFoods.map((food) => (
          <div key={food._id} className="border rounded-2xl p-4 bg-white shadow h-full flex flex-col border-gray-200">
            {food.image && (() => {
              const { src, srcSet, sizes } = buildImgSources(food.image, [320, 480, 640])
              return (
                <img
                  src={src}
                  srcSet={srcSet}
                  sizes={sizes}
                  className="w-full h-40 object-cover rounded mb-2"
                  alt={food.name}
                  onError={(e) => { e.currentTarget.src = "/fallback.jpg" }}
                  /* ✅ Fix + perf */
                  fetchPriority="low"
                  loading="lazy"
                  decoding="async"
                />
              )
            })()}
            <h3 className="font-bold">{food.name}</h3>
            <p className="text-sm text-gray-600 flex-grow">{food.description}</p>
            <p className="text-red-600 font-semibold">₦{food.price}</p>
            <span className="text-xs">{resolveCategoryLabel(food)}</span>
            <div className="flex gap-2 mt-2">
              <button onClick={() => handleEdit(food)} className="flex-1 px-2 py-1 bg-blue-500 text-white rounded">Edit</button>
              <button onClick={() => handleDeleteFood(food._id)} className="flex-1 px-2 py-1 bg-red-500 text-white rounded">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Foods Pagination */}
      <div className="flex items-center justify-between mt-4">
        <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1} className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50">
          Prev
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages} className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50">
          Next
        </button>
      </div>

      {/* ===== DRINKS GRID ===== */}
      <h2 className="text-xl font-semibold mt-10 mb-4">Drinks</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {currentDrinks.map((drink) => (
          <div key={drink._id} className="border rounded-2xl p-4 bg-white shadow h-full flex flex-col border-gray-200">
            {drink.image && (() => {
              const { src, srcSet, sizes } = buildImgSources(drink.image, [320, 480, 640])
              return (
                <img
                  src={src}
                  srcSet={srcSet}
                  sizes={sizes}
                  className="w-full h-40 object-cover rounded mb-2"
                  alt={drink.name}
                  onError={(e) => { e.currentTarget.src = "/fallback.jpg" }}
                  /* ✅ Fix + perf */
                  fetchPriority="low"
                  loading="lazy"
                  decoding="async"
                />
              )
            })()}
            <h3 className="font-bold">{drink.name}</h3>
            <p className="text-red-600 font-semibold">₦{drink.price}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => handleEditDrink(drink)} className="flex-1 px-2 py-1 bg-blue-500 text-white rounded">Edit</button>
              <button onClick={() => handleDeleteDrink(drink._id)} className="flex-1 px-2 py-1 bg-red-500 text-white rounded">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Drinks Pagination */}
      <div className="flex items-center justify-between mt-4">
        <button onClick={() => setCurrentDrinkPage((p) => Math.max(p - 1, 1))}
          disabled={currentDrinkPage === 1} className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50">
          Prev
        </button>
        <span>Page {currentDrinkPage} of {drinkTotalPages}</span>
        <button onClick={() => setCurrentDrinkPage((p) => Math.min(p + 1, drinkTotalPages))}
          disabled={currentDrinkPage === drinkTotalPages} className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50">
          Next
        </button>
      </div>

      <div className="mt-6 text-center">
        <button onClick={() => router.push("/dispatchCenter")}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Manage Orders
        </button>
      </div>
    </div>
  )
}
