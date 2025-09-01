"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showSummary, setShowSummary] = useState(false);

  const [weeklyOnlineTotal, setWeeklyOnlineTotal] = useState(0);
  const [weeklyShopTotal, setWeeklyShopTotal] = useState(0);
  const [weeklyCombinedTotal, setWeeklyCombinedTotal] = useState(0);

  const [dailyOnlineTotal, setDailyOnlineTotal] = useState(0);
  const [dailyShopTotal, setDailyShopTotal] = useState(0);
  const [dailyCombinedTotal, setDailyCombinedTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const pageSize = 10;

  const money = (n) =>
    `₦${Number(n || 0).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const safeDate = (d) => {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const fmtDate = (d) => {
    const dt = safeDate(d);
    return dt
      ? dt.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })
      : "-";
  };

  const fmtTime = (d) => {
    const dt = safeDate(d);
    return dt
      ? dt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })
      : "-";
  };

  // Fetch (with abort + mounted guard)
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // cancel any in-flight request
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const res = await fetch("/api/orders", { signal: ac.signal, cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      if (!mountedRef.current) return;

      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error(err);
        alert("Failed to load orders.");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    fetchOrders();
    const interval = setInterval(fetchOrders, 60000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOrders = useMemo(() => {
    const list =
      filter === "all" ? orders : orders.filter((o) => (o?.orderType || "").toLowerCase() === filter);
    // sort newest first; fall back to id string compare if createdAt missing
    return [...list].sort((a, b) => {
      const ad = safeDate(a?.createdAt)?.getTime() ?? 0;
      const bd = safeDate(b?.createdAt)?.getTime() ?? 0;
      if (bd !== ad) return bd - ad;
      const aid = String(a?._id || "");
      const bid = String(b?._id || "");
      return bid.localeCompare(aid);
    });
  }, [orders, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));

  // Clamp page when data/filter changes so we never show an empty page
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page]);

  const totalOrders = orders.length;
  const totalAmount = orders.reduce((sum, o) => sum + Number(o?.total || 0), 0);
  const onlineOrders = orders.filter((o) => (o?.orderType || "").toLowerCase() === "online").length;
  const shopOrders = orders.filter((o) => (o?.orderType || "").toLowerCase() === "instore").length;

  const startOfToday = useMemo(() => {
    const n = new Date();
    n.setHours(0, 0, 0, 0);
    return n;
  }, []);

  const startOfWeek = useMemo(() => {
    const n = new Date();
    const s = new Date(n);
    s.setDate(n.getDate() - n.getDay()); // week starts Sunday; adjust if you prefer Monday
    s.setHours(0, 0, 0, 0);
    return s;
  }, []);

  useEffect(() => {
    let online = 0;
    let instore = 0;
    for (const o of orders) {
      const d = safeDate(o?.createdAt);
      if (d && d >= startOfWeek) {
        const t = Number(o?.total || 0);
        const type = (o?.orderType || "").toLowerCase();
        if (type === "online") online += t;
        if (type === "instore") instore += t;
      }
    }
    setWeeklyOnlineTotal(online);
    setWeeklyShopTotal(instore);
    setWeeklyCombinedTotal(online + instore);
  }, [orders, startOfWeek]);

  useEffect(() => {
    let online = 0;
    let instore = 0;
    for (const o of orders) {
      const d = safeDate(o?.createdAt);
      if (d && d >= startOfToday) {
        const t = Number(o?.total || 0);
        const type = (o?.orderType || "").toLowerCase();
        if (type === "online") online += t;
        if (type === "instore") instore += t;
      }
    }
    setDailyOnlineTotal(online);
    setDailyShopTotal(instore);
    setDailyCombinedTotal(online + instore);
  }, [orders, startOfToday]);

  const { cashToday, cardToday, transferToday } = useMemo(() => {
    let cash = 0,
      card = 0,
      transfer = 0;
    for (const o of orders) {
      const d = safeDate(o?.createdAt);
      if (d && d >= startOfToday) {
        const pm = String(o?.paymentMode || "").toLowerCase();
        const t = Number(o?.total || 0);
        if (pm === "cash") cash += t;
        else if (pm === "card") card += t;
        else if (pm === "upi" || pm === "transfer") transfer += t;
      }
    }
    return { cashToday: cash, cardToday: card, transferToday: transfer };
  }, [orders, startOfToday]);

  const removeOrder = async (id) => {
    if (!id) return;
    const ok = confirm("Remove this order? This cannot be undone.");
    if (!ok) return;
    try {
      setRemoving(true);
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || `Failed to remove order (status ${res.status})`);
      }
      setOrders((prev) => prev.filter((o) => String(o?._id) !== String(id)));
      setSelectedOrder(null);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to remove order.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 p-6 md:p-10">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
          Admin Dashboard
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSummary(true)}
            className="px-4 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow hover:opacity-95 active:scale-95 transition"
          >
            View Today’s Summary
          </button>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className={`px-4 py-2 rounded-xl font-semibold text-white shadow transition ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {loading ? "Refreshing..." : "Refresh Totals"}
          </button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 shadow rounded-2xl">
          <h2 className="text-lg font-bold opacity-90">Total Orders</h2>
          <p className="text-2xl font-extrabold">{totalOrders}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white p-4 shadow rounded-2xl">
          <h2 className="text-lg font-bold opacity-90">Total Amount</h2>
          <p className="text-2xl font-extrabold">{money(totalAmount)}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white p-4 shadow rounded-2xl">
          <h2 className="text-lg font-bold opacity-90">Online Orders</h2>
          <p className="text-2xl font-extrabold">{onlineOrders}</p>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-red-600 text-white p-4 shadow rounded-2xl">
          <h2 className="text-lg font-bold opacity-90">Shop Orders</h2>
          <p className="text-2xl font-extrabold">{shopOrders}</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 shadow rounded-2xl">
          <h2 className="text-lg font-bold opacity-90">Today (All)</h2>
          <p className="text-2xl font-extrabold">{money(dailyCombinedTotal)}</p>
        </div>
      </div>

      {/* Daily totals */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="px-4 py-3 bg-indigo-500 text-white rounded-2xl shadow">
          Today Online: <span className="font-bold">{money(dailyOnlineTotal)}</span>
        </div>
        <div className="px-4 py-3 bg-teal-500 text-white rounded-2xl shadow">
          Today Shop: <span className="font-bold">{money(dailyShopTotal)}</span>
        </div>
        <div className="px-4 py-3 bg-pink-600 text-white rounded-2xl shadow">
          Today Combined: <span className="font-bold">{money(dailyCombinedTotal)}</span>
        </div>
      </div>

      {/* Weekly totals */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="px-4 py-3 bg-orange-500 text-white rounded-2xl shadow">
          Weekly Online: <span className="font-bold">{money(weeklyOnlineTotal)}</span>
        </div>
        <div className="px-4 py-3 bg-red-500 text-white rounded-2xl shadow">
          Weekly Shop: <span className="font-bold">{money(weeklyShopTotal)}</span>
        </div>
        <div className="px-4 py-3 bg-blue-600 text-white rounded-2xl shadow">
          Weekly Combined: <span className="font-bold">{money(weeklyCombinedTotal)}</span>
        </div>
      </div>

      {/* Quick Summary Buttons */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button className="px-4 py-3 rounded-2xl bg-emerald-600 text-white font-semibold shadow">
          💵 Cash Today: {money(cashToday)}
        </button>
        <button className="px-4 py-3 rounded-2xl bg-indigo-600 text-white font-semibold shadow">
          💳 Card Today: {money(cardToday)}
        </button>
        <button className="px-4 py-3 rounded-2xl bg-amber-600 text-white font-semibold shadow">
          🔄 Transfer Today: {money(transferToday)}
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-8">
        <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
          className="border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400"
        >
          <option value="all">All Orders</option>
          <option value="online">Online Orders</option>
          <option value="instore">Shop Orders</option>
        </select>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto bg-white/90 backdrop-blur border border-gray-200 shadow rounded-2xl">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3 border-b">Order ID</th>
              <th className="p-3 border-b">Order Name</th>
              <th className="p-3 border-b">Price</th>
              <th className="p-3 border-b">Order Type</th>
              <th className="p-3 border-b">Mode of Payment</th>
              <th className="p-3 border-b">Customer Name</th>
              <th className="p-3 border-b">Address</th>
              <th className="p-3 border-b">Date</th>
              <th className="p-3 border-b">Time</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order, idx) => {
              const items = Array.isArray(order?.items) ? order.items : [];
              const firstName = items[0]?.name || "No items";
              const extra = items.length > 1 ? ` +${items.length - 1} more` : "";
              const orderName = firstName + extra;

              const type = (order?.orderType || "").toLowerCase();
              const address =
                type === "online"
                  ? `${order?.houseNumber || ""} ${order?.street || ""} ${order?.landmark || ""}`.trim()
                  : "In-store";

              const pm = (order?.paymentMode || "").toLowerCase();
              const badge =
                pm === "cash"
                  ? "bg-emerald-100 text-emerald-700"
                  : pm === "card"
                  ? "bg-indigo-100 text-indigo-700"
                  : pm === "upi"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-gray-100 text-gray-600";

              return (
                <tr
                  key={order?._id || `${idx}`}
                  className={`cursor-pointer ${idx % 2 === 0 ? "bg-gray-50/60" : "bg-white"} hover:bg-gray-100`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <td className="p-3 border-b">{order?._id || "-"}</td>
                  <td className="p-3 border-b">{orderName}</td>
                  <td className="p-3 border-b">{money(order?.total)}</td>
                  <td className="p-3 border-b capitalize">{type || "-"}</td>
                  <td className="p-3 border-b">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${badge}`}>
                      {pm === "upi" ? "transfer" : order?.paymentMode || "--"}
                    </span>
                  </td>
                  <td className="p-3 border-b">{order?.customerName || "-"}</td>
                  <td className="p-3 border-b">{address || "-"}</td>
                  <td className="p-3 border-b">{fmtDate(order?.createdAt)}</td>
                  <td className="p-3 border-b">{fmtTime(order?.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
        <button
          className="px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50"
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
        >
          Prev
        </button>
        <span className="font-semibold">Page {page} of {totalPages}</span>
        <button
          className="px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50"
          disabled={page === totalPages || totalPages === 0}
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
        >
          Next
        </button>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-11/12 md:w-2/3 lg:w-1/2 p-6 rounded-2xl shadow-xl relative">
            <button
              className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-lg shadow hover:bg-red-700"
              onClick={() => setSelectedOrder(null)}
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-4">Order Details ({selectedOrder?._id || "-"})</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <p><strong>Customer:</strong> {selectedOrder?.customerName || "-"}</p>
              <p><strong>Phone:</strong> {selectedOrder?.phone || "-"}</p>
              <p>
                <strong>Address:</strong>{" "}
                {(selectedOrder?.orderType || "").toLowerCase() === "online"
                  ? `${selectedOrder?.houseNumber || ""} ${selectedOrder?.street || ""} ${selectedOrder?.landmark || ""}`.trim()
                  : "In-store"}
              </p>
              <p className="capitalize"><strong>Type:</strong> {(selectedOrder?.orderType || "-").toLowerCase()}</p>
              <p>
                <strong>Payment:</strong>{" "}
                {(String(selectedOrder?.paymentMode || "").toLowerCase() === "upi"
                  ? "transfer"
                  : selectedOrder?.paymentMode) || "--"}
              </p>
              <p><strong>Total:</strong> {money(selectedOrder?.total)}</p>
              <p><strong>Date:</strong> {fmtDate(selectedOrder?.createdAt)}</p>
              <p><strong>Time:</strong> {fmtTime(selectedOrder?.createdAt)}</p>
            </div>

            <h3 className="mt-4 font-bold">Items</h3>
            <ul className="list-disc list-inside text-sm">
              {(Array.isArray(selectedOrder?.items) ? selectedOrder.items : []).map((item, i) => (
                <li key={i}>
                  {item?.name || "Item"} — {Number(item?.quantity || 0)} × {money(item?.price)}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => removeOrder(selectedOrder?._id)}
                disabled={removing}
                className="px-4 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-rose-600 to-red-600 shadow hover:opacity-95 active:scale-95 disabled:opacity-50 transition"
              >
                {removing ? "Removing..." : "Remove Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-11/12 md:w-[520px] p-6 rounded-2xl shadow-xl relative">
            <button
              className="absolute top-3 right-3 bg-gray-200 text-gray-800 px-3 py-1 rounded-lg hover:bg-gray-300"
              onClick={() => setShowSummary(false)}
            >
              ✕
            </button>

            <h2 className="text-xl font-extrabold mb-1 text-gray-900">Today’s Summary</h2>
            <p className="text-xs text-gray-500 mb-4">
              Totals reset at <strong>12:00 AM</strong> automatically (based on order timestamps).
            </p>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between rounded-xl border p-3 bg-emerald-50">
                <span className="font-semibold">Cash Total</span>
                <span className="text-emerald-700 font-extrabold">{money(cashToday)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3 bg-indigo-50">
                <span className="font-semibold">Card Total</span>
                <span className="text-indigo-700 font-extrabold">{money(cardToday)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3 bg-amber-50">
                <span className="font-semibold">Transfer Total</span>
                <span className="text-amber-700 font-extrabold">{money(transferToday)}</span>
              </div>
              <div className="mt-2 text-right text-sm text-gray-600">
                Combined: <span className="font-bold">{money(cashToday + cardToday + transferToday)}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSummary(false)}
                className="px-4 py-2 rounded-xl bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 active:scale-95 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
