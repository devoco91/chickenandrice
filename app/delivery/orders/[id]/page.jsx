// app/delivery/orders/[id]/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Package, MapPin, Phone, User, Clock, Truck, CheckCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE = '/api';

export default function OrderDetailsPage() {
  const { id } = useParams(); // ✅ Grab order ID from URL
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const getToken = () =>
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

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
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const fetchOrder = async () => {
    if (!id) return;
    try {
      const data = await safeFetch(`${API_BASE}/orders/${id}`, {
        headers: authHeaders(),
      });
      setOrder(data);
    } catch (err) {
      console.error('❌ Failed to fetch order:', err);
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status) => {
    if (!id) return;
    try {
      setUpdating(true);
      const updated = await safeFetch(`${API_BASE}/orders/${id}`, {
        method: 'PUT',
        headers: { ...authHeaders() },
        body: JSON.stringify({ status }),
      });
      setOrder(updated);
      toast.success(`Order marked as ${status.replace('-', ' ')} ✅`);
    } catch (err) {
      console.error('❌ Failed to update status:', err);
      toast.error("Failed to update order status");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  if (loading) return <p className="p-6">Loading order...</p>;
  if (!order) return <p className="p-6 text-red-600">Order not found</p>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Toaster position="top-right" />

      <div className="max-w-3xl mx-auto bg-white shadow rounded-2xl p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-4">
          <Package className="w-6 h-6 text-blue-600" />
          Order #{order._id}
        </h1>

        <div className="space-y-6">
          {/* Customer Details */}
          <div>
            <h2 className="font-semibold flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-blue-600" />
              Customer
            </h2>
            <p><strong>Name:</strong> {order.customerName}</p>
            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-600" />
              {order.phone}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-600" />
              {order.houseNumber}, {order.street}
            </p>
            {order.landmark && <p>Landmark: {order.landmark}</p>}
          </div>

          {/* Order Details */}
          <div>
            <h2 className="font-semibold flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Details
            </h2>
            <p><strong>Status:</strong> {order.status}</p>
            <p><strong>Payment Mode:</strong> {order.paymentMode}</p>
            <p><strong>Amount:</strong> ₦{Number(order.total || 0).toLocaleString()}</p>
            {order.assignedTo && (
              <p><strong>Assigned To:</strong> {order.assignedTo?.name || 'N/A'}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-6">
            {order.status === 'assigned' && (
              <button
                onClick={() => updateStatus('in-transit')}
                disabled={updating}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                <Truck className="w-5 h-5" />
                {updating ? 'Updating...' : 'Start Delivery'}
              </button>
            )}
            {order.status === 'in-transit' && (
              <button
                onClick={() => updateStatus('delivered')}
                disabled={updating}
                className="flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl hover:bg-green-700 transition disabled:bg-gray-400"
              >
                <CheckCircle className="w-5 h-5" />
                {updating ? 'Updating...' : 'Mark as Delivered'}
              </button>
            )}
            {order.status === 'delivered' && (
              <button
                disabled
                className="flex items-center gap-2 bg-gray-400 text-white px-5 py-3 rounded-xl cursor-not-allowed"
              >
                <CheckCircle className="w-5 h-5" />
                Delivered
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
