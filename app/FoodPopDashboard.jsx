"use client";
import React, { useEffect, useState, useRef, memo } from "react";
import { Trash2, Edit, Menu, X } from "lucide-react";

export default function FoodPopDashboard() {
  const [food, setFood] = useState([]);
  const [protein, setProtein] = useState([]);
  const [drink, setDrink] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer

  // ---- helpers ----
  const money = (n) => `₦${Number(n || 0).toLocaleString("en-NG")}`;

  const getListSetter = (category) => {
    if (category === "food") return setFood;
    if (category === "protein") return setProtein;
    if (category === "drink") return setDrink;
    return null;
  };

  const assertCategory = (category) => {
    if (!["food", "protein", "drink"].includes(category)) {
      throw new Error(`Invalid category: ${category}`);
    }
  };

  // ---- fetch all categories (with abort + no-store) ----
  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const [rf, rp, rd] = await Promise.all([
          fetch("/api/foodpop", { cache: "no-store", signal: ac.signal }),
          fetch("/api/proteinpop", { cache: "no-store", signal: ac.signal }),
          fetch("/api/drinkpop", { cache: "no-store", signal: ac.signal }),
        ]);

        if (!rf.ok || !rp.ok || !rd.ok) {
          throw new Error("Failed to load one or more lists");
        }

        const [jf, jp, jd] = await Promise.all([rf.json(), rp.json(), rd.json()]);
        setFood(Array.isArray(jf) ? jf : []);
        setProtein(Array.isArray(jp) ? jp : []);
        setDrink(Array.isArray(jd) ? jd : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Init fetch error:", err);
          alert("Failed to load items.");
          setFood([]); setProtein([]); setDrink([]);
        }
      }
    })();

    return () => ac.abort();
  }, []);

  // ------- CRUD -------

  const handleAdd = async (category, { name, price }) => {
    try {
      assertCategory(category);
      const res = await fetch(`/api/${category}pop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ name: String(name || "").trim(), price: Number(price) }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || `Failed to add ${category}`);
      }
      const item = await res.json();
      const setList = getListSetter(category);
      if (setList) setList((p) => [...p, item]);
    } catch (err) {
      console.error(err);
      alert(err.message || "Add failed.");
    }
  };

  const handleDelete = async (category, id) => {
    try {
      assertCategory(category);
      if (!id) return;
      if (!confirm("Delete this item?")) return;

      const res = await fetch(`/api/${category}pop/${encodeURIComponent(id)}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || `Failed to delete ${category}`);
      }
      const setList = getListSetter(category);
      if (setList) setList((p) => p.filter((i) => i._id !== id));
    } catch (err) {
      console.error(err);
      alert(err.message || "Delete failed.");
    }
  };

  const handleEdit = async (category, id) => {
    try {
      assertCategory(category);
      const list =
        category === "food" ? food : category === "protein" ? protein : drink;

      const current = list.find((i) => i._id === id) || {};
      const newLabel = prompt("Enter new name:", current.name ?? "");
      if (newLabel == null) return; // cancel pressed

      const newPriceStr = prompt("Enter new price:", String(current.price ?? ""));
      if (newPriceStr == null || newPriceStr === "") return;

      const newPrice = Number(newPriceStr);
      if (Number.isNaN(newPrice)) {
        alert("Price must be a number.");
        return;
      }

      const res = await fetch(`/api/${category}pop/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ name: String(newLabel).trim(), price: newPrice }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || `Failed to update ${category}`);
      }
      const updated = await res.json();

      const setList = getListSetter(category);
      if (setList) setList((p) => p.map((i) => (i._id === id ? updated : i)));
    } catch (err) {
      console.error(err);
      alert(err.message || "Update failed.");
    }
  };

  // ------- UI Parts (unchanged) -------

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
  );

  // Local-state AddForm to prevent focus loss
  const AddForm = memo(function AddForm({ cat, title, onAdd }) {
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const nameRef = useRef(null);
    const priceRef = useRef(null);
    const addBtnRef = useRef(null);

    const add = async () => {
      const cleanName = name.trim();
      const numPrice = Number(price);
      if (!cleanName) {
        nameRef.current?.focus();
        return;
      }
      if (price === "" || Number.isNaN(numPrice)) {
        priceRef.current?.focus();
        return;
      }
      await onAdd(cat, { name: cleanName, price: numPrice });
      setName("");
      setPrice("");
      requestAnimationFrame(() => nameRef.current?.focus());
    };

    const onKeyDownName = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        priceRef.current?.focus();
      }
    };
    const onKeyDownPrice = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addBtnRef.current?.click();
      }
    };

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
    );
  });

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
              Chicken and Rice 
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
  );
}
