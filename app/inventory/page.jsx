// app/inventory/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "../utils/apiBase";

const fmtNum = (n) => Number(n || 0).toLocaleString("en-NG");
const fmtGram = (g) => {
  const n = Number(g || 0);
  if (n >= 1000) return `${(n / 1000).toFixed(2)} kg`;
  return `${fmtNum(n)} g`;
};

const tryJson = async (res) => {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) return res.json();
  const text = await res.text().catch(() => "");
  return { _raw: text };
};
async function getJSON(url, signal) {
  const res = await fetch(url, { cache: "no-store", signal });
  if (!res.ok) {
    const snippet = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} ${res.statusText}${snippet ? ` – ${snippet.slice(0, 160)}` : ""}`
    );
  }
  return tryJson(res);
}
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const snippet = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} ${res.statusText}${snippet ? ` – ${snippet.slice(0, 160)}` : ""}`
    );
  }
  return tryJson(res);
}
async function patchJSON(url, body) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const snippet = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} ${res.statusText}${snippet ? ` – ${snippet.slice(0, 160)}` : ""}`
    );
  }
  return tryJson(res);
}
async function del(url) {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const snippet = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} ${res.statusText}${snippet ? ` – ${snippet.slice(0, 160)}` : ""}`
    );
  }
  return tryJson(res);
}

const safeAbort = (controller) => {
  if (!controller) return;
  try {
    if (!controller.signal.aborted) controller.abort();
  } catch {}
};

// helper to choose kind for piece items created from inferred rows
const pieceKind = (name = "") => {
  const sl = String(name).toLowerCase();
  // treat these piece items as FOOD (pcs)
  if (/moimoi|moi|moi-?moi|plantain|dodo|pack|packs/.test(sl)) return "food";
  // proteins remain protein (pcs)
  if (/(chicken|beef|goat|turkey|fish|meat|protein|gizzard|ponmo|shaki|kote|cowleg|egg)/.test(sl))
    return "protein";
  // everything else piece-like defaults to drinks
  return "drink";
};

export default function InventoryPage() {
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null); // {_id, sku, unit, ...}
  const [pollMs, setPollMs] = useState(20000);

  const abortRef = useRef(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setErr("");
      safeAbort(abortRef.current);
      const ac = new AbortController();
      abortRef.current = ac;

      const s = await getJSON(`${API_BASE}/inventory/summary?ts=${Date.now()}`, ac.signal);
      setSummary(s || {});
      try {
        const m = await getJSON(`${API_BASE}/inventory/movements?limit=50&ts=${Date.now()}`, ac.signal);
        setMovements(Array.isArray(m?.items) ? m.items : Array.isArray(m) ? m : []);
      } catch {
        setMovements([]);
      }
      setLastUpdated(new Date());
    } catch (e) {
      if (e?.name === "AbortError") return;
      console.error("inventory fetch failed:", e);
      setErr(e?.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const id = pollMs > 0 ? setInterval(fetchAll, pollMs) : null;
    return () => {
      if (id) clearInterval(id);
      const c = abortRef.current;
      abortRef.current = null;
      safeAbort(c);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs]);

  const totals = useMemo(() => {
    const food = Array.isArray(summary?.food) ? summary.food : [];
    const drinks = Array.isArray(summary?.drinks) ? summary.drinks : [];
    const proteins = Array.isArray(summary?.proteins) ? summary.proteins : [];
    const foodRemainG = food.reduce((s, r) => s + Number(r?.remaining || 0), 0);
    const drinkRemain = drinks.reduce((s, r) => s + Number(r?.remaining || 0), 0);
    const proteinRemain = proteins.reduce((s, r) => s + Number(r?.remaining || 0), 0);
    return { foodRemainG, drinkRemain, proteinRemain };
  }, [summary]);

  const onItemSaved = async () => {
    setShowAdd(false);
    setEditItem(null);
    await fetchAll();
  };

  const onItemDelete = async (row) => {
    if (!row?._id) return alert("Cannot delete an inferred row. Edit after creating the item.");
    const ok = confirm(`Delete "${row.sku}"? This removes it from today's inventory.`);
    if (!ok) return;
    try {
      await del(`${API_BASE}/inventory/items/${row._id}`);
      await fetchAll();
    } catch (e) {
      alert(e.message || "Failed to delete.");
    }
  };

  const rowClick = (row) => {
    if (!row?._id) {
      // inferred row from orders — prefill creation
      setEditItem({
        _id: null,
        name: row.sku,
        kind: row.unit === "gram" ? "food" : pieceKind(row.sku),
        unit: row.unit,
        aliases: [],
      });
    } else {
      setEditItem({
        _id: row._id,
        name: row.sku,
        kind: row.unit === "gram" ? "food" : row.kind || pieceKind(row.sku),
        unit: row.unit,
        aliases: [],
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 p-6 md:p-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">Inventory</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-green-600 shadow hover:opacity-95 active:scale-95"
          >
            Add Stock Item
          </button>
          <button
            onClick={fetchAll}
            disabled={loading}
            className={`px-4 py-2 rounded-xl font-semibold text-white shadow ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-4 shadow rounded-2xl">
          <h2 className="text-lg font-bold opacity-90">Food Remaining</h2>
          <p className="text-2xl font-extrabold">{fmtGram(totals.foodRemainG)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-4 shadow rounded-2xl">
          <h2 className="text-lg font-bold opacity-90">Drinks Remaining</h2>
          <p className="text-2xl font-extrabold">{fmtNum(totals.drinkRemain)} pcs</p>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-red-600 text-white p-4 shadow rounded-2xl">
          <h2 className="text-lg font-bold opacity-90">Proteins Remaining</h2>
          <p className="text-2xl font-extrabold">{fmtNum(totals.proteinRemain)} pcs</p>
        </div>
      </div>

      {/* Error + Last updated */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        {err ? <div className="text-rose-700 font-semibold">⚠️ {err}</div> : <span />}
        <div className="text-sm text-gray-600">
          Last updated: {lastUpdated ? lastUpdated.toLocaleString() : "—"}
          <span className="ml-3">Auto-refresh:</span>
          <select
            value={pollMs}
            onChange={(e) => setPollMs(Number(e.target.value))}
            className="ml-2 border rounded-lg px-2 py-1 bg-white"
          >
            <option value={0}>Off</option>
            <option value={10000}>10s</option>
            <option value={20000}>20s</option>
            <option value={30000}>30s</option>
            <option value={60000}>60s</option>
          </select>
        </div>
      </div>

      {/* Tables */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Food (can be grams OR pieces per row) */}
        <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow p-4">
          <h3 className="font-bold mb-2">Food</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-3 border-b">Item</th>
                  <th className="p-3 border-b">Remaining</th>
                  <th className="p-3 border-b">Used</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(summary?.food) ? summary.food : []).map((r, i) => (
                  <tr
                    key={r?.slug || i}
                    className={`${i % 2 === 0 ? "bg-gray-50/60" : "bg-white"} hover:bg-gray-100 cursor-pointer`}
                    onClick={() => rowClick(r)}
                  >
                    <td className="p-3 border-b">{r?.sku || "-"}</td>
                    <td className="p-3 border-b">
                      {r?.unit === "gram" ? fmtGram(r?.remaining) : `${fmtNum(r?.remaining)} pcs`}
                    </td>
                    <td className="p-3 border-b">
                      {r?.unit === "gram" ? fmtGram(r?.used) : `${fmtNum(r?.used)} pcs`}
                    </td>
                  </tr>
                ))}
                {(!summary?.food || summary.food.length === 0) && (
                  <tr><td className="p-3 border-b text-gray-500" colSpan={3}>No food rows.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Drinks (pieces) */}
        <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow p-4">
          <h3 className="font-bold mb-2">Drinks (pieces)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-3 border-b">Item</th>
                  <th className="p-3 border-b">Remaining</th>
                  <th className="p-3 border-b">Used</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(summary?.drinks) ? summary.drinks : []).map((r, i) => (
                  <tr
                    key={r?.slug || i}
                    className={`${i % 2 === 0 ? "bg-gray-50/60" : "bg-white"} hover:bg-gray-100 cursor-pointer`}
                    onClick={() => rowClick(r)}
                  >
                    <td className="p-3 border-b">{r?.sku || "-"}</td>
                    <td className="p-3 border-b">{fmtNum(r?.remaining)} pcs</td>
                    <td className="p-3 border-b">{fmtNum(r?.used)} pcs</td>
                  </tr>
                ))}
                {(!summary?.drinks || summary.drinks.length === 0) && (
                  <tr><td className="p-3 border-b text-gray-500" colSpan={3}>No drinks rows.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Proteins (pieces) */}
        <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow p-4">
          <h3 className="font-bold mb-2">Proteins (pieces)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-3 border-b">Item</th>
                  <th className="p-3 border-b">Remaining</th>
                  <th className="p-3 border-b">Used</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(summary?.proteins) ? summary.proteins : []).map((r, i) => (
                  <tr
                    key={r?.slug || i}
                    className={`${i % 2 === 0 ? "bg-gray-50/60" : "bg-white"} hover:bg-gray-100 cursor-pointer`}
                    onClick={() => rowClick(r)}
                  >
                    <td className="p-3 border-b">{r?.sku || "-"}</td>
                    <td className="p-3 border-b">{fmtNum(r?.remaining)} pcs</td>
                    <td className="p-3 border-b">{fmtNum(r?.used)} pcs</td>
                  </tr>
                ))}
                {(!summary?.proteins || summary.proteins.length === 0) && (
                  <tr><td className="p-3 border-b text-gray-500" colSpan={3}>No protein rows.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent movements */}
      <div className="mt-8 bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow p-4">
        <h3 className="font-bold mb-2">Recent Movements</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3 border-b">When</th>
                <th className="p-3 border-b">Type</th>
                <th className="p-3 border-b">SKU</th>
                <th className="p-3 border-b">Unit</th>
                <th className="p-3 border-b">Note</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr><td className="p-3 border-b text-gray-500" colSpan={5}>No movements yet.</td></tr>
              ) : movements.map((m, i) => (
                <tr key={m?._id || i} className={i % 2 === 0 ? "bg-gray-50/60" : "bg-white"}>
                  <td className="p-3 border-b">{m?.createdAt ? new Date(m.createdAt).toLocaleString() : "-"}</td>
                  <td className="p-3 border-b capitalize">{m?.type || "-"}</td>
                  <td className="p-3 border-b">{m?.sku || "-"}</td>
                  <td className="p-3 border-b">{m?.unit || "-"}</td>
                  <td className="p-3 border-b">{m?.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <AddItemModal onClose={() => setShowAdd(false)} onSaved={onItemSaved} />}
      {editItem && (
        <EditItemModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={onItemSaved}
          onDelete={onItemDelete}
        />
      )}
    </div>
  );
}

function AddItemModal({ onClose, onSaved }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("food");
  const [unit, setUnit] = useState("gram");
  const [aliases, setAliases] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (!name.trim()) {
      setErr("Enter the item name/SKU.");
      return;
    }
    const body = {
      sku: name.trim(),
      kind,
      unit,
      aliases: aliases
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      setLoading(true);
      const r = await postJSON(`${API_BASE}/inventory/items`, body);
      if (r?.error) throw new Error(r.error);
      onSaved?.();
    } catch (e) {
      setErr(e?.message || "Failed to add item.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white w-11/12 md:w-[540px] p-6 rounded-2xl shadow-xl relative">
        <button className="absolute top-3 right-3 bg-gray-200 text-gray-800 px-3 py-1 rounded-lg hover:bg-gray-300" onClick={onClose}>✕</button>
        <h2 className="text-xl font-extrabold mb-4 text-gray-900">Add Stock Item</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-700">SKU / Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400" placeholder="e.g. Fried Rice" />
          </div>
          <div>
            <label className="text-sm text-gray-700">Kind</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400">
              <option value="food">Food (grams)</option>
              <option value="drink">Drink (pieces)</option>
              <option value="protein">Protein (pieces)</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700">Unit</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400">
              <option value="gram">Gram</option>
              <option value="piece">Piece</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm text-gray-700">Aliases (comma-separated)</label>
            <input value={aliases} onChange={(e) => setAliases(e.target.value)} className="w-full border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400" placeholder="fried rice,fried-rice,fr rice" />
          </div>
        </div>

        {err && <div className="mt-3 text-rose-600 text-sm font-semibold">{err}</div>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white border border-gray-300 text-gray-800 hover:bg-gray-50" disabled={loading}>Cancel</button>
          <button onClick={submit} disabled={loading} className={`px-4 py-2 rounded-xl font-semibold text-white shadow ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`}>{loading ? "Saving..." : "Save Item"}</button>
        </div>
      </div>
    </div>
  );
}

function EditItemModal({ item, onClose, onSaved, onDelete }) {
  const [name, setName] = useState(item?.name ?? item?.sku ?? "");
  const [kind, setKind] = useState(item?.kind || (item?.unit === "gram" ? "food" : "drink"));
  const [unit, setUnit] = useState(item?.unit || "gram");
  const [aliases, setAliases] = useState(Array.isArray(item?.aliases) ? item.aliases.join(", ") : "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setErr("");
    const body = {
      name: String(name || "").trim(),
      kind,
      unit,
      aliases: String(aliases || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      setLoading(true);
      if (item?._id) {
        await patchJSON(`${API_BASE}/inventory/items/${item._id}`, body);
      } else {
        await postJSON(`${API_BASE}/inventory/items`, { sku: body.name, kind, unit, aliases: body.aliases });
      }
      onSaved?.();
    } catch (e) {
      setErr(e?.message || "Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  const doDelete = async () => {
    if (!item?._id) return alert("Create the item first, then you can delete it.");
    await onDelete?.(item);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white w-11/12 md:w-[540px] p-6 rounded-2xl shadow-xl relative">
        <button className="absolute top-3 right-3 bg-gray-200 text-gray-800 px-3 py-1 rounded-lg hover:bg-gray-300" onClick={onClose}>✕</button>
        <h2 className="text-xl font-extrabold mb-4 text-gray-900">{item?._id ? "Edit Item" : "Create Item"}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-700">SKU / Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
          <div>
            <label className="text-sm text-gray-700">Kind</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400">
              <option value="food">Food (grams)</option>
              <option value="drink">Drink (pieces)</option>
              <option value="protein">Protein (pieces)</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700">Unit</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400">
              <option value="gram">Gram</option>
              <option value="piece">Piece</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm text-gray-700">Aliases (comma-separated)</label>
            <input value={aliases} onChange={(e) => setAliases(e.target.value)} className="w-full border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
        </div>

        {err && <div className="mt-3 text-rose-600 text-sm font-semibold">{err}</div>}

        <div className="mt-6 flex justify-between">
          <button onClick={doDelete} className="px-4 py-2 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700">Delete</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white border border-gray-300 text-gray-800 hover:bg-gray-50" disabled={loading}>Cancel</button>
            <button onClick={save} disabled={loading} className={`px-4 py-2 rounded-xl font-semibold text-white shadow ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`}>{loading ? "Saving..." : "Save"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
