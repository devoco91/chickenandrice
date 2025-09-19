// app/inventory/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "../utils/apiBase";

// Always show grams (no kg)
const fmtNum = (n) => Number(n || 0).toLocaleString("en-NG");
const fmtQty = (unit, v) => (unit === "gram" ? `${fmtNum(v)} g` : `${fmtNum(v)} pcs`);

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
    throw new Error(`HTTP ${res.status} ${res.statusText}${snippet ? ` – ${snippet.slice(0, 160)}` : ""}`);
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
    throw new Error(`HTTP ${res.status} ${res.statusText}${snippet ? ` – ${snippet.slice(0, 160)}` : ""}`);
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
    throw new Error(`HTTP ${res.status} ${res.statusText}${snippet ? ` – ${snippet.slice(0, 160)}` : ""}`);
  }
  return tryJson(res);
}
async function del(url) {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const snippet = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${snippet ? ` – ${snippet.slice(0, 160)}` : ""}`);
  }
  return tryJson(res);
}

const safeAbort = (controller) => {
  if (!controller) return;
  try {
    if (!controller.signal.aborted) controller.abort();
  } catch {}
};

// ---- helpers identical to backend rules for badges ----
const norm = (s = "") =>
  String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

const isRice = (name = "") => /friedrice|jollofrice|nativerice/.test(norm(name));
const isMoiMoiOrPlantain = (name = "") => /moimoi|moimo|moi|plantain|dodo/.test(norm(name));
const isLowStock = (row) => {
  if (!row) return false;
  if (row.unit === "gram") {
    // only rice (grams) under 900g
    return isRice(row.sku) && Number(row.remaining || 0) < 900;
  }
  // pieces
  const rem = Number(row.remaining || 0);
  if (row.kind === "drink" || row.kind === "protein") return rem < 3;
  // food pieces: moimoi/plantain under 3 pcs
  if (row.kind === "food" && isMoiMoiOrPlantain(row.sku)) return rem < 3;
  return false;
};

// ---- keep tables unique & filter "extra" rows ----
const uniqBy = (rows = []) => {
  const seen = new Set();
  return rows.filter((r) => {
    const k = `${r?.slug || r?.sku || ""}|${r?.unit || ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};
const isExtra = (name = "") =>
  /extra/.test(String(name).toLowerCase()) && /(jollof|fried)/.test(String(name).toLowerCase());

export default function InventoryPage() {
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [stockEntries, setStockEntries] = useState([]);
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
  const [showRestock, setShowRestock] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editStock, setEditStock] = useState(null);

  const [pollMs, setPollMs] = useState(20000);
  const abortRef = useRef(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setErr("");
      safeAbort(abortRef.current);
      const ac = new AbortController();
      abortRef.current = ac;

      const [s, m, st, it] = await Promise.all([
        getJSON(`${API_BASE}/inventory/summary?ts=${Date.now()}`, ac.signal),
        getJSON(`${API_BASE}/inventory/movements?limit=80&ts=${Date.now()}`, ac.signal).catch(() => ({ items: [] })),
        getJSON(`${API_BASE}/inventory/stock?ts=${Date.now()}`, ac.signal).catch(() => ({ entries: [] })),
        getJSON(`${API_BASE}/inventory/items?ts=${Date.now()}`, ac.signal).catch(() => ({ items: [] })),
      ]);

      setSummary(s || {});
      setMovements(Array.isArray(m?.items) ? m.items : []);
      setStockEntries(Array.isArray(st?.entries) ? st.entries : []);
      setItems(Array.isArray(it?.items) ? it.items : []);
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
    const sumRemain = (rows = []) => rows.reduce((s, r) => s + Number(r?.remaining || 0), 0);

    const foodRows = uniqBy(Array.isArray(summary?.food) ? summary.food : []);
    const drinksRows = uniqBy(Array.isArray(summary?.drinks) ? summary.drinks : []);
    const proteinRows = uniqBy(Array.isArray(summary?.proteins) ? summary.proteins : []);

    const foodFiltered = foodRows.filter((r) => !isExtra(r?.sku));
    return {
      foodRemain: sumRemain(foodFiltered),
      drinkRemain: sumRemain(drinksRows),
      proteinRemain: sumRemain(proteinRows),
    };
  }, [summary]);

  const onItemSaved = async () => {
    setShowAdd(false);
    setEditItem(null);
    await fetchAll();
  };

  const onItemDelete = async (row) => {
    if (!row?._id) return alert("Cannot delete an inferred row. Create it first from the row click.");
    const ok = confirm(`Delete "${row.sku}"? This removes the item and today's stock entries.`);
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
      const kind = row?.unit === "gram" ? "food" : row?.kind || "drink";
      setEditItem({ _id: null, name: row.sku, kind, unit: row.unit });
    } else {
      setEditItem({
        _id: row._id,
        name: row.sku,
        kind: row.kind || (row.unit === "gram" ? "food" : "drink"),
        unit: row.unit,
      });
    }
  };

  const onStockDeleted = async (entry) => {
    if (!entry?._id) return;
    const ok = confirm(`Delete stock entry for "${entry.sku}" (+${entry.qty} ${entry.unit})?`);
    if (!ok) return;
    try {
      await del(`${API_BASE}/inventory/stock/${entry._id}`);
      await fetchAll();
    } catch (e) {
      alert(e.message || "Failed to delete entry.");
    }
  };

  const onStockEdit = (entry) => setEditStock(entry);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/40 to-rose-50/50 p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-600">Today’s prep, restocks, and live usage across all channels.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/inventory/print"
            target="_blank"
            className="px-4 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-slate-700 to-slate-900 shadow hover:opacity-95 active:scale-95 transition"
          >
            Print View
          </a>
          <button
            onClick={() => setShowRestock(true)}
            className="px-4 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-600 to-yellow-600 shadow hover:opacity-95 active:scale-95 transition"
          >
            Add Inventory / Restock
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-green-600 shadow hover:opacity-95 active:scale-95 transition"
          >
            Add Stock Item
          </button>
          <button
            onClick={fetchAll}
            disabled={loading}
            className={`px-4 py-2 rounded-xl font-semibold text-white shadow transition ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="Food Remaining" value={fmtQty("gram", totals.foodRemain)} gradient="from-emerald-500 to-green-600" sub="(grams)" />
        <KpiCard title="Drinks Remaining" value={`${fmtNum(totals.drinkRemain)} pcs`} gradient="from-indigo-500 to-blue-600" />
        <KpiCard title="Proteins Remaining" value={`${fmtNum(totals.proteinRemain)} pcs`} gradient="from-rose-500 to-red-600" />
      </div>

      {/* Error + Last updated */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        {err ? (
          <div className="text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">⚠️ {err}</div>
        ) : (
          <span />
        )}
        <div className="text-sm text-gray-700 flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
            <span>
            Last updated: <strong>{lastUpdated ? lastUpdated.toLocaleString() : "—"}</strong>
          </span>
          <label className="ml-2">Auto-refresh:</label>
          <select
            value={pollMs}
            onChange={(e) => setPollMs(Number(e.target.value))}
            className="border rounded-lg px-2 py-1 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
        {/* Food */}
        <DataCard title="Food">
          <ScrollableTable
            headers={["Item", "Added", "Remaining", "Used"]}
            rows={uniqBy(Array.isArray(summary?.food) ? summary.food : [])}
            empty="No food rows."
            getKey={(r, i) => `${r?.slug || r?.sku || i}-${r?.unit}`}
            render={(r, i) => {
              const low = isLowStock(r);
              return (
                <tr
                  key={`${r?.slug || r?.sku || i}-${r?.unit}`}
                  className={`${i % 2 === 0 ? "bg-gray-50/60" : "bg-white"} hover:bg-amber-50 cursor-pointer transition`}
                  onClick={() => rowClick(r)}
                >
                  <td className="p-3 border-b text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{r?.sku || "-"}</span>
                      {low && <LowBadge />}
                    </div>
                  </td>
                  <td className="p-3 border-b">{isExtra(r?.sku) ? "—" : fmtQty(r.unit, r?.added)}</td>
                  <td className="p-3 border-b font-semibold">{isExtra(r?.sku) ? "—" : fmtQty(r.unit, r?.remaining)}</td>
                  <td className="p-3 border-b">{fmtQty(r.unit, r?.used)}</td>
                </tr>
              );
            }}
          />
        </DataCard>

        {/* Drinks */}
        <DataCard title="Drinks (pieces)">
          <ScrollableTable
            headers={["Item", "Added", "Remaining", "Used"]}
            rows={uniqBy(Array.isArray(summary?.drinks) ? summary.drinks : [])}
            empty="No drinks rows."
            getKey={(r, i) => `${r?.slug || r?.sku || i}-${r?.unit}`}
            render={(r, i) => {
              const low = isLowStock(r);
              return (
                <tr
                  key={`${r?.slug || r?.sku || i}-${r?.unit}`}
                  className={`${i % 2 === 0 ? "bg-gray-50/60" : "bg-white"} hover:bg-amber-50 cursor-pointer transition`}
                  onClick={() => rowClick(r)}
                >
                  <td className="p-3 border-b text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{r?.sku || "-"}</span>
                      {low && <LowBadge />}
                    </div>
                  </td>
                  <td className="p-3 border-b">{fmtQty(r.unit, r?.added)}</td>
                  <td className="p-3 border-b font-semibold">{fmtQty(r.unit, r?.remaining)}</td>
                  <td className="p-3 border-b">{fmtQty(r.unit, r?.used)}</td>
                </tr>
              );
            }}
          />
        </DataCard>

        {/* Proteins */}
        <DataCard title="Proteins (pieces)">
          <ScrollableTable
            headers={["Item", "Added", "Remaining", "Used"]}
            rows={uniqBy(Array.isArray(summary?.proteins) ? summary.proteins : [])}
            empty="No protein rows."
            getKey={(r, i) => `${r?.slug || r?.sku || i}-${r?.unit}`}
            render={(r, i) => {
              const low = isLowStock(r);
              return (
                <tr
                  key={`${r?.slug || r?.sku || i}-${r?.unit}`}
                  className={`${i % 2 === 0 ? "bg-gray-50/60" : "bg-white"} hover:bg-amber-50 cursor-pointer transition`}
                  onClick={() => rowClick(r)}
                >
                  <td className="p-3 border-b text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{r?.sku || "-"}</span>
                      {low && <LowBadge />}
                    </div>
                  </td>
                  <td className="p-3 border-b">{fmtQty(r.unit, r?.added)}</td>
                  <td className="p-3 border-b font-semibold">{fmtQty(r.unit, r?.remaining)}</td>
                  <td className="p-3 border-b">{fmtQty(r.unit, r?.used)}</td>
                </tr>
              );
            }}
          />
        </DataCard>
      </div>

      {/* Recent movements */}
      <div className="mt-8 bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-900">Recent Movements (today + system)</h3>
        </div>
        <div className="overflow-x-auto rounded-xl ring-1 ring-gray-200">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-100/80 text-left sticky top-0">
              <tr>
                <Th>When</Th>
                <Th>Type</Th>
                <Th>SKU</Th>
                <Th>Unit</Th>
                <Th>Note</Th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td className="p-3 border-b text-gray-500" colSpan={5}>
                    No movements yet.
                  </td>
                </tr>
              ) : (
                movements.map((m, i) => (
                  <tr key={m?._id || i} className={i % 2 === 0 ? "bg-gray-50/60" : "bg-white"}>
                    <td className="p-3 border-b">{m?.createdAt ? new Date(m.createdAt).toLocaleString() : "-"}</td>
                    <td className="p-3 border-b">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 capitalize">
                        {m?.type || "-"}
                      </span>
                    </td>
                    <td className="p-3 border-b">{m?.sku || "-"}</td>
                    <td className="p-3 border-b">{m?.unit || "-"}</td>
                    <td className="p-3 border-b">{m?.note || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Today's stock entries */}
      <div className="mt-8 bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-900">Today’s Stock Entries</h3>
          <button
            onClick={() => setShowRestock(true)}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700"
          >
            Add Entry
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl ring-1 ring-gray-200">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-100/80 text-left sticky top-0">
              <tr>
                <Th>When</Th>
                <Th>SKU</Th>
                <Th>Qty</Th>
                <Th>Unit</Th>
                <Th>Note</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {stockEntries.length === 0 ? (
                <tr>
                  <td className="p-3 border-b text-gray-500" colSpan={6}>
                    No entries for today.
                  </td>
                </tr>
              ) : (
                stockEntries.map((e, i) => (
                  <tr key={e?._id || i} className={i % 2 === 0 ? "bg-gray-50/60" : "bg-white"}>
                    <td className="p-3 border-b">{e?.createdAt ? new Date(e.createdAt).toLocaleString() : "-"}</td>
                    <td className="p-3 border-b">{e?.sku || "-"}</td>
                    <td className="p-3 border-b">{fmtNum(e?.qty)}</td>
                    <td className="p-3 border-b">{e?.unit}</td>
                    <td className="p-3 border-b">{e?.note || "-"}</td>
                    <td className="p-3 border-b">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onStockEdit(e)}
                          className="px-3 py-1 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onStockDeleted(e)}
                          className="px-3 py-1 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showRestock && <RestockModal items={items} onClose={() => setShowRestock(false)} onSaved={fetchAll} />}
      {showAdd && <AddItemModal onClose={() => setShowAdd(false)} onSaved={onItemSaved} />}
      {editItem && <EditItemModal item={editItem} onClose={() => setEditItem(null)} onSaved={onItemSaved} onDelete={onItemDelete} />}
      {editStock && <EditStockModal entry={editStock} onClose={() => setEditStock(null)} onSaved={fetchAll} />}
    </div>
  );
}

/** Premium UI bits (presentational only) */
function KpiCard({ title, value, gradient, sub }) {
  return (
    <div className={`bg-gradient-to-br ${gradient} text-white p-5 shadow rounded-2xl relative overflow-hidden`}>
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 bg-white" />
      <h2 className="text-base font-semibold opacity-90">{title}</h2>
      <p className="text-3xl md:text-4xl font-extrabold tracking-tight mt-1">{value}</p>
      {sub ? <p className="text-xs opacity-90 mt-1">{sub}</p> : null}
    </div>
  );
}

function LowBadge() {
  // minimal, attention-grabbing, non-intrusive
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
      ⚠️ Low
    </span>
  );
}

function DataCard({ title, children }) {
  return (
    <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ScrollableTable({ headers, rows, empty, getKey, render }) {
  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-gray-200">
      <table className="min-w-full border-collapse">
        <thead className="bg-gray-100/80 text-left sticky top-0 z-10">
          <tr>
            {headers.map((h) => (
              <Th key={h}>{h}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => render(r, i))
          ) : (
            <tr>
              <td className="p-3 border-b text-gray-500" colSpan={headers.length}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }) {
  return <th className="p-3 border-b text-gray-700 text-sm font-semibold">{children}</th>;
}

/* ===== Modals (behavior unchanged; visuals improved) ===== */

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className="bg-white w-full max-w-xl md:max-w-2xl p-6 rounded-2xl shadow-2xl relative">
        <button className="absolute top-3 right-3 bg-gray-200 text-gray-800 px-3 py-1 rounded-lg hover:bg-gray-300" onClick={onClose}>
          ✕
        </button>
        <h2 className="text-xl font-extrabold mb-4 text-gray-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Button({ children, onClick, disabled, loading, variant, gradient = "from-gray-800 to-gray-900", danger }) {
  if (danger) variant = "danger";
  const clsBase = "px-4 py-2 rounded-xl font-semibold shadow transition disabled:opacity-60 disabled:cursor-not-allowed";
  const cls =
    variant === "ghost"
      ? `${clsBase} bg-white border border-gray-300 text-gray-800 hover:bg-gray-50`
      : variant === "danger"
      ? `${clsBase} text-white bg-red-600 hover:bg-red-700`
      : `${clsBase} text-white bg-gradient-to-r ${gradient} hover:opacity-95 active:scale-95`;
  return (
    <button onClick={onClick} disabled={disabled || loading} className={cls}>
      {children}
    </button>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-sm text-gray-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400"
        placeholder={placeholder}
      />
    </div>
  );
}

function NumberInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-sm text-gray-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="number"
        min="0"
        className="w-full border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400"
        placeholder={placeholder}
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-sm text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function RestockModal({ items, onClose, onSaved }) {
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = items.find((i) => i._id === itemId);
  const unit = selected?.unit || "piece";

  const submit = async () => {
    setErr("");
    if (!itemId) return setErr("Select an item.");
    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) return setErr("Enter a positive quantity.");
    try {
      setLoading(true);
      const body = { itemId, qty: n, note: note.trim(), sku: selected?.name, slug: selected?.slug };
      const r = await postJSON(`${API_BASE}/inventory/stock`, body);
      if (r?.error) throw new Error(r.error);
      onSaved?.();
      onClose?.();
    } catch (e) {
      setErr(e?.message || "Failed to add entry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Add Inventory / Restock" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="text-sm text-gray-700">Item</label>
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">— Select —</option>
            {items.map((it) => (
              <option key={it._id} value={it._id}>
                {it.name} {it.unit === "gram" ? "(g)" : "(pcs)"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-700">
            Quantity to add {selected ? (unit === "gram" ? "(grams)" : "(pieces)") : ""}
          </label>
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            type="number"
            min="0"
            className="w-full border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-amber-400"
            placeholder={unit === "gram" ? "e.g. 1000 (grams)" : "e.g. 24 (pcs)"}
          />
        </div>
        <div>
          <label className="text-sm text-gray-700">Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="Morning prep, 2pm restock, etc."
          />
        </div>
      </div>

      {err && <div className="mt-3 text-rose-600 text-sm font-semibold">{err}</div>}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={submit} gradient="from-amber-600 to-amber-700" disabled={loading}>
          {loading ? "Saving..." : "Add Entry"}
        </Button>
      </div>
    </ModalShell>
  );
}

function AddItemModal({ onClose, onSaved }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("food");
  const [unit, setUnit] = useState("gram");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const normKey = (s) => String(s || "").toLowerCase().replace(/[\s\-_]/g, "");

  const resolveItemOnServer = async (typed) => {
    const deadline = Date.now() + 5000;
    let attempt = 0;
    while (Date.now() < deadline) {
      try {
        const it = await getJSON(`${API_BASE}/inventory/items?ts=${Date.now()}`);
        const list = Array.isArray(it?.items) ? it.items : [];
        const found =
          list.find((x) => normKey(x?.name) === normKey(typed)) ||
          list.find((x) => normKey(x?.sku) === normKey(typed)) ||
          list.find((x) => (Array.isArray(x?.aliases) ? x.aliases : []).some((a) => normKey(a) === normKey(typed)));
        if (found?._id) return found;
      } catch {}
      attempt += 1;
      await sleep(Math.min(150 + attempt * 150, 600));
    }
    return null;
  };

  const submit = async () => {
    setErr("");
    const typed = String(name || "").trim();
    if (!typed) return setErr("Enter the item name/SKU.");

    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) {
      return setErr(`Enter a positive ${unit === "gram" ? "grams" : "pieces"} quantity.`);
    }

    let lastServerMessage = "";

    try {
      await postJSON(`${API_BASE}/inventory/items`, { sku: typed, kind, unit });
    } catch (e) {
      const msg = String(e?.message || "");
      if (!/HTTP\s+409/.test(msg) && !/already exists/i.test(msg)) {
        setErr(msg);
        return;
      }
    }

    let itemObj = await resolveItemOnServer(typed);

    const tryAddStock = async (payloads) => {
      for (const body of payloads) {
        try {
          const r = await postJSON(`${API_BASE}/inventory/stock`, body);
          return { ok: true, r };
        } catch (e) {
          const msg = String(e?.message || "");
          lastServerMessage = msg;
          if (!/HTTP\s+404/.test(msg)) throw e;
        }
      }
      return { ok: false };
    };

    try {
      setLoading(true);
      if (!itemObj) itemObj = await resolveItemOnServer(typed);

      const candidates = [];
      if (itemObj?._id) {
        candidates.push({
          itemId: itemObj._id,
          qty: n,
          note: note?.trim() || "Initial stock",
          sku: itemObj.name,
          slug: itemObj.slug,
        });
      }
      if (itemObj?.slug) {
        candidates.push({ slug: itemObj.slug, qty: n, note: note?.trim() || "Initial stock" });
      }
      candidates.push({ sku: typed, qty: n, note: note?.trim() || "Initial stock" });

      const attempt = await tryAddStock(candidates);
      if (!attempt.ok) {
        setErr(lastServerMessage ? `Could not add stock. Server said: ${lastServerMessage}` : "Could not add stock. Please refresh and try again.");
        return;
      }

      onSaved?.();
      onClose?.();
    } catch (e) {
      setErr(e?.message || "Failed to add item.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Add Stock Item" onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="SKU / Name" value={name} onChange={setName} placeholder="e.g. Fried Rice" />
        <Select
          label="Kind"
          value={kind}
          onChange={setKind}
          options={[
            { value: "food", label: "Food (grams or pcs)" },
            { value: "drink", label: "Drink (pieces)" },
            { value: "protein", label: "Protein (pieces)" },
          ]}
        />
        <Select label="Unit" value={unit} onChange={setUnit} options={[{ value: "gram", label: "Gram" }, { value: "piece", label: "Piece" }]} />
        <NumberInput label="Initial Quantity" value={qty} onChange={setQty} placeholder={unit === "gram" ? "e.g. 5000 (grams)" : "e.g. 24 (pcs)"} />
        <div className="sm:col-span-2">
          <Input label="Note (optional)" value={note} onChange={setNote} placeholder="Morning prep, restock at 2pm, etc." />
        </div>
      </div>

      {err && <div className="mt-3 text-rose-600 text-sm font-semibold">{err}</div>}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={submit} gradient="from-emerald-600 to-emerald-700" disabled={loading}>
          {loading ? "Saving..." : "Save Item"}
        </Button>
      </div>
    </ModalShell>
  );
}

function EditItemModal({ item, onClose, onSaved, onDelete }) {
  const [name, setName] = useState(item?.name ?? item?.sku ?? "");
  const [kind, setKind] = useState(item?.kind || (item?.unit === "gram" ? "food" : "drink"));
  const [unit, setUnit] = useState(item?.unit || "gram");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setErr("");
    const body = { name: String(name || "").trim(), kind, unit };
    try {
      setLoading(true);
      if (item?._id) await patchJSON(`${API_BASE}/inventory/items/${item._id}`, body);
      else await postJSON(`${API_BASE}/inventory/items`, { sku: body.name, kind, unit });
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
    <ModalShell title={item?._id ? "Edit Item" : "Create Item"} onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="SKU / Name" value={name} onChange={setName} />
        <Select
          label="Kind"
          value={kind}
          onChange={setKind}
          options={[
            { value: "food", label: "Food" },
            { value: "drink", label: "Drink" },
            { value: "protein", label: "Protein" },
          ]}
        />
        <Select label="Unit" value={unit} onChange={setUnit} options={[{ value: "gram", label: "Gram" }, { value: "piece", label: "Piece" }]} />
      </div>

      {err && <div className="mt-3 text-rose-600 text-sm font-semibold">{err}</div>}

      <div className="mt-6 flex justify-between">
        <Button danger onClick={doDelete}>
          Delete
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={save} gradient="from-emerald-600 to-emerald-700" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function EditStockModal({ entry, onClose, onSaved }) {
  const [qty, setQty] = useState(entry?.qty ?? 0);
  const [note, setNote] = useState(entry?.note ?? "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setErr("");
    const n = Number(qty);
    if (!Number.isFinite(n) || n < 0) return setErr("Enter a valid quantity.");
    try {
      setLoading(true);
      await patchJSON(`${API_BASE}/inventory/stock/${entry._id}`, { qty: n, note });
      onSaved?.();
      onClose?.();
    } catch (e) {
      setErr(e?.message || "Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Edit Stock Entry" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="text-sm text-gray-700">Item</label>
          <input value={`${entry?.sku || ""} (${entry?.unit || ""})`} disabled className="w-full border rounded-xl px-3 py-2 bg-gray-100" />
        </div>
        <NumberInput label="Quantity" value={qty} onChange={setQty} />
        <Input label="Note" value={note} onChange={setNote} />
      </div>

      {err && <div className="mt-3 text-rose-600 text-sm font-semibold">{err}</div>}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={save} gradient="from-indigo-600 to-indigo-700" disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </ModalShell>
  );
}
