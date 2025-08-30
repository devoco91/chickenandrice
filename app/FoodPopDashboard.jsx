"use client"
import React, { useEffect, useState, useRef, memo } from "react"
import { Trash2, Edit, Menu, X } from "lucide-react"

export default function FoodPopDashboard() {
  const [food, setFood] = useState([])
  const [protein, setProtein] = useState([])
  const [drink, setDrink] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false) // mobile drawer

  // Fetch all categories once
  useEffect(() => {
    fetch("/api/foodpop").then((r) => r.json()).then(setFood)
    fetch("/api/proteinpop").then((r) => r.json()).then(setProtein)
    fetch("/api/drinkpop").then((r) => r.json()).then(setDrink)
  }, [])

  const money = (n) => `₦${Number(n || 0).toLocaleString("en-NG")}`

  // ------- CRUD -------
  const handleAdd = async (category, { name, price }) => {
    const res = await fetch(`/api/${category}pop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), price: Number(price) }),
    })
    if (!res.ok) return
    const item = await res.json()
    if (category === "food") setFood((p) => [...p, item])
    if (category === "protein") setProtein((p) => [...p, item])
    if (category === "drink") setDrink((p) => [...p, item])
  }

  const handleDelete = async (category, id) => {
    if (!confirm("Delete this item?")) return
    const res = await fetch(`/api/${category}pop/${id}`, { method: "DELETE" })
    if (!res.ok) return
    if (category === "food") setFood((p) => p.filter((i) => i._id !== id))
    if (category === "protein") setProtein((p) => p.filter((i) => i._id !== id))
    if (category === "drink") setDrink((p) => p.filter((i) => i._id !== id))
  }

  const handleEdit = async (category, id) => {
    const list = category === "food" ? food : category === "protein" ? protein : drink
    const current = list.find((i) => i._id === id)
    const newLabel = prompt("Enter new name:", current?.name ?? "")
    const newPrice = prompt("Enter new price:", current?.price ?? "")
    if (!newLabel || newPrice === null || newPrice === "") return
    const res = await fetch(`/api/${category}pop/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newLabel.trim(), price: Number(newPrice) }),
    })
    if (!res.ok) return
    const updated = await res.json()
    if (category === "food") setFood((p) => p.map((i) => (i._id === id ? updated : i)))
    if (category === "protein") setProtein((p) => p.map((i) => (i._id === id ? updated : i)))
    if (category === "drink") setDrink((p) => p.map((i) => (i._id === id ? updated : i)))
  }

  // ------- UI Parts -------
  const ItemCard = ({ item, category }) => (
    <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow-sm p-4 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{item.name}</p>
          <p className="text-sm text-gray-500">{money(item.price)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleEdit(category, item._id)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-95 transition"
            title="Edit"
          >
            <Edit size={14} />
            Edit
          </button>
          <button
            type="button"
            onClick={() => handleDelete(category, item._id)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 active:scale-95 transition"
            title="Delete"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
    </div>
  )

  // Local-state AddForm to prevent focus loss
  const AddForm = memo(function AddForm({ cat, title, onAdd }) {
    const [name, setName] = useState("")
    const [price, setPrice] = useState("")
    const nameRef = useRef(null)
    const priceRef = useRef(null)
    const addBtnRef = useRef(null)

    const add = async () => {
      const cleanName = name.trim()
      const numPrice = Number(price)
      if (!cleanName) {
        nameRef.current?.focus()
        return
      }
      if (price === "" || Number.isNaN(numPrice)) {
        priceRef.current?.focus()
        return
      }
      await onAdd(cat, { name: cleanName, price: numPrice })
      // reset and refocus name for quick entry
      setName("")
      setPrice("")
      // keep focus steady on name input
      requestAnimationFrame(() => nameRef.current?.focus())
    }

    const onKeyDownName = (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        priceRef.current?.focus()
      }
    }
    const onKeyDownPrice = (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        addBtnRef.current?.click()
      }
    }

    return (
      <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">{title}</h3>
        <div className="flex flex-col gap-2">
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onKeyDownName}
            placeholder="Name"
            autoComplete="off"
            className="w-full px-3 py-2 rounded-xl border border-gray-300 shadow-sm outline-none focus:ring-2 focus:ring-purple-400 bg-white"
          />
          <input
            ref={priceRef}
            type="number"
            inputMode="decimal"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={onKeyDownPrice}
            placeholder="Price"
            autoComplete="off"
            className="w-full px-3 py-2 rounded-xl border border-gray-300 shadow-sm outline-none focus:ring-2 focus:ring-purple-400 bg-white"
          />
          <button
            ref={addBtnRef}
            type="button"
            onClick={add}
            className="px-4 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-rose-600 to-red-600 shadow hover:opacity-95 active:scale-95 transition"
          >
            Add
          </button>
        </div>
      </div>
    )
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Top bar (mobile) */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-200 px-4 py-3 flex items-center justify-between md:hidden">
        <h1 className="text-xl font-extrabold text-gray-900">FoodPop Dashboard</h1>
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 active:scale-95 transition"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="mx-auto max-w-7xl md:flex md:gap-6">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:block md:w-80 md:shrink-0">
          <div className="sticky top-6 p-6">
            <h2 className="text-3xl font-extrabold mb-6 text-rose-600 tracking-tight">
              FoodPop Dashboard
            </h2>
            <div className="grid gap-4">
              <AddForm cat="food" title="Add Food" onAdd={handleAdd} />
              <AddForm cat="protein" title="Add Protein" onAdd={handleAdd} />
              <AddForm cat="drink" title="Add Drink" onAdd={handleAdd} />
            </div>
          </div>
        </aside>

        {/* Mobile drawer for forms */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl p-5 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Add Items</h2>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid gap-4">
                <AddForm cat="food" title="Add Food" onAdd={handleAdd} />
                <AddForm cat="protein" title="Add Protein" onAdd={handleAdd} />
                <AddForm cat="drink" title="Add Drink" onAdd={handleAdd} />
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8">
          {/* Food */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-extrabold text-gray-900">Food</h3>
            </div>
            {food.length === 0 ? (
              <p className="text-sm text-gray-500">No food items yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {food.map((item) => (
                  <ItemCard key={`food-${item._id}`} item={item} category="food" />
                ))}
              </div>
            )}
          </section>

          {/* Protein */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-extrabold text-gray-900">Protein</h3>
            </div>
            {protein.length === 0 ? (
              <p className="text-sm text-gray-500">No protein items yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {protein.map((item) => (
                  <ItemCard key={`protein-${item._id}`} item={item} category="protein" />
                ))}
              </div>
            )}
          </section>

          {/* Drink */}
          <section className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-extrabold text-gray-900">Drink</h3>
            </div>
            {drink.length === 0 ? (
              <p className="text-sm text-gray-500">No drink items yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {drink.map((item) => (
                  <ItemCard key={`drink-${item._id}`} item={item} category="drink" />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
