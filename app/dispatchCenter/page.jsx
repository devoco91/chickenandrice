'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  MapPin, Phone, Clock, Package, User, Navigation,
  Truck, CheckCircle, XCircle, ArrowRightCircle, Hash
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = '/api';

// normalize status values consistently
const normalizeStatus = (s) =>
  (s ?? 'pending')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace('canceled', 'cancelled');

export default function DeliveryCenter() {
  const [orders, setOrders] = useState([]);
  const [deliverymen, setDeliverymen] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');

  const [assigningId, setAssigningId] = useState(null);
  const [selectedDeliveryman, setSelectedDeliveryman] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Banners: { type: 'success' | 'error' | 'info', text: string }
  const [banner, setBanner] = useState(null);

  const getToken = () =>
    (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  const authHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const safeFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (res.status === 401) {
      alert('Your session expired. Please log in again.');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/deliverylogin';
      }
      throw new Error('Unauthorized');
    }
    if (!res.ok) {
      const msg = (await res.text()) || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json') ? res.json() : {};
  };

  const fetchOrders = async () => {
    try {
      const data = await safeFetch(`${API_BASE}/orders/online`, { headers: authHeaders() });
      setOrders(Array.isArray(data) ? data : data.orders || data.data || []);
    } catch (err) {
      console.error('❌ Failed to fetch orders:', err);
      setError(err.message || 'Failed to fetch orders');
      setBanner({ type: 'error', text: err.message || 'Failed to fetch orders' });
    }
  };

  const fetchDeliverymen = async () => {
    try {
      const data = await safeFetch(`${API_BASE}/delivery/all`, { headers: authHeaders() });
      setDeliverymen(Array.isArray(data) ? data : data.deliverymen || data.data || []);
    } catch (err) {
      console.error('❌ Failed to fetch deliverymen:', err);
      setDeliverymen([]);
      setBanner({ type: 'error', text: err.message || 'Failed to fetch deliverymen' });
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOrders(), fetchDeliverymen()]).finally(() => setLoading(false));

    const interval = setInterval(() => {
      fetchOrders();
      fetchDeliverymen();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss banner
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  const handleAssignClick = (orderId) => {
    setAssigningId(orderId);
    setSelectedDeliveryman('');
  };

  const updateDeliveryman = async (orderId, deliverymanId) => {
    if (!deliverymanId) {
      alert('Please select a deliveryman');
      return;
    }
    try {
      const updated = await safeFetch(`${API_BASE}/orders/${orderId}`, {
        method: 'PUT',
        headers: { ...authHeaders() },
        body: JSON.stringify({ assignedTo: deliverymanId, status: 'assigned' }),
      });
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
      setAssigningId(null);
      setSelectedDeliveryman('');
      setBanner({ type: 'success', text: `Order assigned to ${updated?.assignedTo?.name || 'deliveryman'}.` });
    } catch (err) {
      console.error('❌ Error assigning deliveryman:', err);
      alert(err.message || 'Failed to assign deliveryman');
      setBanner({ type: 'error', text: err.message || 'Failed to assign deliveryman' });
    }
  };

  const updateStatus = async (orderId, status) => {
    try {
      const updated = await safeFetch(`${API_BASE}/orders/${orderId}`, {
        method: 'PUT',
        headers: { ...authHeaders() },
        body: JSON.stringify({ status }),
      });
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
      setBanner({ type: 'success', text: `Status updated to ${normalizeStatus(updated?.status).toUpperCase()}.` });
    } catch (err) {
      console.error('❌ Error updating status:', err);
      alert(err.message || 'Failed to update status');
      setBanner({ type: 'error', text: err.message || 'Failed to update status' });
    }
  };

  const filteredOrders = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    if (filterStatus === 'all') return list;
    const want = normalizeStatus(filterStatus);
    return list.filter((o) => normalizeStatus(o?.status) === want);
  }, [orders, filterStatus]);

  const renderTimeline = (order) => {
    const ns = normalizeStatus(order?.status);
    const steps = [
      { key: 'pending', label: 'Order Created', icon: <Clock className="w-4 h-4" /> },
      { key: 'assigned', label: 'Assigned to Deliveryman', icon: <User className="w-4 h-4" /> },
      { key: 'in-transit', label: 'In Transit', icon: <Truck className="w-4 h-4" /> },
      { key: 'delivered', label: 'Delivered', icon: <CheckCircle className="w-4 h-4" /> },
      { key: 'cancelled', label: 'Cancelled', icon: <XCircle className="w-4 h-4" /> },
    ];
    const currentIndex = steps.findIndex((s) => s.key === ns);

    return (
      <div className="flex flex-col gap-2">
        {steps.map((step, idx) => (
          <div key={step.key} className="flex items-center gap-2">
            <span
              className={`p-2 rounded-full ${
                idx <= currentIndex
                  ? step.key === 'cancelled'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-green-100 text-green-600'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {step.icon}
            </span>
            <span
              className={`text-sm ${
                idx <= currentIndex
                  ? step.key === 'cancelled'
                    ? 'text-red-600 font-medium'
                    : 'text-green-700 font-medium'
                  : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const logout = () => {
    try {
      localStorage.removeItem('token');
    } catch {}
    if (typeof window !== 'undefined') {
      window.location.assign('/deliverylogin');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-6xl mx-auto">

        {/* Top actions: nav + logout */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-4">
            <Link
              href="/admindashboard"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-5 py-3 rounded-2xl shadow hover:shadow-lg hover:scale-105 transition"
            >
              Go to Admin Dashboard <ArrowRightCircle className="w-5 h-5" />
            </Link>
            <Link
              href="/order"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-teal-500 text-white px-5 py-3 rounded-2xl shadow hover:shadow-lg hover:scale-105 transition"
            >
              Shop Order <ArrowRightCircle className="w-5 h-5" />
            </Link>
          </div>

          <button
            onClick={logout}
            className="px-4 py-2 rounded-xl bg-gray-800 text-white hover:opacity-95"
          >
            Logout
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 bg-white px-8 py-4 rounded-2xl shadow-lg">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Delivery Dashboard
            </h1>
          </div>
        </div>

        {/* Banner */}
        {banner && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-4 p-3 rounded-2xl shadow ${
              banner.type === 'success'
                ? 'bg-green-100 text-green-800'
                : banner.type === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {banner.text}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white rounded-2xl p-2 shadow-lg">
            {['all','pending','assigned','in-transit','delivered','cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-6 py-3 rounded-xl font-medium transition duration-200 ${
                  filterStatus === status
                    ? status === 'delivered'
                      ? 'bg-green-500 text-white shadow-lg scale-105'
                      : status === 'cancelled'
                      ? 'bg-red-500 text-white shadow-lg scale-105'
                      : 'bg-blue-500 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {status.replace('-', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Deliverymen Section */}
        <div className="bg-white rounded-2xl shadow mb-6 p-4">
          <h2 className="text-lg font-semibold mb-3">Deliverymen</h2>
          {deliverymen.length === 0 ? (
            <p className="text-gray-500">No deliverymen found.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {deliverymen.map((dm) => (
                <div key={dm._id} className="border rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{dm.name}</p>
                    <p className="text-sm text-gray-600">{dm.phone || dm.email}</p>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      dm.isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {dm.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders */}
        {loading ? (
          <p className="text-center text-gray-600">Loading...</p>
        ) : filteredOrders.length === 0 ? (
          <p className="text-center text-gray-600">No {filterStatus} orders at the moment.</p>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const ns = normalizeStatus(order?.status);

              return (
                <div key={order._id} className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-8 py-6 border-b flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Package className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="text-gray-600 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {new Date(order.createdAt).toLocaleDateString('en-GB')} at{' '}
                        {new Date(order.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="px-6 py-2 rounded-xl font-semibold text-sm bg-blue-100 text-blue-700">
                      {ns.toUpperCase()}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-8 grid lg:grid-cols-3 gap-8">
                    {/* Customer */}
                    <div className="bg-gray-50 rounded-2xl p-6">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        Customer
                      </h3>
                      <p><strong>{order.customerName}</strong></p>
                      <p className="text-sm text-gray-600">{order.phone}</p>
                      <p className="text-sm">{order.houseNumber}, {order.street}</p>
                      {order.landmark && <p className="text-sm italic">{order.landmark}</p>}
                    </div>

                    {/* Order */}
                    <div className="bg-gray-50 rounded-2xl p-6">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        Order
                      </h3>
                      <p><strong>{order.items?.[0]?.name || 'N/A'}</strong></p>
                      <p className="text-sm">Payment: {order.paymentMode}</p>
                      <p className="text-sm font-bold">₦{order.total?.toLocaleString()}</p>
                      {order.assignedTo && (
                        <p className="text-sm text-green-600">
                          Assigned to: {order.assignedTo?.name}
                        </p>
                      )}
                    </div>

                    {/* Actions + Timeline */}
                    <div className="bg-gray-50 rounded-2xl p-6">
                      {ns === 'pending' && (
                        <>
                          {assigningId === order._id ? (
                            <>
                              <select
                                value={selectedDeliveryman}
                                onChange={(e) => setSelectedDeliveryman(e.target.value)}
                                className="mb-3 w-full p-2 border rounded"
                              >
                                <option value="">Select Deliveryman</option>
                                {deliverymen.filter((dm) => dm.isOnline).map((dm) => (
                                  <option key={dm._id} value={dm._id}>
                                    {dm.name} (Online)
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => updateDeliveryman(order._id, selectedDeliveryman)}
                                disabled={!selectedDeliveryman}
                                className={`w-full text-white py-2 rounded-lg ${
                                  selectedDeliveryman
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : 'bg-blue-300 cursor-not-allowed'
                                }`}
                              >
                                Assign
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleAssignClick(order._id)}
                              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                            >
                              Assign Deliveryman
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm('Cancel this order?')) {
                                updateStatus(order._id, 'cancelled');
                              }
                            }}
                            className="w-full mt-2 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                          >
                            Cancel Order
                          </button>
                        </>
                      )}

                      {ns === 'assigned' && (
                        <button
                          onClick={() => updateStatus(order._id, 'in-transit')}
                          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                        >
                          Mark In Transit
                        </button>
                      )}

                      {ns === 'in-transit' && (
                        <button
                          onClick={() => updateStatus(order._id, 'delivered')}
                          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                        >
                          Mark as Delivered
                        </button>
                      )}

                      {(ns === 'delivered' || ns === 'cancelled') && (
                        <p className="text-center text-gray-500 mt-4">
                          {ns === 'delivered' ? '✅ Delivered' : '❌ Cancelled'}
                        </p>
                      )}

                      <div className="mt-6">{renderTimeline(order)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
