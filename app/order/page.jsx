"use client";
import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import {
  addItemCart2,
  removeItemCart2,
  incrementQuantity2,
  decrementQuantity2,
} from "../store/cartSlice2";
import { getTodaysSales, resetTodaysSales } from "../utils/salesTracker";
import { motion, AnimatePresence } from "framer-motion";

export default function OrderPage() {
  const [food, setFood] = useState([]);
  const [protein, setProtein] = useState([]);
  const [drink, setDrink] = useState([]);
  const [openItem, setOpenItem] = useState(null);
  const [search, setSearch] = useState("");
  const [todaysSales, setTodaysSales] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const cart = useSelector((state) => state.cart2.cartItem);
  const dispatch = useDispatch();
  const router = useRouter();

  // Fetch lists (no-store, with abort)
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [rf, rp, rd] = await Promise.all([
          fetch("/api/foodpop", { cache: "no-store", signal: ac.signal }),
          fetch("/api/proteinpop", { cache: "no-store", signal: ac.signal }),
          fetch("/api/drinkpop", { cache: "no-store", signal: ac.Signal }),
        ]);
        if (!rf.ok || !rp.ok || !rd.ok) throw new Error("Failed to load items");
        const [jf, jp, jd] = await Promise.all([rf.json(), rp.json(), rd.json()]);
        setFood(Array.isArray(jf) ? jf : []);
        setProtein(Array.isArray(jp) ? jp : []);
        setDrink(Array.isArray(jd) ? jd : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error(err);
          setFood([]); setProtein([]); setDrink([]);
        }
      } finally {
        setTodaysSales(getTodaysSales());
      }
    })();
    return () => ac.abort();
  }, []);

  // ---------- Helpers ----------
  const keyFor = (id, category) => `${category}-${id}`;

  const getItemCount = (id, category) => {
    const item = cart.find((p) => p._id === id && p.category === category);
    if (!item) return 0;
    return category === "food" ? item.portion : item.quantity;
  };

  const adjustCount = (item, category, delta) => {
    const count = getItemCount(item._id, category);

    if (delta > 0) {
      if (count === 0) {
        dispatch(
          addItemCart2({
            _id: item._id,
            name: item.name,
            category,
            price: item.price || 0,
            paymentMode: item.paymentMode || "",
          })
        );
      } else {
        dispatch(incrementQuantity2({ id: item._id, category }));
      }
    } else if (delta < 0) {
      if (count > 1) {
        dispatch(decrementQuantity2({ id: item._id, category }));
      } else if (count === 1) {
        dispatch(removeItemCart2({ id: item._id, category }));
      }
    }
  };

  const handleSelectItem = (item, category) => {
    const k = keyFor(item._id, category);
    const count = getItemCount(item._id, category);
    if (count === 0) adjustCount(item, category, +1);
    setOpenItem((prev) => (prev === k ? null : k));
  };

  const filteredData = (data) => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((item) => String(item?.name || "").toLowerCase().includes(q));
  };

  const colorTone = {
    purple: { title: "text-purple-700", chip: "bg-purple-50 text-purple-700", btn: "from-purple-600 to-fuchsia-600" },
    red: { title: "text-red-700", chip: "bg-red-50 text-red-700", btn: "from-rose-600 to-red-600" },
    blue: { title: "text-blue-700", chip: "bg-blue-50 text-blue-700", btn: "from-blue-600 to-indigo-600" },
  };

  const money = (n) =>
    typeof n === "number"
      ? `₦${n.toLocaleString()}`
      : typeof n === "string" && n.trim() !== ""
      ? `₦${Number(n).toLocaleString()}`
      : "₦0";

  const SectionCard = ({ label, data, category, palette }) => {
    const tone = colorTone[palette] || colorTone.purple;
    return (
      <section>
        <h2 className={`text-2xl font-extrabold mb-4 ${tone.title}`}>{label}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filteredData(data).map((item) => {
            const count = getItemCount(item._id, category);
            const isOpen = openItem === keyFor(item._id, category);
            return (
              <motion.div
                key={`${category}-${item._id}`}
                whileHover={{ scale: 1.02 }}
                className="bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow-sm p-4 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => handleSelectItem(item, category)}
                    className="text-left font-semibold text-gray-900 hover:underline decoration-2 underline-offset-4"
                  >
                    {item.name}
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">
                      {money(item.price || 0)}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tone.chip}`}>
                      {count}
                    </span>
                    <button
                      onClick={() =>
                        setOpenItem((prev) =>
                          prev === keyFor(item._id, category) ? null : keyFor(item._id, category)
                        )
                      }
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                    >
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-3">
                        <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-xl border">
                          <span className="text-sm text-gray-600">
                            {count}{" "}
                            {category === "food"
                              ? count === 1 ? "Plate" : "Plates"
                              : category === "protein"
                              ? count === 1 ? "Piece" : "Pieces"
                              : count === 1 ? "Drink" : "Drinks"}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => adjustCount(item, category, -1)}
                              disabled={count === 0}
                              className="h-11 w-11 rounded-full border border-gray-300 bg-white text-2xl font-extrabold hover:bg-gray-100 active:scale-95 disabled:opacity-40"
                            >
                              –
                            </button>
                            <span className="min-w-[2.5rem] text-center font-bold text-lg text-gray-800">
                              {count}
                            </span>
                            <button
                              onClick={() => adjustCount(item, category, +1)}
                              className="h-11 w-11 rounded-full text-2xl font-extrabold bg-gradient-to-br from-emerald-500 to-green-600 text-white hover:brightness-110 active:scale-95 shadow-sm"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => adjustCount(item, category, +1)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${tone.btn}`}
                          >
                            Add one more
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </section>
    );
  };

  const handleProceed = () => router.push("/summary");

  // ---- Payment breakdown (cash / card / transfer) ----
  const { cashToday, cardToday, transferToday } = useMemo(() => {
    let cash = 0, card = 0, transfer = 0;
    cart.forEach((item) => {
      const count = item.category === "food" ? item.portion : item.quantity;
      const subtotal = (item.price || 0) * count;
      const pm = (item.paymentMode || "").toLowerCase();
      if (pm === "cash") cash += subtotal;
      else if (pm === "card") card += subtotal;
      else if (pm === "transfer" || pm === "upi") transfer += subtotal;
    });
    return { cashToday: cash, cardToday: card, transferToday: transfer };
  }, [cart]);

  const handleConfirmClose = async () => {
    if (password === "@salesrep") {
      setLoading(true);
      try {
        const today = new Date().toISOString().split("T")[0];
        const res = await fetch("/api/email/send-sales-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: todaysSales,
            cash: cashToday,
            card: cardToday,
            transfer: transferToday,
            date: today,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to send email");

        setToast({ type: "success", message: "✅ Sales report sent successfully!" });
        setTodaysSales(resetTodaysSales());
        setShowModal(false);
        setPassword("");
        setError("");
      } catch (err) {
        console.error("❌ Error:", err.message);
        setError("Failed to send sales report. Try again.");
      } finally {
        setLoading(false);
      }
    } else {
      setError("Incorrect password");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 p-6 md:p-10 pb-28">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-gray-900">Cashier Order Page</h1>

      {/* Today’s Sales */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex justify-between items-center bg-gradient-to-r from-green-500 to-emerald-600 p-5 rounded-2xl shadow-lg text-white"
      >
        <p className="text-xl md:text-2xl font-extrabold">
          Today’s Sales: {money(todaysSales)}
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-red-600 text-white font-semibold rounded-xl shadow hover:bg-red-700 active:scale-95"
        >
          Close Sales
        </button>
      </motion.div>

      {/* Search */}
      <div className="mb-10 relative max-w-md">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-400 outline-none bg-white/90"
        />
      </div>

      <div className="space-y-12">
        <SectionCard label="Food 🍲" data={food} category="food" palette="purple" />
        <SectionCard label="Protein 🍖" data={protein} category="protein" palette="red" />
        <SectionCard label="Drink 🥤" data={drink} category="drink" palette="blue" />
      </div>

      {/* Floating Proceed button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleProceed}
        className="fixed bottom-6 right-6 z-40 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl shadow-lg hover:opacity-90"
      >
        Proceed to Summary →
      </motion.button>

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
              <X size={20} />
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

            <div className="text-sm text-gray-700 mb-3 space-y-1">
              <p><strong>Cash:</strong> {money(cashToday)}</p>
              <p><strong>Card:</strong> {money(cardToday)}</p>
              <p><strong>Transfer:</strong> {money(transferToday)}</p>
            </div>

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
            className={`fixed bottom-5 right-5 px-4 py-3 rounded-xl shadow-lg text-white ${
              toast.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
