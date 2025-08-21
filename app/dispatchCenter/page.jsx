
'use client';
import { useEffect, useMemo, useState } from 'react';
import { MapPin, Phone, Clock, Package, User, Navigation, Truck } from 'lucide-react';

const API_BASE = '/api';

export default function DeliveryCenter() {
  const [orders, setOrders] = useState([]);
  const [deliverymen, setDeliverymen] = useState([]);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [assigningId, setAssigningId] = useState(null);
  const [selectedDeliveryman, setSelectedDeliveryman] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
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
      const data = await safeFetch(`${API_BASE}/orders`, { headers: authHeaders() });
      console.log('📦 Orders API response:', data);
      setOrders(Array.isArray(data) ? data : data.orders || data.data || []);
    } catch (err) {
      console.error('❌ Failed to fetch orders:', err);
      setError(err.message || 'Failed to fetch orders');
    }
  };

  const fetchDeliverymen = async () => {
    try {
      const data = await safeFetch(`${API_BASE}/delivery`, { headers: authHeaders() });
      console.log('👷 Deliverymen API response:', data);
      setDeliverymen(Array.isArray(data) ? data : data.deliverymen || data.data || []);
    } catch (err) {
      console.error('❌ Failed to fetch deliverymen:', err);
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
        body: JSON.stringify({ assignedTo: deliverymanId, status: 'assigned' }), // ✅ Assigned only
      });
      console.log('✅ Order updated with deliveryman:', updated);
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
      setAssigningId(null);
      setSelectedDeliveryman('');
    } catch (err) {
      console.error('❌ Error assigning deliveryman:', err);
      alert(err.message || 'Failed to assign deliveryman');
    }
  };

  const updateStatus = async (orderId, status) => {
    try {
      const updated = await safeFetch(`${API_BASE}/orders/${orderId}`, {
        method: 'PUT',
        headers: { ...authHeaders() },
        body: JSON.stringify({ status }),
      });
      console.log('🔄 Order status updated:', updated);
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
    } catch (err) {
      console.error('❌ Error updating status:', err);
      alert(err.message || 'Failed to update status');
    }
  };

  const filteredOrders = useMemo(() => {
    if (filterStatus === 'all') return orders;
    return orders.filter((o) => o.status === filterStatus);
  }, [orders, filterStatus]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-white px-8 py-4 rounded-2xl shadow-lg">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Delivery Dashboard
            </h1>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white rounded-2xl p-2 shadow-lg">
            {['all','pending','assigned','in-transit','delivered','cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-6 py-3 rounded--xl font-medium transition duration-200 ${
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

        {/* Deliverymen List */}
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
                    className={`text-xs px-2 py-1 rounded-full ${
                      dm.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
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
          <div className="bg-white rounded-3xl shadow-lg p-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-600">Loading...</p>
            {error && <p className="text-red-600 mt-2">{error}</p>}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Orders Found</h3>
            <p className="text-gray-500">{`No ${filterStatus.replace('-', ' ')} orders at the moment`}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div key={order._id} className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition duration-300 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-8 py-6 border-b">
                  <div className="flex justify-between items-center">
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
                    <div
                      className={`px-6 py-3 rounded-2xl font-semibold text-sm ${
                        order.status === 'pending'
                          ? 'bg-blue-100 text-blue-700'
                          : order.status === 'assigned'
                          ? 'bg-indigo-100 text-indigo-700'
                          : order.status === 'in-transit'
                          ? 'bg-blue-200 text-blue-800'
                          : order.status === 'delivered'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {order.status.replace('-', ' ').toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <div className="grid lg:grid-cols-3 gap-8">
                    {/* Customer Details */}
                    <div className="bg-gray-50 rounded-2xl p-6">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        Customer Details
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium">{order.customerName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <Phone className="w-4 h-4 text-green-600" />
                          </div>
                          <span>{order.phone}</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-red-600" />
                          </div>
                          <span>{order.houseNumber}, {order.street}</span>
                        </div>
                        {order.landmark && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                              <Navigation className="w-4 h-4 text-yellow-600" />
                            </div>
                            <span>{order.landmark}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="bg-gray-50 rounded-2xl p-6">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        Order Details
                      </h3>
                      <div className="space-y-3">
                        <p><strong>Payment Mode:</strong> {order.paymentMode}</p>
                        <p><strong>Amount:</strong> ₦{Number(order.total || 0).toLocaleString()}</p>
                        {order.assignedTo && (
                          <p><strong>Deliveryman:</strong> {order.assignedTo?.name || order.assignedToName || 'N/A'}</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-gray-50 rounded-2xl p-6 flex flex-col justify-between">
                      {order.status === 'pending' && (
                        <>
                          {assigningId === order._id ? (
                            <>
                              <select
                                value={selectedDeliveryman}
                                onChange={(e) => setSelectedDeliveryman(e.target.value)}
                                className="mb-4 p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Select Deliveryman</option>
                                {deliverymen.filter((dm) => dm.isOnline).length > 0 ? (
                                  deliverymen
                                    .filter((dm) => dm.isOnline)
                                    .map((dm) => (
                                      <option key={dm._id} value={dm._id}>
                                        {dm.name} (Online)
                                      </option>
                                    ))
                                ) : (
                                  <option value="" disabled>No deliverymen online</option>
                                )}
                              </select>
                              <button
                                onClick={() => updateDeliveryman(order._id, selectedDeliveryman)}
                                disabled={!selectedDeliveryman || deliverymen.filter((dm) => dm.isOnline).length === 0}
                                className="bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                              >
                                Assign
                              </button>
                              <button
                                onClick={() => setAssigningId(null)}
                                className="mt-2 text-gray-500 hover:underline py-2"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleAssignClick(order._id)}
                              className="bg-green-600 text-white px-4 py-3 rounded-xl hover:bg-green-700 transition"
                            >
                              Assign Deliveryman
                            </button>
                          )}
                        </>
                      )}

                      {order.status === 'assigned' && (
                        <p className="text-gray-500 text-center">
                          Waiting for {order.assignedTo?.name || 'deliveryman'} to start…
                        </p>
                      )}

                      {(order.status === 'pending' || order.status === 'assigned') && (
                        <button
                          onClick={() => updateStatus(order._id, 'cancelled')}
                          className="mt-2 bg-red-600 text-white px-4 py-3 rounded-xl hover:bg-red-700 transition"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
