// app/admindashboard/page.jsx
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
  BarChart,
  Bar,
} from "recharts";

export default function AdminDashboard() {
  // ===== State =====
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all"); // all|online|instore|chowdeck
  const [paymentFilter, setPaymentFilter] = useState("all"); // all|cash|card|transfer
  const [page, setPage] = useState(1);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showSummary, setShowSummary] = useState(false);

  const [weeklyOnlineTotal, setWeeklyOnlineTotal] = useState(0);
  const [weeklyShopTotal, setWeeklyShopTotal] = useState(0);
  const [weeklyCombinedTotal, setWeeklyCombinedTotal] = useState(0);
  const [weeklyChowdeckTotal, setWeeklyChowdeckTotal] = useState(0);

  const [dailyOnlineTotal, setDailyOnlineTotal] = useState(0);
  const [dailyShopTotal, setDailyShopTotal] = useState(0);
  const [dailyCombinedTotal, setDailyCombinedTotal] = useState(0);
  const [dailyChowdeckTotal, setDailyChowdeckTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Top products controls
  const [rankMetric, setRankMetric] = useState("units"); // units|revenue
  const [compareMode, setCompareMode] = useState("yesterday"); // yesterday|last7

  // Style toggle
  const [summaryStyle, setSummaryStyle] = useState("premium"); // premium|classic

  // Orders anchor for scroll
  const ordersRef = useRef(null);

  // Auto-tick for time anchors
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const pageSize = 10;
  const PACK_PRICE = 200;

  // ===== Utils =====
  const money = (n) =>
    `₦${Number(n || 0).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const pct = (n) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;

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
    return dt ? dt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }) : "-";
  };

  const isPackagingItem = (it) => {
    const name = String(it?.name || "").toLowerCase().trim();
    return /\b(pack|packs|packaging|container|take\s*away|takeaway|bag)\b/.test(name);
  };
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

  // ===== Fetch =====
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

  // Helpers
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

  // ===== Filters (orders table only) =====
  const filteredOrders = useMemo(() => {
    // order type filter
    let list =
      filter === "all" ? orders : orders.filter((o) => (o?.orderType || "").toLowerCase() === filter);

    // date range filter
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

    // payment filter (map upi->transfer)
    if (paymentFilter !== "all") {
      list = list.filter((o) => {
        const pm = String(o?.paymentMode || "").toLowerCase();
        const norm = pm === "upi" ? "transfer" : pm;
        return norm === paymentFilter;
      });
    }

    // sort newest first
    return [...list].sort((a, b) => {
      const ad = safeDate(a?.createdAt)?.getTime() ?? 0;
      const bd = safeDate(b?.createdAt)?.getTime() ?? 0;
      if (bd !== ad) return bd - ad;
      const aid = String(a?._id || "");
      const bid = String(b?._id || "");
      return bid.localeCompare(aid);
    });
  }, [orders, filter, paymentFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page]);

  // ===== KPIs =====
  const totalOrders = orders.length;
  const totalAmount = orders.reduce((sum, o) => sum + Number(o?.total || 0), 0);
  const onlineOrders = orders.filter((o) => (o?.orderType || "").toLowerCase() === "online").length;
  const shopOrders = orders.filter((o) => (o?.orderType || "").toLowerCase() === "instore").length;
  const chowdeckOrders = orders.filter((o) => (o?.orderType || "").toLowerCase() === "chowdeck").length;

  const startOfToday = useMemo(() => {
    const n = new Date();
    n.setHours(0, 0, 0, 0);
    return n;
  }, []);
  const startOfWeek = useMemo(() => {
    const n = new Date();
    const s = new Date(n);
    s.setDate(n.getDate() - n.getDay());
    s.setHours(0, 0, 0, 0);
    return s;
  }, []);

  // Weekly totals
  useEffect(() => {
    let online = 0;
    let instore = 0;
    let chowdeck = 0;
    for (const o of orders) {
      const d = safeDate(o?.createdAt);
      if (d && d >= startOfWeek) {
        const t = Number(o?.total || 0);
        const type = (o?.orderType || "").toLowerCase();
        if (type === "online") online += t;
        if (type === "instore") instore += t;
        if (type === "chowdeck") chowdeck += t;
      }
    }
    setWeeklyOnlineTotal(online);
    setWeeklyShopTotal(instore);
    setWeeklyChowdeckTotal(chowdeck);
    setWeeklyCombinedTotal(online + instore + chowdeck);
  }, [orders, startOfWeek]);

  // Daily totals
  useEffect(() => {
    let online = 0;
    let instore = 0;
    let chowdeck = 0;
    for (const o of orders) {
      const d = safeDate(o?.createdAt);
      if (d && d >= startOfToday) {
        const t = Number(o?.total || 0);
        const type = (o?.orderType || "").toLowerCase();
        if (type === "online") online += t;
        if (type === "instore") instore += t;
        if (type === "chowdeck") chowdeck += t;
      }
    }
    setDailyOnlineTotal(online);
    setDailyShopTotal(instore);
    setDailyChowdeckTotal(chowdeck);
    setDailyCombinedTotal(online + instore + chowdeck);
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

  // ===== Time anchors for banners =====
  const startOfMonth = useMemo(() => {
    const n = new Date(clock);
    const s = new Date(n.getFullYear(), n.getMonth(), 1);
    s.setHours(0, 0, 0, 0);
    return s;
  }, [clock]);
  const startOfWeekMonday = useMemo(() => {
    const n = new Date(clock);
    const s = new Date(n);
    const day = n.getDay();
    const diff = (day + 6) % 7;
    s.setDate(n.getDate() - diff);
    s.setHours(0, 0, 0, 0);
    return s;
  }, [clock]);
  const startOfTodayDyn = useMemo(() => {
    const n = new Date(clock);
    n.setHours(0, 0, 0, 0);
    return n;
  }, [clock]);

  // ===== Counts for banners =====
  const monthlyStats = useMemo(() => {
    let countAll = 0,
      countOnline = 0,
      countShop = 0,
      countChow = 0,
      amount = 0;
    for (const o of orders) {
      const d = safeDate(o?.createdAt);
      if (!d || d < startOfMonth) continue;
      const t = (o?.orderType || "").toLowerCase();
      countAll += 1;
      if (t === "online") countOnline += 1;
      if (t === "instore") countShop += 1;
      if (t === "chowdeck") countChow += 1;
      amount += Number(o?.total || 0);
    }
    return { countAll, countOnline, countShop, countChow, amount };
  }, [orders, startOfMonth]);

  const weeklyStatsMon = useMemo(() => {
    let countAll = 0,
      countOnline = 0,
      countShop = 0,
      countChow = 0,
      amount = 0;
    for (const o of orders) {
      const d = safeDate(o?.createdAt);
      if (!d || d < startOfWeekMonday) continue;
      const t = (o?.orderType || "").toLowerCase();
      countAll += 1;
      if (t === "online") countOnline += 1;
      if (t === "instore") countShop += 1;
      if (t === "chowdeck") countChow += 1;
      amount += Number(o?.total || 0);
    }
    return { countAll, countOnline, countShop, countChow, amount };
  }, [orders, startOfWeekMonday]);

  const dailyStatsDyn = useMemo(() => {
    let countAll = 0,
      countOnline = 0,
      countShop = 0,
      countChow = 0,
      amount = 0;
    for (const o of orders) {
      const d = safeDate(o?.createdAt);
      if (!d || d < startOfTodayDyn) continue;
      const t = (o?.orderType || "").toLowerCase();
      countAll += 1;
      if (t === "online") countOnline += 1;
      if (t === "instore") countShop += 1;
      if (t === "chowdeck") countChow += 1;
      amount += Number(o?.total || 0);
    }
    return { countAll, countOnline, countShop, countChow, amount };
  }, [orders, startOfTodayDyn]);

  // ===== Items sold today (Shop | Online | Chowdeck) =====
  const itemTotalsToday = useMemo(() => {
    const all = new Map();
    const online = new Map();
    const instore = new Map();
    const chowdeck = new Map();
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
        if (type === "chowdeck") chowdeck.set(key, (chowdeck.get(key) || 0) + qty);
      }
    }

    const rows = Array.from(all.keys()).map((k) => ({
      key: k,
      name: display.get(k) || k,
      total: all.get(k) || 0,
      online: online.get(k) || 0,
      instore: instore.get(k) || 0,
      chowdeck: chowdeck.get(k) || 0,
    }));

    rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    return rows;
  }, [orders, startOfToday]);

  // ===== Top products vs baseline =====
  const startOfYesterday = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    y.setHours(0, 0, 0, 0);
    return y;
  }, []);
  const endOfYesterday = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    y.setHours(23, 59, 59, 999);
    return y;
  }, []);
  const startOfLast7 = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 7);
    y.setHours(0, 0, 0, 0);
    return y;
  }, []);
  const endOfLast7 = endOfYesterday;

  const topItems = useMemo(() => {
    const todayMap = new Map();
    const baseMap = new Map();
    const display = new Map();

    const inToday = (d) => d >= startOfToday;
    const inBaseline = (d) =>
      compareMode === "yesterday"
        ? d >= startOfYesterday && d <= endOfYesterday
        : d >= startOfLast7 && d <= endOfLast7;

    const bump = (map, key, val) => map.set(key, (map.get(key) || 0) + val);

    for (const o of orders) {
      const d = safeDate(o?.createdAt);
      if (!d) continue;
      const items = Array.isArray(o?.items) ? o.items : [];

      for (const it of items) {
        const raw = String(it?.name || "Item").trim();
        if (!raw) continue;
        const key = raw.toLowerCase();
        if (!display.has(key)) display.set(key, raw);

        const q = Number(it?.quantity ?? 1) || 1;
        const price = Number(it?.price ?? 0) || 0;
        const value = rankMetric === "units" ? q : q * price;

        if (inToday(d)) bump(todayMap, key, value);
        else if (inBaseline(d)) bump(baseMap, key, value);
      }
    }

    const rows = Array.from(todayMap.keys()).map((k) => {
      const t = todayMap.get(k) || 0;
      const b = baseMap.get(k) || 0;
      const change = b === 0 ? (t > 0 ? 100 : 0) : ((t - b) / b) * 100;
      const name = display.get(k) || k;
      const short = name.length > 16 ? name.slice(0, 15) + "…" : name;
      return { key: k, name, short, todayVal: t, baseVal: b, changePct: change };
    });

    rows.sort((a, b) => b.todayVal - a.todayVal || a.name.localeCompare(b.name));
    return rows.slice(0, 8);
  }, [
    orders,
    startOfToday,
    startOfYesterday,
    endOfYesterday,
    startOfLast7,
    endOfLast7,
    rankMetric,
    compareMode,
  ]);

  // ===== Chart helpers =====
  const pad2 = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const ym = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  const startOfWeekLikeApp = (d) => {
    const n = new Date(d);
    const s = new Date(n);
    s.setDate(n.getDate() - n.getDay());
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
      row.total += t; // includes chowdeck
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
      row.total += t; // includes chowdeck too
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
      row.total += t; // includes chowdeck too
    }
    return Array.from(map.values());
  }, [orders]);

  // Pie data
  const todayPieData = useMemo(
    () => [
      { name: "Online", value: dailyOnlineTotal },
      { name: "Shop", value: dailyShopTotal },
      { name: "Chowdeck", value: dailyChowdeckTotal },
    ],
    [dailyOnlineTotal, dailyShopTotal, dailyChowdeckTotal]
  );

  // Payments breakdown UI
  const paymentToday = useMemo(() => {
    const total = (cashToday || 0) + (cardToday || 0) + (transferToday || 0);
    const parts = [
      { name: "Cash", key: "cash", value: cashToday || 0 },
      { name: "Transfer", key: "transfer", value: transferToday || 0 },
      { name: "Card", key: "card", value: cardToday || 0 },
    ];
    const withShare = parts.map((p) => ({
      ...p,
      share: total > 0 ? (p.value / total) * 100 : 0,
    }));
    return { total, parts: withShare };
  }, [cashToday, cardToday, transferToday]);

  // Tiny sparklines: hourly cumulative
  const paymentSpark = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => h);
    const base = hours.map((h) => ({ h, cash: 0, transfer: 0, card: 0 }));
    for (const o of orders) {
      const d = safeDate(o?.createdAt);
      if (!d || d < startOfToday) continue;
      const h = d.getHours();
      const pm = String(o?.paymentMode || "").toLowerCase();
      const norm = pm === "upi" ? "transfer" : pm;
      const t = Number(o?.total || 0);
      const row = base[h];
      if (!row) continue;
      if (norm === "cash") row.cash += t;
      else if (norm === "card") row.card += t;
      else if (norm === "transfer") row.transfer += t;
    }
    let cCash = 0,
      cTransfer = 0,
      cCard = 0;
    return base.map((r) => {
      cCash += r.cash;
      cTransfer += r.transfer;
      cCard += r.card;
      return {
        h: r.h,
        cash: cCash,
        transfer: cTransfer,
        card: cCard,
        label: `${String(r.h).padStart(2, "0")}:00`,
      };
    });
  }, [orders, startOfToday]);

  // Style helper
  const styleMode = (variant) => {
    const isPremium = summaryStyle === "premium";
    if (variant === "banner-total")
      return isPremium
        ? "mb-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-4 shadow-sm"
        : "mb-3 rounded-xl border bg-white p-3";
    if (variant === "banner-monthly")
      return isPremium
        ? "mt-8 mb-2 rounded-2xl border border-fuchsia-100 bg-gradient-to-r from-fuchsia-50 via-pink-50 to-rose-50 p-4 shadow-sm"
        : "mt-8 mb-2 rounded-xl border bg-white p-3";
    if (variant === "banner-weekly")
      return isPremium
        ? "mt-6 mb-2 rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 p-4 shadow-sm"
        : "mt-6 mb-2 rounded-xl border bg-white p-3";
    if (variant === "banner-daily")
      return isPremium
        ? "mt-6 mb-2 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-emerald-50 to-amber-50 p-4 shadow-sm"
        : "mt-6 mb-2 rounded-xl border bg-white p-3";
    if (variant === "card-payments")
      return isPremium
        ? "mt-8 bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow p-5"
        : "mt-8 bg-white border rounded-xl p-4";
    return "";
  };

  const colorFor = (name) => {
    const key = String(name || "").toLowerCase();
    if (key === "online") return "#2563EB";
    if (key === "shop") return "#DC2626";
    if (key === "chowdeck") return "url(#chowdeckGrad)";
    return "#9CA3AF";
  };

  // filter helpers (why: UX shortcuts)
  const applyFilter = (val) => {
    setFilter(val);
    setPage(1);
  };
  const applyPaymentFilter = (val) => {
    setPaymentFilter(val);
    setPage(1);
    if (ordersRef.current) ordersRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ===== Render =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 p-6 md:p-10">
      {/* Header + actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
          Admin Dashboard
        </h1>
        <div className="flex gap-2 items-center">
          {/* Style toggle */}
          <div className="flex items-center gap-1 bg-white/60 border rounded-xl p-1">
            <button
              onClick={() => setSummaryStyle("classic")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                summaryStyle === "classic" ? "bg-white shadow" : "opacity-70"
              }`}
              title="Minimal, flat look"
            >
              Classic
            </button>
            <button
              onClick={() => setSummaryStyle("premium")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                summaryStyle === "premium" ? "bg-white shadow" : "opacity-70"
              }`}
              title="Gradients & soft shadows"
            >
              Premium
            </button>
          </div>

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

      {/* ---------- TOTAL SUMMARY BANNER ---------- */}
      <div className={styleMode("banner-total")}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              Total summary
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-semibold">{totalOrders}</span> orders •
              <span className="ml-1 font-semibold">{money(totalAmount)}</span> revenue
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => applyFilter("online")}
              className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold"
              title="Filter orders to Online"
            >
              Online: {onlineOrders}
            </button>
            <button
              onClick={() => applyFilter("instore")}
              className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 font-semibold"
              title="Filter orders to Shop"
            >
              Shop: {shopOrders}
            </button>
            <button
              onClick={() => applyFilter("chowdeck")}
              className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold"
              title="Filter orders to Chowdeck"
            >
              Chowdeck: {chowdeckOrders}
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      

      {/* ---------- MONTHLY SUMMARY BANNER ---------- */}
      <div className={styleMode("banner-monthly")}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-fuchsia-700">
              Monthly summary
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-semibold">{monthlyStats.countAll}</span> orders this month •
              <span className="ml-1 font-semibold">{money(monthlyStats.amount)}</span> revenue
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => applyFilter("online")}
              className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold"
            >
              Online: {monthlyStats.countOnline}
            </button>
            <button
              onClick={() => applyFilter("instore")}
              className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 font-semibold"
            >
              Shop: {monthlyStats.countShop}
            </button>
            <button
              onClick={() => applyFilter("chowdeck")}
              className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold"
            >
              Chowdeck: {monthlyStats.countChow}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- WEEKLY SUMMARY BANNER ---------- */}
      <div className={styleMode("banner-weekly")}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-purple-700">
              Weekly summary
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-semibold">{weeklyStatsMon.countAll}</span> orders since Monday •
              <span className="ml-1 font-semibold">{money(weeklyStatsMon.amount)}</span> revenue
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">
              Online: {money(weeklyOnlineTotal)}
            </span>
            <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
              Shop: {money(weeklyShopTotal)}
            </span>
            <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">
              Chowdeck: {money(weeklyChowdeckTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* ---------- DAILY SUMMARY BANNER ---------- */}
      <div className={styleMode("banner-daily")}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Today’s summary
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-semibold">{dailyStatsDyn.countAll}</span> orders today •
              <span className="ml-1 font-semibold">{money(dailyCombinedTotal)}</span> revenue
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => applyFilter("online")}
              className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold"
            >
              Online: {money(dailyOnlineTotal)}
            </button>
            <button
              onClick={() => applyFilter("instore")}
              className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 font-semibold"
            >
              Shop: {money(dailyShopTotal)}
            </button>
            <button
              onClick={() => applyFilter("chowdeck")}
              className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold"
            >
              Chowdeck: {money(dailyChowdeckTotal)}
            </button>
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow p-4">
          <h3 className="font-bold mb-2">Today’s Sales Split</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  <linearGradient id="chowdeckGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#D97706" />
                  </linearGradient>
                </defs>
                <Tooltip formatter={(v) => money(v)} />
                <Legend />
                <Pie dataKey="value" nameKey="name" data={todayPieData} outerRadius={100} label>
                  {todayPieData.map((entry, idx) => (
                    <Cell key={`slice-${idx}`} fill={colorFor(entry.name)} />
                  ))}
                </Pie>
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
                <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
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
                <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
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
                <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => money(v)} />
                <Legend />
                <Line type="monotone" dataKey="total" strokeWidth={2} />
                <Line type="monotone" dataKey="online" strokeWidth={2} />
                <Line type="monotone" dataKey="instore" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Premium Top Products */}
        <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow p-4 lg:col-span-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
            <div>
              <h3 className="font-bold">
                Top products by {rankMetric === "units" ? "units sold" : "revenue"}
              </h3>
              <p className="text-xs text-gray-500">
                Today vs {compareMode === "yesterday" ? "Yesterday" : "Last 7 Days"}
              </p>
            </div>
            <div className="flex gap-2">
              <div className="bg-gray-100 rounded-xl p-1 flex">
                <button
                  onClick={() => setRankMetric("units")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    rankMetric === "units" ? "bg-white shadow" : "opacity-70"
                  }`}
                >
                  Units
                </button>
                <button
                  onClick={() => setRankMetric("revenue")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    rankMetric === "revenue" ? "bg-white shadow" : "opacity-70"
                  }`}
                >
                  Revenue
                </button>
              </div>
              <select
                value={compareMode}
                onChange={(e) => setCompareMode(e.target.value)}
                className="px-3 py-1 text-xs border rounded-lg bg-white shadow-sm"
              >
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 Days</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItems} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="short" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => (rankMetric === "units" ? `${v} units` : money(v))}
                  />
                  <Legend />
                  <defs>
                    <linearGradient id="barToday" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FBBF24" />
                      <stop offset="100%" stopColor="#D97706" />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="todayVal" name="Today" fill="url(#barToday)" radius={[6, 6, 0, 0]} />
                  <Bar
                    dataKey="baseVal"
                    name={compareMode === "yesterday" ? "Yesterday" : "Baseline (7d)"}
                    fill="#A78BFA"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-1">
              <div className="border rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 text-xs font-semibold border-b">
                  Change vs {compareMode === "yesterday" ? "yesterday" : "last 7 days"}
                </div>
                <ul className="max-h-72 overflow-y-auto divide-y">
                  {topItems.length === 0 ? (
                    <li className="px-3 py-3 text-xs text-gray-500">No sales today yet.</li>
                  ) : (
                    topItems.map((r) => {
                      const trend = r.changePct > 0 ? "up" : r.changePct < 0 ? "down" : "flat";
                      const badge =
                        trend === "up"
                          ? "bg-emerald-100 text-emerald-700"
                          : trend === "down"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-gray-100 text-gray-700";
                      const symbol = trend === "up" ? "↑" : trend === "down" ? "↓" : "–";
                      return (
                        <li key={r.key} className="px-3 py-2 text-xs flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{r.name}</div>
                            <div className="text-[11px] text-gray-500">
                              {rankMetric === "units"
                                ? `${r.todayVal} today • ${r.baseVal} baseline`
                                : `${money(r.todayVal)} today • ${money(r.baseVal)} baseline`}
                            </div>
                          </div>
                          <span className={`ml-2 px-2 py-1 rounded-full font-semibold ${badge}`}>
                            {symbol} {pct(r.changePct)}
                          </span>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today’s Payment Methods */}
      <div className={styleMode("card-payments")}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h3 className="font-bold text-gray-900">Today’s Payment Methods</h3>
            <p className="text-xs text-gray-500">Auto-resets at midnight based on order timestamps.</p>
          </div>
          <div className="text-sm text-gray-700">
            Total collected today: <span className="font-extrabold">{money(paymentToday.total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: compact bar chart */}
          <div className="h-48 lg:col-span-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentToday.parts} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pmCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                  <linearGradient id="pmTransfer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#D97706" />
                  </linearGradient>
                  <linearGradient id="pmCard" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818CF8" />
                    <stop offset="100%" stopColor="#4F46E5" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => money(v)} labelFormatter={(l) => `${l}`} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {paymentToday.parts.map((p) => (
                    <Cell
                      key={p.key}
                      fill={
                        p.key === "cash"
                          ? "url(#pmCash)"
                          : p.key === "transfer"
                          ? "url(#pmTransfer)"
                          : "url(#pmCard)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Right: stat tiles with sparklines + links */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Cash */}
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Cash</div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-700">{money(cashToday)}</div>
              <div className="mt-1 text-xs">
                Share:{" "}
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                  {paymentToday.parts.find((p) => p.key === "cash")?.share.toFixed(1)}%
                </span>
              </div>
              <div className="mt-3 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={paymentSpark}>
                    <XAxis dataKey="label" hide />
                    <YAxis hide />
                    <Tooltip formatter={(v) => money(v)} />
                    <Line type="monotone" dataKey="cash" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <button
                onClick={() => applyPaymentFilter("cash")}
                className="mt-3 text-xs font-semibold text-emerald-700 hover:underline"
              >
                View transactions →
              </button>
            </div>
            {/* Transfer */}
            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Transfer</div>
              <div className="mt-1 text-2xl font-extrabold text-amber-700">{money(transferToday)}</div>
              <div className="mt-1 text-xs">
                Share:{" "}
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                  {paymentToday.parts.find((p) => p.key === "transfer")?.share.toFixed(1)}%
                </span>
              </div>
              <div className="mt-3 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={paymentSpark}>
                    <XAxis dataKey="label" hide />
                    <YAxis hide />
                    <Tooltip formatter={(v) => money(v)} />
                    <Line type="monotone" dataKey="transfer" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <button
                onClick={() => applyPaymentFilter("transfer")}
                className="mt-3 text-xs font-semibold text-amber-700 hover:underline"
              >
                View transactions →
              </button>
            </div>
            {/* Card */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Card</div>
              <div className="mt-1 text-2xl font-extrabold text-indigo-700">{money(cardToday)}</div>
              <div className="mt-1 text-xs">
                Share:{" "}
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                  {paymentToday.parts.find((p) => p.key === "card")?.share.toFixed(1)}%
                </span>
              </div>
              <div className="mt-3 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={paymentSpark}>
                    <XAxis dataKey="label" hide />
                    <YAxis hide />
                    <Tooltip formatter={(v) => money(v)} />
                    <Line type="monotone" dataKey="card" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <button
                onClick={() => applyPaymentFilter("card")}
                className="mt-3 text-xs font-semibold text-indigo-700 hover:underline"
              >
                View transactions →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Items sold today (includes Chowdeck) */}
      <div className="mt-6 overflow-x-auto bg-white/90 backdrop-blur border border-gray-200 shadow rounded-2xl">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3 border-b">Item</th>
              <th className="p-3 border-b">Shop</th>
              <th className="p-3 border-b">Online</th>
              <th className="p-3 border-b">Chowdeck</th>
              <th className="p-3 border-b">Total</th>
            </tr>
          </thead>
          <tbody>
            {itemTotalsToday.length === 0 ? (
              <tr>
                <td className="p-3 border-b text-gray-500" colSpan={5}>
                  No items sold today yet.
                </td>
              </tr>
            ) : (
              itemTotalsToday.map((row) => (
                <tr key={row.key} className="odd:bg-gray-50/60">
                  <td className="p-3 border-b">{row.name}</td>
                  <td className="p-3 border-b">{row.instore}</td>
                  <td className="p-3 border-b">{row.online}</td>
                  <td className="p-3 border-b">{row.chowdeck}</td>
                  <td className="p-3 border-b">{row.total}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Orders header + filters + export */}
      <div ref={ordersRef} className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mt-8">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
          <p className="text-sm text-gray-500">Type, date & payment filters affect only the Orders list.</p>

          {/* Active payment filter pill */}
          {paymentFilter !== "all" && (
            <div className="mt-2 inline-flex items-center gap-2 text-xs bg-gray-100 border rounded-full px-3 py-1">
              <span className="text-gray-700">Payment: <strong className="capitalize">{paymentFilter}</strong></span>
              <button
                onClick={() => applyPaymentFilter("all")}
                className="text-gray-600 hover:text-gray-900"
                title="Clear payment filter"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="border rounded-xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <button
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setPage(1);
            }}
            className="px-3 py-2 rounded-2xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            className="border rounded-2xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="all">All Orders</option>
            <option value="online">Online Orders</option>
            <option value="instore">Shop Orders</option>
            <option value="chowdeck">Chowdeck Orders</option>
          </select>

          {/* Payment mode filter dropdown */}
          <select
            value={paymentFilter}
            onChange={(e) => applyPaymentFilter(e.target.value)}
            className="border rounded-2xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="all">All Payments</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="transfer">Transfer</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => {
                const ordersForExport = filteredOrders;
                const csvEscape = (v) => {
                  const s = String(v ?? "");
                  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
                  return s;
                };
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
              }}
              className="px-3 py-2 rounded-2xl bg-emerald-600 text-white font-semibold shadow hover:opacity-95"
            >
              Export CSV
            </button>
            <button
              onClick={() => {
                const ordersForExport = filteredOrders;
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
  <script>window.onload = () => setTimeout(() => { window.print(); }, 300);</script>
</body>
</html>`);
                w.document.close();
              }}
              className="px-3 py-2 rounded-2xl bg-indigo-600 text-white font-semibold shadow hover:opacity-95"
            >
              Export PDF
            </button>
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
                                setRemoving(true);
                                fetch(`${API_BASE}/orders/${encodeURIComponent(order?._id)}`, { method: "DELETE" })
                                  .then(async (res) => {
                                    if (!res.ok) {
                                      const e = await res.json().catch(() => ({}));
                                      throw new Error(e?.error || `Failed to remove order (status ${res.status})`);
                                    }
                                    setOrders((prev) => prev.filter((o) => String(o?._id) !== String(order?._id)));
                                    setSelectedOrder(null);
                                  })
                                  .catch((err) => {
                                    console.error(err);
                                    alert(err.message || "Failed to remove order.");
                                  })
                                  .finally(() => setRemoving(false));
                              }}
                              disabled={removing}
                              className="px-4 py-2 rounded-2xl font-semibold text-white bg-gradient-to-r from-rose-600 to-red-600 shadow hover:opacity-95 active:scale-95 disabled:opacity-50 transition"
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
          className="px-4 py-2 bg-white border border-gray-300 rounded-2xl hover:bg-gray-50 disabled:opacity-50"
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
        >
          Prev
        </button>
        <span className="font-semibold">Page {page} of {totalPages}</span>
        <button
          className="px-4 py-2 bg-white border border-gray-300 rounded-2xl hover:bg-gray-50 disabled:opacity-50"
          disabled={page === totalPages || totalPages === 0}
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
        >
          Next
        </button>
      </div>

      {/* Summary modal */}
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
              <div className="flex items-center justify-between rounded-2xl border p-3 bg-emerald-50">
                <span className="font-semibold">Cash Total</span>
                <span className="text-emerald-700 font-extrabold">{money(cashToday)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border p-3 bg-indigo-50">
                <span className="font-semibold">Card Total</span>
                <span className="text-indigo-700 font-extrabold">{money(cardToday)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border p-3 bg-amber-50">
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
                className="px-4 py-2 rounded-2xl bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 active:scale-95 transition"
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
