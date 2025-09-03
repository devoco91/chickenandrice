
"use client";

import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { API_BASE } from "../utils/apiBase";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Date range filter (affects Orders list only)
  const [dateFrom, setDateFrom] = useState(""); // YYYY-MM-DD
  const [dateTo, setDateTo] = useState(""); // YYYY-MM-DD

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
  const PACK_PRICE = 200;

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

  const isDrinkItem = (it) => {
    if (!it) return false;
    if (it.isDrink === true) return true;
    const name = String(it?.name || "").toLowerCase();
    const cat = String(it?.category || "").toLowerCase();
    const drinkName = /(drink|juice|smoothie|water|coke|cola|fanta|sprite|malt|soda|pepsi|mirinda|chapman|zobo|beer)\b/;
    const drinkCat = /(drink|beverage|juice|smoothie|water|soda|soft|beverages)\b/;
    return drinkName.test(name) || drinkCat.test(cat);
  };

  const isPackagingItem = (it) => {
    const name = String(it?.name || "").toLowerCase().trim();
    return /\b(pack|packs|packaging|container|take\s*away|takeaway|bag)\b/.test(name);
  };

  // FIX: Only count packaging items that actually exist in the order.
  const computePackCount = (order) => {
    const items = Array.isArray(order?.items) ? order.items : [];
    let count = 0;
    for (const it of items) {
      if (!isPackagingItem(it)) continue;
      const qty = Number(it?.quantity ?? 0) || 0;
      count += qty;
    }
    return count;
  };

  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  // Fetch – unchanged from your working version
  const fetchOrders = async () => {
    try {
      setLoading(true);
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const url = `${API_BASE}/orders?ts=${Date.now()}`;
      const res = await fetch(url, {
        signal: ac.signal,
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const snippet = await res.text().catch(() => "");
        throw new Error(
          `HTTP ${res.status} ${res.statusText}${snippet ? ` – ${snippet.slice(0, 140)}` : ""}`
        );
      }

      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (!ct.includes("application/json")) {
        const snippet = await res.text().catch(() => "");
        throw new Error(`Expected JSON, got ${ct || "unknown"} – ${snippet.slice(0, 140)}`);
      }

      const data = await res.json();
      if (!mountedRef.current) return;

      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("fetchOrders failed:", err);
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

  // Helpers for range filter (orders table only)
  const startOfDay = (d) => {
    const dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  };
  const endOfDay = (d) => {
    const dt = new Date(d);
    dt.setHours(23, 59, 59, 999);
    return dt;
  };

  // Type + date range filter (orders list only)
  const filteredOrders = useMemo(() => {
    let list =
      filter === "all" ? orders : orders.filter((o) => (o?.orderType || "").toLowerCase() === filter);

    if (dateFrom) {
      const from = startOfDay(new Date(dateFrom));
      list = list.filter((o) => {
        const d = safeDate(o?.createdAt);
        return d && d >= from;
      });
    }
    if (dateTo) {
      const to = endOfDay(new Date(dateTo));
      list = list.filter((o) => {
        const d = safeDate(o?.createdAt);
        return d && d <= to;
      });
    }

    return [...list].sort((a, b) => {
      const ad = safeDate(a?.createdAt)?.getTime() ?? 0;
      const bd = safeDate(b?.createdAt)?.getTime() ?? 0;
      if (bd !== ad) return bd - ad;
      const aid = String(a?._id || "");
      const bid = String(b?._id || "");
      return bid.localeCompare(aid);
    });
  }, [orders, filter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page]);

  // KPIs (unchanged – full dataset)
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
    s.setDate(n.getDate() - n.getDay()); // Sunday start
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

  // Items sold today – uses real items only; no synthetic packs.
  const itemTotalsToday = useMemo(() => {
    const all = new Map();
    const online = new Map();
    const instore = new Map();
    const display = new Map();

    for (const o of orders) {
      const d = safeDate(o?.createdAt);
      if (!d || d < startOfToday) continue;
      const type = (o?.orderType || "").toLowerCase();
      const items = Array.isArray(o?.items) ? o.items : [];

      for (const it of items) {
        const raw = String(it?.name || "Item").trim();
        if (!raw) continue;
        const key = raw.toLowerCase();
        if (!display.has(key)) display.set(key, raw);
        const qty = Number(it?.quantity ?? 1) || 1;
        all.set(key, (all.get(key) || 0) + qty);
        if (type === "online") online.set(key, (online.get(key) || 0) + qty);
        if (type === "instore") instore.set(key, (instore.get(key) || 0) + qty);
      }
      // NOTE: removed synthetic Pack injection; counts only if item exists.
    }

    const rows = Array.from(all.keys()).map((k) => ({
      key: k,
      name: display.get(k) || k,
      total: all.get(k) || 0,
      online: online.get(k) || 0,
      instore: instore.get(k) || 0,
    }));

    rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    return rows;
  }, [orders, startOfToday]);

  const removeOrder = async (id) => {
    if (!id) return;
    const ok = confirm("Remove this order? This cannot be undone.");
    if (!ok) return;
    try {
      setRemoving(true);
      const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}`, { method: "DELETE" });
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

  // ======== CHART DATA (unchanged logic; derived from full orders dataset) ========
  const pad2 = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const ym = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  const startOfWeekLikeApp = (d) => {
    const n = new Date(d);
    const s = new Date(n);
    s.setDate(n.getDate() - n.getDay()); // Sunday
    s.setHours(0, 0, 0, 0);
    return s;
  };
  const labelWeek = (d) => {
    const dt = startOfWeekLikeApp(d);
    return dt.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
  };
  const labelMonth = (d) =>
    new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("en-NG", {
      month: "short",
      year: "2-digit",
    });

  const dailySeries = useMemo(() => {
    const days = [];
    const today = startOfDay(new Date());
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d);
    }
    const map = new Map(
      days.map((d) => [
        ymd(d),
        {
          date: ymd(d),
          label: d.toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
          online: 0,
          instore: 0,
          total: 0,
        },
      ])
    );

    for (const o of orders) {
      const d = safeDate(o?.createdAt);
      if (!d) continue;
      const key = ymd(d);
      if (!map.has(key)) continue; // ignore out of window
      const t = Number(o?.total || 0);
      const type = (o?.orderType || "").toLowerCase();
      const row = map.get(key);
      if (type === "online") row.online += t;
      if (type === "instore") row.instore += t;
      row.total += t;
    }
    return Array.from(map.values());
  }, [orders]);

  const weeklySeries = useMemo(() => {
    const weeks = [];
    const start = startOfWeekLikeApp(new Date());
    for (let i = 11; i >= 0; i--) {
      const d = new Date(start);
      d.setDate(start.getDate() - i * 7);
      weeks.push(d);
    }
    const map = new Map(
      weeks.map((d) => [ymd(d), { date: ymd(d), label: labelWeek(d), online: 0, instore: 0, total: 0 }])
    );
    for (const o of orders) {
      const d = safeDate(o?.createdAt);
      if (!d) continue;
      const wk = startOfWeekLikeApp(d);
      const key = ymd(wk);
      if (!map.has(key)) continue;
      const t = Number(o?.total || 0);
      const type = (o?.orderType || "").toLowerCase();
      const row = map.get(key);
      if (type === "online") row.online += t;
      if (type === "instore") row.instore += t;
      row.total += t;
    }
    return Array.from(map.values());
  }, [orders]);

  const monthlySeries = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      d.setMonth(d.getMonth() - i);
      months.push(d);
    }
    const map = new Map(
      months.map((d) => [ym(d), { date: ym(d), label: labelMonth(d), online: 0, instore: 0, total: 0 }])
    );
    for (const o of orders) {
      const d = safeDate(o?.createdAt);
      if (!d) continue;
      const key = ym(d);
      if (!map.has(key)) continue;
      const t = Number(o?.total || 0);
      const type = (o?.orderType || "").toLowerCase();
      const row = map.get(key);
      if (type === "online") row.online += t;
      if (type === "instore") row.instore += t;
      row.total += t;
    }
    return Array.from(map.values());
  }, [orders]);

  const todayPieData = useMemo(
    () => [
      { name: "Online", value: dailyOnlineTotal },
      { name: "Shop", value: dailyShopTotal },
    ],
    [dailyOnlineTotal, dailyShopTotal]
  );

  // ======== EXPORTS (CSV / PDF) – respects current filters; no pagination) ========
  const ordersForExport = filteredOrders;
  const csvEscape = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const exportCSV = () => {
    const headers = [
      "Order ID",
      "Order Name",
      "Price",
      "Order Type",
      "Mode of Payment",
      "Customer Name",
      "Address",
      "Date",
      "Time",
    ];
    const lines = [headers.join(",")];
    for (const order of ordersForExport) {
      const items = Array.isArray(order?.items) ? order.items : [];
      const firstName = items[0]?.name || "No items";
      const extra = items.length > 1 ? ` +${items.length - 1} more` : "";
      const orderName = firstName + extra;
      const type = (order?.orderType || "").toLowerCase();
      const address =
        type === "online"
          ? `${order?.houseNumber || ""} ${order?.street || ""} ${order?.landmark || ""}`.trim()
          : "In-store";
      const row = [
        csvEscape(order?._id || "-"),
        csvEscape(orderName),
        csvEscape(money(order?.total)),
        csvEscape(type || "-"),
        csvEscape(
          String(order?.paymentMode || "--").toLowerCase() === "upi" ? "transfer" : order?.paymentMode || "--"
        ),
        csvEscape(order?.customerName || "-"),
        csvEscape(address || "-"),
        csvEscape(fmtDate(order?.createdAt)),
        csvEscape(fmtTime(order?.createdAt)),
      ];
      lines.push(row.join(","));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const exportPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return alert("Popup blocked. Allow popups to export PDF.");
    const rowsHtml = ordersForExport
      .map((order) => {
        const items = Array.isArray(order?.items) ? order.items : [];
        const firstName = items[0]?.name || "No items";
        const extra = items.length > 1 ? ` +${items.length - 1} more` : "";
        const orderName = firstName + extra;
        const type = (order?.orderType || "").toLowerCase();
        const address =
          type === "online"
            ? `${order?.houseNumber || ""} ${order?.street || ""} ${order?.landmark || ""}`.trim()
            : "In-store";
        return `<tr>
          <td>${order?._id || "-"}</td>
          <td>${orderName}</td>
          <td>${money(order?.total)}</td>
          <td>${type || "-"}</td>
          <td>${(String(order?.paymentMode || "").toLowerCase() === "upi" ? "transfer" : order?.paymentMode) || "--"}</td>
          <td>${order?.customerName || "-"}</td>
          <td>${address || "-"}</td>
          <td>${fmtDate(order?.createdAt)}</td>
          <td>${fmtTime(order?.createdAt)}</td>
        </tr>`;
      })
      .join("");
    w.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Orders Export</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px; }
    h1 { margin: 0 0 12px; }
    .meta { color: #555; font-size: 12px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; }
    th { background: #f5f5f5; text-align: left; }
    tr:nth-child(even) td { background: #fcfcfc; }
  </style>
</head>
<body>
  <h1>Orders Export</h1>
  <div class="meta">Generated: ${new Date().toLocaleString()} • Rows: ${ordersForExport.length}</div>
  <table>
    <thead>
      <tr>
        <th>Order ID</th>
        <th>Order Name</th>
        <th>Price</th>
        <th>Order Type</th>
        <th>Mode of Payment</th>
        <th>Customer Name</th>
        <th>Address</th>
        <th>Date</th>
        <th>Time</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  <script>
    window.onload = () => setTimeout(() => { window.print(); }, 300);
  </script>
</body>
</html>`);
    w.document.close();
  };

    return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 p-6 md:p-10">
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

      {/* KPIs */}
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

      {/* Today splits */}
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

      {/* Weekly splits */}
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

      {/* Payment mode quick view */}
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

      {/* CHARTS SECTION */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow p-4">
          <h3 className="font-bold mb-2">Today’s Sales Split</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip formatter={(v) => money(v)} />
                <Legend />
                <Pie dataKey="value" nameKey="name" data={todayPieData} outerRadius={100} label />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow p-4 lg:col-span-2">
          <h3 className="font-bold mb-2">Daily Sales (last 14 days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySeries} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => money(v)} />
                <Legend />
                <Line type="monotone" dataKey="total" strokeWidth={2} />
                <Line type="monotone" dataKey="online" strokeWidth={2} />
                <Line type="monotone" dataKey="instore" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow p-4 lg:col-span-3">
          <h3 className="font-bold mb-2">Weekly Sales (last 12 weeks)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklySeries} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => money(v)} />
                <Legend />
                <Line type="monotone" dataKey="total" strokeWidth={2} />
                <Line type="monotone" dataKey="online" strokeWidth={2} />
                <Line type="monotone" dataKey="instore" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow p-4 lg:col-span-3">
          <h3 className="font-bold mb-2">Monthly Sales (last 12 months)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySeries} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => money(v)} />
                <Legend />
                <Line type="monotone" dataKey="total" strokeWidth={2} />
                <Line type="monotone" dataKey="online" strokeWidth={2} />
                <Line type="monotone" dataKey="instore" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Items sold today */}
      <div className="mt-6 overflow-x-auto bg-white/90 backdrop-blur border border-gray-200 shadow rounded-2xl">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3 border-b">Item</th>
              <th className="p-3 border-b">Shop</th>
              <th className="p-3 border-b">Online</th>
              <th className="p-3 border-b">Total</th>
            </tr>
          </thead>
          <tbody>
            {itemTotalsToday.length === 0 ? (
              <tr>
                <td className="p-3 border-b text-gray-500" colSpan={4}>No items sold today yet.</td>
              </tr>
            ) : (
              itemTotalsToday.map((row) => (
                <tr key={row.key} className="odd:bg-gray-50/60">
                  <td className="p-3 border-b">{row.name}</td>
                  <td className="p-3 border-b">{row.instore}</td>
                  <td className="p-3 border-b">{row.online}</td>
                  <td className="p-3 border-b">{row.total}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Orders header + filters + export */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mt-8">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
          <p className="text-sm text-gray-500">Type & date filters affect only the Orders list.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            className="border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="all">All Orders</option>
            <option value="online">Online Orders</option>
            <option value="instore">Shop Orders</option>
          </select>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-semibold shadow hover:opacity-95">Export CSV</button>
            <button onClick={exportPDF} className="px-3 py-2 rounded-xl bg-indigo-600 text-white font-semibold shadow hover:opacity-95">Export PDF</button>
          </div>
        </div>
      </div>


      {/* Orders table */}
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

              const isOpen = selectedOrder && String(selectedOrder?._id) === String(order?._id);

              // FIX now reflects only actual pack items present:
              const packQty = computePackCount(order);
              const packagingCost = packQty * PACK_PRICE;

              return (
                <Fragment key={order?._id || idx}>
                  <tr
                    className={`cursor-pointer ${idx % 2 === 0 ? "bg-gray-50/60" : "bg-white"} hover:bg-gray-100`}
                    onClick={() =>
                      setSelectedOrder((prev) =>
                        prev && String(prev?._id) === String(order?._id) ? null : order
                      )
                    }
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

                  {isOpen && (
                    <tr className="bg-white/90">
                      <td className="p-3 border-b" colSpan={9}>
                        <div
                          className="bg-white w-full p-6 rounded-2xl shadow-xl relative border border-gray-200 cursor-pointer"
                          onClick={() => setSelectedOrder(null)}
                        >
                          <h2 className="text-xl font-bold mb-4">Order Details ({order?._id || "-"})</h2>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <p><strong>Customer:</strong> {order?.customerName || "-"}</p>
                            <p><strong>Phone:</strong> {order?.phone || "-"}</p>
                            <p>
                              <strong>Address:</strong>{" "}
                              {(order?.orderType || "").toLowerCase() === "online"
                                ? `${order?.houseNumber || ""} ${order?.street || ""} ${order?.landmark || ""}`.trim()
                                : "In-store"}
                            </p>
                            <p className="capitalize"><strong>Type:</strong> {(order?.orderType || "-").toLowerCase()}</p>
                            <p>
                              <strong>Payment:</strong>{" "}
                              {(String(order?.paymentMode || "").toLowerCase() === "upi"
                                ? "transfer"
                                : order?.paymentMode) || "--"}
                            </p>
                            <p><strong>Total:</strong> {money(order?.total)}</p>

                            <p><strong>Packaging Packs:</strong> {packQty}</p>
                            <p><strong>Packaging Cost:</strong> {money(packagingCost)}</p>

                            <p><strong>Date:</strong> {fmtDate(order?.createdAt)}</p>
                            <p><strong>Time:</strong> {fmtTime(order?.createdAt)}</p>
                          </div>

                          <h3 className="mt-4 font-bold">Items</h3>
                          <ul className="list-disc list-inside text-sm">
                            {(Array.isArray(order?.items) ? order.items : []).map((item, i) => (
                              <li key={i}>
                                {item?.name || "Item"} — {Number(item?.quantity || 0)} × {money(item?.price)}
                              </li>
                            ))}
                            {packQty > 0 && (
                              <li className="text-gray-700">
                                Pack — {packQty} × {money(PACK_PRICE)} = <strong>{money(packagingCost)}</strong>
                              </li>
                            )}
                          </ul>

                          <div className="mt-6 flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeOrder(order?._id);
                              }}
                              disabled={removing}
                              className="px-4 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-rose-600 to-red-600 shadow hover:opacity-95 active:scale-95 disabled:opacity-50 transition"
                            >
                              {removing ? "Removing..." : "Remove Order"}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
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


