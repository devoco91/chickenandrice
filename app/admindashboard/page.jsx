"use client";

import { useEffect, useState, useMemo } from "react";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null); // 👈 modal state
  const [weeklyOnlineTotal, setWeeklyOnlineTotal] = useState(0);
  const [weeklyShopTotal, setWeeklyShopTotal] = useState(0);
  const [weeklyCombinedTotal, setWeeklyCombinedTotal] = useState(0);

  // 👇 new states for daily totals
  const [dailyOnlineTotal, setDailyOnlineTotal] = useState(0);
  const [dailyShopTotal, setDailyShopTotal] = useState(0);
  const [dailyCombinedTotal, setDailyCombinedTotal] = useState(0);

  const [loading, setLoading] = useState(false); // ✅ refresh loading state

  const pageSize = 10;

  // ✅ Fetch orders function (reusable for refresh)
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Initial fetch + auto-refresh every 60s
  useEffect(() => {
    fetchOrders(); // initial fetch

    const interval = setInterval(() => {
      fetchOrders();
    }, 60000); // 60 seconds

    return () => clearInterval(interval); // cleanup
  }, []);

  // ✅ Filter + Sort orders (recent first)
  const filteredOrders = useMemo(() => {
    let list =
      filter === "all" ? orders : orders.filter((o) => o.orderType === filter);

    return [...list].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [orders, filter]);

  // ✅ Pagination
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = filteredOrders.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // ✅ Stats
  const totalOrders = orders.length;
  const totalAmount = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const onlineOrders = orders.filter((o) => o.orderType === "online").length;
  const shopOrders = orders.filter((o) => o.orderType === "instore").length;

  // ✅ Weekly Totals
  useEffect(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    let online = 0;
    let instore = 0;

    orders.forEach((o) => {
      const orderDate = new Date(o.createdAt);
      if (orderDate >= startOfWeek) {
        if (o.orderType === "online") online += o.total || 0;
        if (o.orderType === "instore") instore += o.total || 0;
      }
    });

    setWeeklyOnlineTotal(online);
    setWeeklyShopTotal(instore);
    setWeeklyCombinedTotal(online + instore);
  }, [orders]);

  // ✅ Daily Totals
  useEffect(() => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    let online = 0;
    let instore = 0;

    orders.forEach((o) => {
      const orderDate = new Date(o.createdAt);
      if (orderDate >= startOfDay) {
        if (o.orderType === "online") online += o.total || 0;
        if (o.orderType === "instore") instore += o.total || 0;
      }
    });

    setDailyOnlineTotal(online);
    setDailyShopTotal(instore);
    setDailyCombinedTotal(online + instore);
  }, [orders]);

  return (
    <div className="p-6 space-y-6">
      {/* ---- Refresh button ---- */}
      <div className="flex justify-end">
        <button
          onClick={fetchOrders}
          disabled={loading}
          className={`px-4 py-2 rounded-2xl shadow text-white ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-700"
          }`}
        >
          {loading ? "Refreshing..." : "🔄 Refresh Totals"}
        </button>
      </div>

      {/* ---- Top Stats ---- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-500 text-white p-4 shadow rounded-2xl">
          <h2 className="text-lg font-bold">Total Orders</h2>
          <p className="text-2xl">{totalOrders}</p>
        </div>
        <div className="bg-green-500 text-white p-4 shadow rounded-2xl">
          <h2 className="text-lg font-bold">Total Amount</h2>
          <p className="text-2xl">₦{totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-orange-500 text-white p-4 shadow rounded-2xl">
          <h2 className="text-lg font-bold">Online Orders</h2>
          <p className="text-2xl">{onlineOrders}</p>
        </div>
        <div className="bg-red-500 text-white p-4 shadow rounded-2xl">
          <h2 className="text-lg font-bold">Shop Orders</h2>
          <p className="text-2xl">{shopOrders}</p>
        </div>
      </div>

      {/* ✅ Daily totals buttons */}
      <div className="flex flex-wrap gap-4">
        <button className="px-4 py-2 bg-indigo-500 text-white rounded-2xl shadow">
          Today Online Total: ₦{dailyOnlineTotal.toFixed(2)}
        </button>
        <button className="px-4 py-2 bg-teal-500 text-white rounded-2xl shadow">
          Today Shop Total: ₦{dailyShopTotal.toFixed(2)}
        </button>
        <button className="px-4 py-2 bg-pink-600 text-white rounded-2xl shadow">
          Today Combined Total: ₦{dailyCombinedTotal.toFixed(2)}
        </button>
      </div>

      {/* ✅ Weekly totals buttons */}
      <div className="flex flex-wrap gap-4">
        <button className="px-4 py-2 bg-orange-500 text-white rounded-2xl shadow">
          Weekly Online Total: ₦{weeklyOnlineTotal.toFixed(2)}
        </button>
        <button className="px-4 py-2 bg-red-500 text-white rounded-2xl shadow">
          Weekly Shop Total: ₦{weeklyShopTotal.toFixed(2)}
        </button>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-2xl shadow">
          Weekly Combined Total: ₦{weeklyCombinedTotal.toFixed(2)}
        </button>
      </div>

      {/* ---- Filter ---- */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Orders</h1>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
          className="border rounded p-2"
        >
          <option value="all">All Orders</option>
          <option value="online">Online Orders</option>
          <option value="instore">Shop Orders</option>
        </select>
      </div>

      {/* ---- Table ---- */}
      <div className="overflow-x-auto bg-white shadow rounded-2xl">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-200 text-left">
            <tr>
              <th className="p-3 border-b">Order ID</th>
              <th className="p-3 border-b">Order Name</th>
              <th className="p-3 border-b">Price</th>
              <th className="p-3 border-b">Order Type</th>
              <th className="p-3 border-b">Customer Name</th>
              <th className="p-3 border-b">Address</th>
              <th className="p-3 border-b">Date</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order, idx) => {
              const orderName = order.items?.length
                ? order.items[0].name +
                  (order.items.length > 1
                    ? ` +${order.items.length - 1} more`
                    : "")
                : "No items";

              const address =
                order.orderType === "online"
                  ? `${order.houseNumber || ""} ${order.street || ""} ${
                      order.landmark || ""
                    }`
                  : "In-store";

              return (
                <tr
                  key={order._id}
                  className={`cursor-pointer ${
                    idx % 2 === 0 ? "bg-gray-50" : "bg-white"
                  } hover:bg-gray-100`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <td className="p-3 border-b">{order._id}</td>
                  <td className="p-3 border-b">{orderName}</td>
                  <td className="p-3 border-b">₦{order.total?.toFixed(2)}</td>
                  <td className="p-3 border-b">{order.orderType}</td>
                  <td className="p-3 border-b">{order.customerName}</td>
                  <td className="p-3 border-b">{address}</td>
                  <td className="p-3 border-b">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ---- Pagination ---- */}
      <div className="flex justify-between items-center mt-4">
        <button
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
        >
          Prev
        </button>
        <span className="font-semibold">
          Page {page} of {totalPages || 1}
        </span>
        <button
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          disabled={page === totalPages || totalPages === 0}
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
        >
          Next
        </button>
      </div>

      {/* ---- Order Detail Modal ---- */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-11/12 md:w-2/3 lg:w-1/2 p-6 rounded-2xl shadow-lg relative">
            <button
              className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded"
              onClick={() => setSelectedOrder(null)}
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4">
              Order Details ({selectedOrder._id})
            </h2>
            <p>
              <strong>Customer:</strong> {selectedOrder.customerName}
            </p>
            <p>
              <strong>Phone:</strong> {selectedOrder.phone || "-"}
            </p>
            <p>
              <strong>Address:</strong>{" "}
              {selectedOrder.orderType === "online"
                ? `${selectedOrder.houseNumber || ""} ${
                    selectedOrder.street || ""
                  } ${selectedOrder.landmark || ""}`
                : "In-store"}
            </p>
            <p>
              <strong>Type:</strong> {selectedOrder.orderType}
            </p>
            <p>
              <strong>Total:</strong> ₦{selectedOrder.total?.toFixed(2)}
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {new Date(selectedOrder.createdAt).toLocaleString()}
            </p>

            <h3 className="mt-4 font-bold">Items</h3>
            <ul className="list-disc list-inside">
              {selectedOrder.items?.map((item, i) => (
                <li key={i}>
                  {item.name} — {item.quantity} × ₦{item.price}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
