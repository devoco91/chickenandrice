// app/admindashboard/page.jsx
"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  Fragment,
  useTransition,
} from "react";
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
  Brush,
} from "recharts";

// ---------- small UI primitives ----------
const Card = ({ className = "", children }) => (
  <div className={`bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow ${className}`}>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 className="font-bold mb-2 text-gray-900">{children}</h3>
);

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse rounded-xl bg-gray-200/70 ${className}`} />
);

// money compact for axes/ticks
const compactNaira = (v) => {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return "₦0";
  // Intl numberformat compacts but not with currency well; keep simple
  if (Math.abs(n) >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `₦${(n / 1_000).toFixed(0)}k`;
  return `₦${n.toFixed(0)}`;
};

// ---------- Component ----------
export default function AdminDashboard() {
  // ===== State =====
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
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
  const [errorMsg, setErrorMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Chart series visibility
  const [seriesVisible, setSeriesVisible] = useState({
    online: true,
    instore: true,
    chowdeck: true,
    total: true,
  });

  // Auto-refresh toggle (persisted)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  useEffect(() => {
    try {
      const v = localStorage.getItem("admindashboard:autoRefresh");
      if (v !== null) setAutoRefreshEnabled(v === "1");
      const pf = localStorage.getItem("admindashboard:paymentFilter");
      if (pf) setPaymentFilter(pf);
      const tf = localStorage.getItem("admindashboard:typeFilter");
      if (tf) setFilter(tf);
      const df = localStorage.getItem("admindashboard:dateFrom");
      if (df) setDateFrom(df);
      const dt = localStorage.getItem("admindashboard:dateTo");
      if (dt) setDateTo(dt);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("admindashboard:autoRefresh", autoRefreshEnabled ? "1" : "0");
      localStorage.setItem("admindashboard:paymentFilter", paymentFilter);
      localStorage.setItem("admindashboard:typeFilter", filter);
      localStorage.setItem("admindashboard:dateFrom", dateFrom);
      localStorage.setItem("admindashboard:dateTo", dateTo);
    } catch {}
  }, [autoRefreshEnabled, paymentFilter, filter, dateFrom, dateTo]);

  // Top products controls
  const [rankMetric, setRankMetric] = useState("units");
  const [compareMode, setCompareMode] = useState("yesterday");

  // Style toggle
  const [summaryStyle, setSummaryStyle] = useState("premium");

  const ordersRef = useRef(null);

  // Midnight rollover token
  const [dayToken, setDayToken] = useState(0);
  useEffect(() => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    const id = setTimeout(() => setDayToken((t) => t + 1), next.getTime() - now.getTime());
    return () => clearTimeout(id);
  }, [dayToken]);

  const pageSize = 10;
  const PACK_PRICE = 200;

  const [isPending, startTransition] = useTransition();

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
      setErrorMsg("");
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

      startTransition(() => {
        setOrders(Array.isArray(data) ? data : []);
        setLastUpdated(new Date());
      });
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("fetchOrders failed:", err);
        setErrorMsg(err?.message || "Failed to load orders.");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // Debounced manual refresh to avoid button spam under slow network
  const refreshDebounceRef = useRef(0);
  const handleManualRefresh = () => {
    const now = Date.now();
    if (now - refreshDebounceRef.current < 1500) return; // why: prevent double taps
    refreshDebounceRef.current = now;
    fetchOrders();
  };

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    fetchOrders();
    return () => {
      mountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling controlled by toggle
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const id = setInterval(fetchOrders, 60_000);
    return () => clearInterval(id);
  }, [autoRefreshEnabled]);

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

  // Time anchors
  const startOfToday = useMemo(() => {
    const n = new Date();
    n.setHours(0, 0, 0, 0);
    return n;
  }, [dayToken]);
  const startOfWeek = useMemo(() => {
    const n = new Date();
    const s = new Date(n);
    s.setDate(n.getDate() - n.getDay());
    s.setHours(0, 0, 0, 0);
    return s;
  }, [dayToken]);
  const startOfMonth = useMemo(() => {
    const n = new Date();
    const s = new Date(n.getFullYear(), n.getMonth(), 1);
    s.setHours(0, 0, 0, 0);
    return s;
  }, [dayToken]);
  const startOfWeekMonday = useMemo(() => {
    const n = new Date();
    const s = new Date(n);
    const day = n.getDay();
    const diff = (day + 6) % 7;
    s.setDate(n.getDate() - diff);
    s.setHours(0, 0, 0, 0);
    return s;
  }, [dayToken]);

  // ===== Filters (orders table only) =====
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

    if (paymentFilter !== "all") {
      list = list.filter((o) => {
        const pm = String(o?.paymentMode || "").toLowerCase();
        const norm = pm === "upi" ? "transfer" : pm;
        return norm === paymentFilter;
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
  }, [orders, filter, paymentFilter, dateFrom, dateTo]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount, page]);

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

  // ===== Counts for banners =====
  const monthlyStats = useMemo(() => {
    let countAll = 0,
      countOnline = 0,
      countShop = 0,
      countChow = 0,
      amount = 0;
    for (const o of orders) {
      const d = safeDate(o?.createdAt);
      const start = startOfMonth;
      if (!d || d < start) continue;
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
      const start = startOfWeekMonday;
      if (!d || d < start) continue;
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
      const start = startOfToday;
      if (!d || d < start) continue;
      const t = (o?.orderType || "").toLowerCase();
      countAll += 1;
      if (t === "online") countOnline += 1;
      if (t === "instore") countShop += 1;
      if (t === "chowdeck") countChow += 1;
      amount += Number(o?.total || 0);
    }
    return { countAll, countOnline, countShop, countChow, amount };
  }, [orders, startOfToday]);

  // ===== Top products vs baseline =====
  const startOfYesterday = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    y.setHours(0, 0, 0, 0);
    return y;
  }, [dayToken]);
  const endOfYesterday = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    y.setHours(23, 59, 59, 999);
    return y;
  }, [dayToken]);
  const startOfLast7 = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 7);
    y.setHours(0, 0, 0, 0);
    return y;
  }, [dayToken]);
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

  // ===== Chart helpers & colors =====
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
      year: "numeric",
    });

  // Premium palette
  const COLORS = {
    online: "#2563EB", // blue-600
    instore: "#DC2626", // red-600
    chowdeck: "#D97706", // amber-600
    total: "#6B7280", // gray-500
    grid: "#E5E7EB", // gray-200
  };

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
          chowdeck: 0,
          total: 0,
        },
      ])
    );
    for (const o of orders) {
      const d = safeDate(o?.createdAt);
      if (!d) continue;
      const key = ymd(d);
      if (!map.has(key)) continue;
      const t = Number(o?.total || 0);
      const type = (o?.orderType || "").toLowerCase();
      const row = map.get(key);
      if (type === "online") row.online += t;
      if (type === "instore") row.instore += t;
      if (type === "chowdeck") row.chowdeck += t;
      row.total += t;
    }
    return Array.from(map.values());
  }, [orders, dayToken]);

  const weeklySeries = useMemo(() => {
    const weeks = [];
    const start = startOfWeekLikeApp(new Date());
    for (let i = 11; i >= 0; i--) {
      const d = new Date(start);
      d.setDate(start.getDate() - i * 7);
      weeks.push(d);
    }
    const map = new Map(
      weeks.map((d) => [
        ymd(d),
        { date: ymd(d), label: labelWeek(d), online: 0, instore: 0, chowdeck: 0, total: 0 },
      ])
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
      if (type === "chowdeck") row.chowdeck += t;
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
      months.map((d) => [
        ym(d),
        { date: ym(d), label: labelMonth(d), online: 0, instore: 0, chowdeck: 0, total: 0 },
      ])
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
      if (type === "chowdeck") row.chowdeck += t;
      row.total += t;
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

  const applyFilter = (val) => {
    setFilter(val);
    setPage(1);
  };
  const applyPaymentFilter = (val) => {
    setPaymentFilter(val);
    setPage(1);
    if (ordersRef.current) ordersRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Legend toggle handler (click to show/hide a series)
  const handleLegendClick = (o) => {
    const key = String(o?.dataKey || "").toLowerCase();
    if (!key) return;
    setSeriesVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ===== Render =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
      <div className="mx-auto max-w-7xl p-6 md:p-10">
        {/* Header + actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
            Monthly Sales Tracker
          </h1>
          <div className="flex gap-2 items-center flex-wrap">
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

            {/* Auto-refresh toggle */}
            <label className="flex items-center gap-2 bg-white/60 border rounded-xl pl-3 pr-2 py-1 text-xs font-semibold">
              <span>Auto-refresh</span>
              <button
                type="button"
                aria-pressed={autoRefreshEnabled}
                onClick={() => setAutoRefreshEnabled((v) => !v)}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  autoRefreshEnabled ? "bg-emerald-500" : "bg-gray-300"
                } ${loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                title={autoRefreshEnabled ? "Disable auto refresh" : "Enable auto refresh"}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    autoRefreshEnabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </label>

            <button
              onClick={() => setShowSummary(true)}
              className="px-4 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow hover:opacity-95 active:scale-95 transition shrink-0 whitespace-nowrap"
            >
              View Today’s Summary
            </button>
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className={`w-[150px] px-4 py-2 rounded-xl font-semibold text-white shadow transition shrink-0 whitespace-nowrap ${
                loading ? "bg-gray-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
              }`}
              aria-live="polite"
              aria-busy={loading}
            >
              {loading ? "Refreshing…" : "Refresh Totals"}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3" role="alert">
            {errorMsg}
          </div>
        )}
        {lastUpdated && (
          <div className="mb-2 text-xs text-gray-600" aria-live="polite">
            Last updated: <strong>{fmtDate(lastUpdated)} {fmtTime(lastUpdated)}</strong>
            {autoRefreshEnabled ? " • Auto-refresh ON" : " • Auto-refresh OFF"}
          </div>
        )}

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

        {/* ===== KPI strip ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                  Total Sales (Month)
                </div>
                <div className="mt-1 text-3xl md:text-4xl font-extrabold text-gray-900">
                  {money(monthlyStats.amount)}
                </div>
              </div>
              <div className="text-xs text-gray-500 text-right">
                Orders<br />
                <span className="text-sm font-bold text-gray-800">{monthlyStats.countAll}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                  Total Sales (Week)
                </div>
                <div className="mt-1 text-3xl md:text-4xl font-extrabold text-gray-900">
                  {money(weeklyCombinedTotal)}
                </div>
              </div>
              <div className="text-xs text-gray-500 text-right">
                Orders<br />
                <span className="text-sm font-bold text-gray-800">{weeklyStatsMon.countAll}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                  Today’s Sales
                </div>
                <div className="mt-1 text-3xl md:text-4xl font-extrabold text-gray-900">
                  {money(dailyCombinedTotal)}
                </div>
              </div>
              <div className="text-xs text-gray-500 text-right">
                Orders<br />
                <span className="text-sm font-bold text-gray-800">{dailyStatsDyn.countAll}</span>
              </div>
            </div>
          </Card>
        </div>

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
              <button onClick={() => applyFilter("online")} className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                Online: {monthlyStats.countOnline}
              </button>
              <button onClick={() => applyFilter("instore")} className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 font-semibold">
                Shop: {monthlyStats.countShop}
              </button>
              <button onClick={() => applyFilter("chowdeck")} className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">
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
              <button onClick={() => applyFilter("online")} className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                Online: {money(dailyOnlineTotal)}
              </button>
              <button onClick={() => applyFilter("instore")} className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 font-semibold">
                Shop: {money(dailyShopTotal)}
              </button>
              <button onClick={() => applyFilter("chowdeck")} className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">
                Chowdeck: {money(dailyChowdeckTotal)}
              </button>
            </div>
          </div>
        </div>

        {/* CHARTS SECTION */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pie */}
          <Card className="p-4">
            <SectionTitle>Today’s Sales Split</SectionTitle>
            <div className="h-64">
              {loading && orders.length === 0 ? (
                <Skeleton className="h-full w-full" />
              ) : (
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
                        <Cell
                          key={`slice-${idx}`}
                          fill={
                            entry.name === "Online"
                              ? COLORS.online
                              : entry.name === "Shop"
                              ? COLORS.instore
                              : "url(#chowdeckGrad)"
                          }
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Daily */}
          <Card className="p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <SectionTitle>Daily Sales (last 14 days)</SectionTitle>
              {/* Series toggles */}
              <div className="flex gap-2 flex-wrap text-xs">
                {["online", "instore", "chowdeck", "total"].map((k) => (
                  <button
                    key={k}
                    onClick={() => setSeriesVisible((p) => ({ ...p, [k]: !p[k] }))}
                    className={`px-2 py-1 rounded-full border ${
                      seriesVisible[k] ? "bg-white" : "bg-gray-100 opacity-60"
                    }`}
                    title={`Toggle ${k}`}
                  >
                    {k[0].toUpperCase() + k.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64">
              {loading && orders.length === 0 ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailySeries} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={compactNaira} />
                    <Tooltip formatter={(v) => money(v)} />
                    <Legend verticalAlign="bottom" iconType="circle" onClick={handleLegendClick} />
                    {seriesVisible.online && (
                      <Line type="monotone" dataKey="online" name="Online" stroke={COLORS.online} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    )}
                    {seriesVisible.instore && (
                      <Line type="monotone" dataKey="instore" name="Shop" stroke={COLORS.instore} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    )}
                    {seriesVisible.chowdeck && (
                      <Line type="monotone" dataKey="chowdeck" name="Chowdeck" stroke={COLORS.chowdeck} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    )}
                    {seriesVisible.total && (
                      <Line type="monotone" dataKey="total" name="Total" stroke={COLORS.total} strokeDasharray="4 4" strokeWidth={1.75} dot={false} />
                    )}
                    <Brush height={16} travellerWidth={8} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Weekly */}
          <Card className="p-4 lg:col-span-3">
            <SectionTitle>Weekly Sales (last 12 weeks)</SectionTitle>
            <div className="h-72">
              {loading && orders.length === 0 ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklySeries} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={compactNaira} />
                    <Tooltip formatter={(v) => money(v)} />
                    <Legend verticalAlign="bottom" iconType="circle" onClick={handleLegendClick} />
                    {seriesVisible.online && (
                      <Line type="monotone" dataKey="online" name="Online" stroke={COLORS.online} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    )}
                    {seriesVisible.instore && (
                      <Line type="monotone" dataKey="instore" name="Shop" stroke={COLORS.instore} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    )}
                    {seriesVisible.chowdeck && (
                      <Line type="monotone" dataKey="chowdeck" name="Chowdeck" stroke={COLORS.chowdeck} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    )}
                    {seriesVisible.total && (
                      <Line type="monotone" dataKey="total" name="Total" stroke={COLORS.total} strokeDasharray="4 4" strokeWidth={1.75} dot={false} />
                    )}
                    <Brush height={16} travellerWidth={8} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Monthly */}
          <Card className="p-4 lg:col-span-3">
            <SectionTitle>Monthly Sales (last 12 months)</SectionTitle>
            <div className="h-72">
              {loading && orders.length === 0 ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySeries} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={compactNaira} />
                    <Tooltip formatter={(v) => money(v)} />
                    <Legend verticalAlign="bottom" iconType="circle" onClick={handleLegendClick} />
                    {seriesVisible.online && (
                      <Line type="monotone" dataKey="online" name="Online" stroke={COLORS.online} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    )}
                    {seriesVisible.instore && (
                      <Line type="monotone" dataKey="instore" name="Shop" stroke={COLORS.instore} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    )}
                    {seriesVisible.chowdeck && (
                      <Line type="monotone" dataKey="chowdeck" name="Chowdeck" stroke={COLORS.chowdeck} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    )}
                    {seriesVisible.total && (
                      <Line type="monotone" dataKey="total" name="Total" stroke={COLORS.total} strokeDasharray="4 4" strokeWidth={1.75} dot={false} />
                    )}
                    <Brush height={16} travellerWidth={8} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Premium Top Products */}
          <Card className="p-4 lg:col-span-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
              <div>
                <h3 className="font-bold">
                  Top products by {rankMetric === "units" ? "units sold" : "revenue"}
                </h3>
                <p className="text-xs text-gray-500">
                  Today vs {compareMode === "yesterday" ? "Yesterday" : "Last 7 Days"}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
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
                {loading && orders.length === 0 ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topItems} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="short" />
                      <YAxis allowDecimals={false} />
                      <Tooltip formatter={(v) => (rankMetric === "units" ? `${v} units` : money(v))} />
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
                )}
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
          </Card>
        </div>

        {/* Items sold today */}
        <Card className="mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-100 text-left sticky top-0 z-10">
              <tr>
                <th className="p-3 border-b">Item</th>
                <th className="p-3 border-b">Shop</th>
                <th className="p-3 border-b">Online</th>
                <th className="p-3 border-b">Chowdeck</th>
                <th className="p-3 border-b">Total</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const startOfTodayLocal = startOfDay(new Date());
                const all = new Map();
                const online = new Map();
                const instore = new Map();
                const chowdeck = new Map();
                const display = new Map();
                for (const o of orders) {
                  const d = safeDate(o?.createdAt);
                  if (!d || d < startOfTodayLocal) continue;
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
                if (rows.length === 0) {
                  return (
                    <tr>
                      <td className="p-3 border-b text-gray-500" colSpan={5}>
                        No items sold today yet.
                      </td>
                    </tr>
                  );
                }
                return rows.map((row) => (
                  <tr key={row.key} className="odd:bg-gray-50/60">
                    <td className="p-3 border-b">{row.name}</td>
                    <td className="p-3 border-b">{row.instore}</td>
                    <td className="p-3 border-b">{row.online}</td>
                    <td className="p-3 border-b">{row.chowdeck}</td>
                    <td className="p-3 border-b">{row.total}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </Card>

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
                className="border rounded-2xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400"
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
                className="border rounded-2xl px-3 py-2 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400"
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
        <Card className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-100 text-left sticky top-0 z-10">
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
        </Card>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
          <button
            className="px-4 py-2 bg-white border border-gray-300 rounded-2xl hover:bg-gray-50 disabled:opacity-50"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
          >
            Prev
          </button>
          <span className="font-semibold">Page {page} of {pageCount}</span>
          <button
            className="px-4 py-2 bg-white border border-gray-300 rounded-2xl hover:bg-gray-50 disabled:opacity-50"
            disabled={page === pageCount || pageCount === 0}
            onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
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
    </div>
  );
}
