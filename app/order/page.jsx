"use client"
import { useState, useEffect } from "react"
import { ChevronDown, ChevronUp, Search, X } from "lucide-react"
import { useDispatch, useSelector } from "react-redux"
import { useRouter } from "next/navigation"
import { addItemCart2, removeItemCart2, incrementQuantity2, decrementQuantity2 } from "../store/cartSlice2"
import { getTodaysSales, resetTodaysSales } from "../utils/salesTracker"
import { motion, AnimatePresence } from "framer-motion"

export default function OrderPage() {
  const [food, setFood] = useState([])
  const [protein, setProtein] = useState([])
  const [drink, setDrink] = useState([])
  const [openItem, setOpenItem] = useState(null)
  const [search, setSearch] = useState("")
  const [todaysSales, setTodaysSales] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const cart = useSelector((state) => state.cart2.cartItem)
  const dispatch = useDispatch()
  const router = useRouter()

  useEffect(() => {
    fetch("/api/foodpop").then(res => res.json()).then(setFood)
    fetch("/api/proteinpop").then(res => res.json()).then(setProtein)
    fetch("/api/drinkpop").then(res => res.json()).then(setDrink)
    setTodaysSales(getTodaysSales())
  }, [])

  const getItemCount = (id, category) => {
    const item = cart.find(p => p._id === id && p.category === category)
    if (!item) return 0
    return category === "food" ? item.portion : item.quantity
  }

  const adjustCount = (item, category, delta) => {
    const count = getItemCount(item._id, category)

    if (delta > 0) {
      if (count === 0) {
        dispatch(addItemCart2({
          _id: item._id,
          name: item.name,
          category,
          price: item.price || 0,
        }))
      } else {
        dispatch(incrementQuantity2({ id: item._id, category }))
      }
    } else if (delta < 0) {
      if (count > 1) {
        dispatch(decrementQuantity2({ id: item._id, category }))
      } else if (count === 1) {
        dispatch(removeItemCart2({ id: item._id, category }))
      }
    }
  }

  const filteredData = (data) => {
    if (!search.trim()) return data
    return data.filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
  }

  const renderSection = (label, data, category, color) => (
    <section>
      <h2 className={`text-2xl font-bold mb-4 text-${color}-700`}>{label}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {filteredData(data).map(item => {
          const count = getItemCount(item._id, category)
          return (
            <motion.div 
              key={item._id} 
              whileHover={{ scale: 1.03 }}
              className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-md p-4 transition"
            >
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setOpenItem(openItem === item._id ? null : item._id)}
              >
                <span className="font-semibold text-gray-800">{item.name}</span>
                {openItem === item._id ? <ChevronUp size={18}/> : <ChevronDown size={18}/> }
              </div>

              {openItem === item._id && (
                <div className="mt-3 pl-2 space-y-2">
                  <div className="flex justify-between items-center bg-gray-100 px-3 py-2 rounded-xl">
                    <span className="text-sm text-gray-600">
                      {count}{" "}
                      {category === "food"
                        ? count === 1 ? "Plate" : "Plates"
                        : category === "protein"
                          ? count === 1 ? "Piece" : "Pieces"
                          : count === 1 ? "Drink" : "Drinks"}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => adjustCount(item, category, -1)}
                        className="px-5 py-3 text-2xl font-bold bg-gray-200 rounded-full hover:bg-gray-300 transition"
                      >
                        –
                      </button>
                      <button
                        onClick={() => adjustCount(item, category, 1)}
                        className="px-5 py-3 text-2xl font-bold bg-gray-300 text-gray-700 rounded-full hover:bg-gray-400 transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </section>
  )

  const handleProceed = () => {
    router.push("/summary")
  }

  const handleConfirmClose = async () => {
    if (password === "@salesrep") {
      setLoading(true)
      try {
        const today = new Date().toISOString().split("T")[0]

       const res = await fetch("/api/email/send-sales-report", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ amount: todaysSales, date: today }),
});

        const data = await res.json()

        if (!res.ok) throw new Error(data.error || "Failed to send email")

        setToast({ type: "success", message: "✅ Sales report sent successfully!" })

        setTodaysSales(resetTodaysSales())
        setShowModal(false)
        setPassword("")
        setError("")
      } catch (err) {
        console.error("❌ Error:", err.message)
        setError("Failed to send sales report. Try again.")
      } finally {
        setLoading(false)
      }
    } else {
      setError("Incorrect password")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 p-6 md:p-10">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-gray-800">
        Cashier Order Page
      </h1>

      {/* Today’s Sales */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex justify-between items-center bg-gradient-to-r from-green-400 to-green-600 p-5 rounded-2xl shadow-lg text-white"
      >
        <div className="flex items-center gap-2">
          <p className="text-xl md:text-2xl font-bold">Today’s Sales: ₦{todaysSales}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-red-600 text-white font-semibold rounded-xl shadow hover:bg-red-700 transition"
        >
          Close Sales
        </button>
      </motion.div>

      {/* Search */}
      <div className="mb-10 relative max-w-md">
        <Search className="absolute left-3 top-3 text-gray-400" size={20}/>
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-400 outline-none"
        />
      </div>

      <div className="space-y-12">
        {renderSection("Food 🍲", food, "food", "purple")}
        {renderSection("Protein 🍖", protein, "protein", "red")}
        {renderSection("Drink 🥤", drink, "drink", "blue")}
      </div>

      <div className="mt-12 flex justify-end">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleProceed}
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition"
        >
          Proceed to Summary →
        </motion.button>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm relative"
          >
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X size={20}/>
            </button>

            <h2 className="text-xl font-bold mb-4">Confirm Close Sales</h2>
            <p className="text-gray-600 mb-3">Enter password to confirm:</p>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-3"
              placeholder="Enter password"
            />

            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)} 
                className="px-4 py-2 rounded-lg border"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmClose} 
                className="px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Sending..." : "Confirm"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`fixed bottom-5 right-5 px-4 py-3 rounded-xl shadow-lg text-white ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
