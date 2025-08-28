"use client"
import { useState, useEffect } from "react"
import { ChevronDown, ChevronUp, Trash2, Edit } from "lucide-react"

export default function FoodPopDashboard() {
  const [food, setFood] = useState([])
  const [protein, setProtein] = useState([])
  const [drink, setDrink] = useState([])
  const [newItem, setNewItem] = useState({ food: { name: "", price: "" }, protein: { name: "", price: "" }, drink: { name: "", price: "" } })
  const [openItem, setOpenItem] = useState(null)
  const [portionCounts, setPortionCounts] = useState({})

  // Fetch all categories
  useEffect(() => {
    fetch("/api/foodpop").then(res => res.json()).then(setFood)
    fetch("/api/proteinpop").then(res => res.json()).then(setProtein)
    fetch("/api/drinkpop").then(res => res.json()).then(setDrink)
  }, [])

  // Add new item
  const handleAdd = async (category) => {
    if (!newItem[category].name.trim() || !newItem[category].price) return
    const res = await fetch(`/api/${category}pop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name: newItem[category].name, 
        price: Number(newItem[category].price) 
      }),
    })
    if (res.ok) {
      const item = await res.json()
      if (category === "food") setFood(prev => [...prev, item])
      if (category === "protein") setProtein(prev => [...prev, item])
      if (category === "drink") setDrink(prev => [...prev, item])
      setNewItem({ ...newItem, [category]: { name: "", price: "" } })
    }
  }

  // Delete item
  const handleDelete = async (category, id) => {
    const res = await fetch(`/api/${category}pop/${id}`, { method: "DELETE" })
    if (res.ok) {
      if (category === "food") setFood(prev => prev.filter(i => i._id !== id))
      if (category === "protein") setProtein(prev => prev.filter(i => i._id !== id))
      if (category === "drink") setDrink(prev => prev.filter(i => i._id !== id))
    }
  }

  // Update item
  const handleEdit = async (category, id) => {
    const current = (category === "food" ? food : category === "protein" ? protein : drink).find(i => i._id === id)
    const newLabel = prompt("Enter new name:", current.name)
    const newPrice = prompt("Enter new price:", current.price)
    if (!newLabel || !newPrice) return
    const res = await fetch(`/api/${category}pop/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newLabel, price: Number(newPrice) }),
    })
    if (res.ok) {
      const updated = await res.json()
      if (category === "food")
        setFood(prev => prev.map(i => (i._id === id ? updated : i)))
      if (category === "protein")
        setProtein(prev => prev.map(i => (i._id === id ? updated : i)))
      if (category === "drink")
        setDrink(prev => prev.map(i => (i._id === id ? updated : i)))
    }
  }

  // Portion update
  const adjustPortion = (id, delta) => {
    setPortionCounts(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta),
    }))
  }

  const renderSection = (label, data, category) => (
    <section>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">{label}</h2>
      <div className="space-y-3">
        {data.map((item) => (
          <div
            key={item._id}
            className="bg-white rounded-lg shadow p-4"
          >
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setOpenItem(openItem === item._id ? null : item._id)}
            >
              <span className="font-medium">{item.name} - ₦{item.price}</span>
              {openItem === item._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit(category, item._id)
                }}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(category, item._id)
                }}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Portion dropdown */}
            {openItem === item._id && (
              <div className="mt-3 pl-3 space-y-3">
                <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg">
                  <span>{portionCounts[item._id] || 1} Portion</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        adjustPortion(item._id, -1)
                      }}
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      –
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        adjustPortion(item._id, +1)
                      }}
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white shadow-2xl p-6 rounded-r-2xl">
        <h1 className="text-3xl font-extrabold mb-8 text-red-600 tracking-tight">
          FoodPop Dashboard
        </h1>

        {["food", "protein", "drink"].map((cat) => (
          <div key={cat} className="mb-6">
            <h3 className="text-lg font-semibold mb-2 capitalize">{cat}</h3>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={newItem[cat].name}
                onChange={(e) =>
                  setNewItem({ ...newItem, [cat]: { ...newItem[cat], name: e.target.value } })
                }
                placeholder={`Add ${cat}`}
                className="border p-2 rounded"
              />
              <input
                type="number"
                value={newItem[cat].price}
                onChange={(e) =>
                  setNewItem({ ...newItem, [cat]: { ...newItem[cat], price: e.target.value } })
                }
                placeholder="Price"
                className="border p-2 rounded"
              />
              <button
                onClick={() => handleAdd(cat)}
                className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 space-y-10">
        {renderSection("Food", food, "food")}
        {renderSection("Protein", protein, "protein")}
        {renderSection("Drink", drink, "drink")}
      </main>
    </div>
  )
}
