'use client';
import { useEffect, useState } from 'react';
import {
  MapPin, Phone, Clock, Package, User,
  Navigation, Truck
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function DeliveryCenter() {
  const [orders, setOrders] = useState([]);
  const [deliverymen, setDeliverymen] = useState([]);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [assigningId, setAssigningId] = useState(null);
  const [selectedDeliveryman, setSelectedDeliveryman] = useState('');

  useEffect(() => {
    fetchOrders();
    fetchDeliverymen();

    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  
  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/orders`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      } else {
        console.error('Failed to fetch orders');
      }
    } catch (err) {
      console.error('❌ Error fetching orders:', err);
    }
  };

  const fetchDeliverymen = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/deliverymen?online=true`);
      if (res.ok) {
        const data = await res.json();
        setDeliverymen(data);
      } else {
        console.error('Failed to fetch deliverymen');
      }
    } catch (err) {
      console.error('❌ Error fetching deliverymen:', err);
    }
  };


  const handleAssignClick = (orderId) => {
    setAssigningId(orderId);
    setSelectedDeliveryman('');
    fetchDeliverymen();
  };


  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setOrders(prev => prev.map(ord => ord._id === id ? { ...ord, status } : ord));
    } catch (err) {
      console.error('❌ Error updating status:', err);
    }
  };


  const updateDeliveryman = async (id, deliverymanId) => {
    if (!deliverymanId) {
      alert('Please select a deliveryman');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: deliverymanId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign deliveryman');
      setOrders(prev => prev.map(ord => ord._id === id ? data : ord));
      setAssigningId(null);
      setSelectedDeliveryman('');
    } catch (err) {
      alert('❌ Error assigning deliveryman: ' + err.message);
      console.error(err);
    }
  };

  const filteredOrders = orders.filter(order => order.status === filterStatus);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
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

        {/* Status Filters */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white rounded-2xl p-2 shadow-lg">
            {['pending', 'in-transit', 'delivered', 'cancelled'].map(status => (
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

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Orders Found</h3>
            <p className="text-gray-500">{`No ${filterStatus.replace('-', ' ')} orders at the moment`}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map(order => (
              <div key={order._id} className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition duration-300 overflow-hidden">
                {/* Order Header */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-8 py-6 border-b">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Package className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="text-gray-600 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {new Date(order.createdAt).toLocaleDateString('en-GB')} at{' '}
                        {new Date(order.createdAt).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div
                      className={`px-6 py-3 rounded-2xl font-semibold text-sm ${
                        order.status === 'pending'
                          ? 'bg-blue-100 text-blue-700'
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

                {/* Order Details */}
                <div className="p-8">
                  <div className="grid lg:grid-cols-3 gap-8">
                    {/* Customer Info */}
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
                          <span>
                            {order.houseNumber}, {order.street}
                          </span>
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
                        <p><strong>Amount:</strong> ₹{order.total}</p>
                        {order.assignedTo && (
                          <p><strong>Deliveryman:</strong> {order.assignedTo.name || 'N/A'}</p>
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
                                onChange={e => setSelectedDeliveryman(e.target.value)}
                                className="mb-4 p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Select Deliveryman</option>
                                {deliverymen.length > 0 ? (
                                  deliverymen.map(dm => (
                                    <option key={dm._id} value={dm._id}>
                                      {dm.name} {dm.isOnline ? '(Online)' : '(Offline)'}
                                    </option>
                                  ))
                                ) : (
                                  <option value="" disabled>No online deliverymen available</option>
                                )}
                              </select>
                              <button
                                onClick={() => updateDeliveryman(order._id, selectedDeliveryman)}
                                disabled={!selectedDeliveryman || deliverymen.length === 0}
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

                      {order.status === 'in-transit' && (
                        <button
                          onClick={() => updateStatus(order._id, 'delivered')}
                          className="bg-green-600 text-white px-4 py-3 rounded-xl hover:bg-green-700 transition"
                        >
                          Mark as Delivered
                        </button>
                      )}

                      {(order.status === 'pending' || order.status === 'in-transit') && (
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