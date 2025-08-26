// app/delivery-dashboard/page-part1.jsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Package, Clock, MapPin, Phone, User, Truck,
  DollarSign, BarChart, BellRing
} from 'lucide-react';

// --- Tabs Implementation ---
function Tabs({ defaultValue, children, className }) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  const tabs = [];
  const content = [];

  React.Children.forEach(children, (child) => {
    if (child.type === TabsList) {
      tabs.push(
        React.Children.map(child.props.children, (trigger) =>
          React.cloneElement(trigger, {
            active: activeTab === trigger.props.value,
            onClick: () => setActiveTab(trigger.props.value),
          })
        )
      );
    }
    if (child.type === TabsContent) {
      content.push(activeTab === child.props.value ? child.props.children : null);
    }
  });

  return (
    <div className={className}>
      <div className="flex gap-2">{tabs}</div>
      <div>{content}</div>
    </div>
  );
}
function TabsList({ children, className = '' }) {
  return <div className={`flex gap-2 ${className}`}>{children}</div>;
}
function TabsTrigger({ value, children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl font-medium transition ${
        active ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}
function TabsContent({ value, children }) {
  return <div className="mt-4">{children}</div>;
}

// --- Main Delivery Dashboard ---
const API_BASE = '/api';
const NOTIFICATION_ICON = '/favicon.ico';
const DASHBOARD_PATH = '/dashboard';

export default function DeliveryDashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);

  // Notifications & sound states
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [soundReady, setSoundReady] = useState(false);
  const [showSoundPrompt, setShowSoundPrompt] = useState(false);

  const audioRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const initialLoadRef = useRef(true);

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  const getAuthHeaders = (token) => ({ Authorization: `Bearer ${token}` });

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

  // Initialize audio + ask notification permission
  useEffect(() => {
    if (typeof window === 'undefined') return;
    audioRef.current = new Audio('/sound/notification.wav');
    audioRef.current.preload = 'auto';
    audioRef.current.volume = 1.0;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => setNotificationPermission(perm));
    } else if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const fetchDeliveries = async () => {
    try {
      const token = getToken();
      if (!token) throw new Error('No auth token found');
      const data = await safeFetch(`${API_BASE}/orders/assigned`, {
        headers: getAuthHeaders(token),
      });
      const list = Array.isArray(data.orders) ? data.orders : [];
      if (initialLoadRef.current) {
        list.forEach((o) => seenIdsRef.current.add(o._id));
        initialLoadRef.current = false;
      } else {
        const newOnes = list.filter((o) => !seenIdsRef.current.has(o._id));
        if (newOnes.length > 0) {
          newOnes.forEach((o) => {
            const status = (o.status || '').toLowerCase();
            if (status === 'assigned' || status === 'pending') notifyNewAssignment(o);
            seenIdsRef.current.add(o._id);
          });
        }
      }
      setDeliveries(list);
    } catch (err) {
      setError(err.message || 'Failed to fetch deliveries');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = getToken();
      if (!token) throw new Error('No auth token found');
      const data = await safeFetch(`${API_BASE}/delivery/profile`, {
        headers: getAuthHeaders(token),
      });
      setProfile(data);
    } catch {
      setProfile(null);
    }
  };

  // ✅ Real orders now behave like test orders
  const updateStatus = async (orderId, status) => {
    try {
      setDeliveries((prev) => prev.map((o) => (o._id === orderId ? { ...o, status } : o)));
      if (String(orderId).startsWith('test-')) return;
      const updated = await safeFetch(`${API_BASE}/orders/${orderId}`, {
        method: 'PUT',
        headers: getAuthHeaders(getToken()),
        body: JSON.stringify({ status }),
      });
      if (updated && updated._id) {
        setDeliveries((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
      }
    } catch (err) {
      alert(err.message || 'Failed to update order');
    }
  };

  // --- Core notifier ---
  const notifyNewAssignment = (order) => {
    const tryPlay = async () => {
      try {
        if (audioRef.current) {
          await audioRef.current.play();
          if (!soundReady) setSoundReady(true);
        }
      } catch {
        setShowSoundPrompt(true);
      }
    };
    tryPlay();

    // 📳 Vibrate on new delivery (mobile only)
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]); // buzz → pause → buzz
    }

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        const n = new Notification('📦 New Delivery Assigned!', {
          body: `${order.customerName || 'Customer'} — ₦${Number(order.total || 0).toLocaleString()}`,
          icon: NOTIFICATION_ICON,
          tag: order._id,
        });
        n.onclick = (ev) => {
          ev.preventDefault();
          window.focus();
          window.location.assign(DASHBOARD_PATH);
          n.close();
        };
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((perm) => setNotificationPermission(perm));
      }
    }
  };

  const testNotification = () => {
    const fakeOrder = {
      _id: 'test-' + Date.now(),
      customerName: 'John Doe',
      phone: '08012345678',
      houseNumber: '12B',
      street: 'Testing Street',
      paymentMode: 'Cash on Delivery',
      total: 5000,
      status: 'assigned',
      createdAt: new Date().toISOString(),
      assignedTo: profile?._id,
      isTest: true,
    };
    seenIdsRef.current.add(fakeOrder._id);
    notifyNewAssignment(fakeOrder);
    setDeliveries((prev) => [fakeOrder, ...prev]);
  };

  useEffect(() => {
    fetchDeliveries();
    fetchProfile();
    const interval = setInterval(fetchDeliveries, 10000);
    return () => clearInterval(interval);
  }, []);

  const askNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
  };
  const unlockSound = async () => {
    try {
      if (!audioRef.current) return;
      await audioRef.current.play();
      audioRef.current.pause();
      setSoundReady(true);
      setShowSoundPrompt(false);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="text-center mb-8 flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-3 bg-white px-8 py-4 rounded-2xl shadow-lg">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Delivery Dashboard
            </h1>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* ✅ Test button hidden in production */}
            {process.env.NODE_ENV !== 'production' && (
              <button
                onClick={testNotification}
                className="bg-yellow-400 text-yellow-900 px-4 py-2 rounded-xl font-bold hover:bg-yellow-500 shadow"
              >
                🧪 Test Notification
              </button>
            )}
            {'Notification' in globalThis && notificationPermission !== 'granted' && (
              <button
                onClick={askNotificationPermission}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
              >
                <BellRing className="w-4 h-4" /> Enable Browser Notifications
              </button>
            )}
            {showSoundPrompt && (
              <button
                onClick={unlockSound}
                className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700"
              >
                🔊 Enable Sound
              </button>
            )}
          </div>
        </div>

        {/* === TABS === */}
        <Tabs defaultValue="deliveries">
          <TabsList>
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries">
            {loading ? (
              <p>Loading deliveries...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : deliveries.length === 0 ? (
              <p>No deliveries yet</p>
            ) : (
              <div className="grid gap-4">
                {deliveries.map((o) => (
                  <div key={o._id} className="bg-white rounded-xl p-4 shadow">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-bold">{o.customerName}</p>
                        <p className="text-sm text-gray-500">
                          {o.houseNumber} {o.street}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-600 font-bold">₦{Number(o.total).toLocaleString()}</p>
                        <p className="text-sm">{o.status}</p>
                      </div>
                    </div>

                    {/* Buttons depending on status */}
                    {o.status === 'assigned' && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => updateStatus(o._id, 'accepted')}
                          className="bg-green-500 text-white px-3 py-1 rounded-lg"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => updateStatus(o._id, 'declined')}
                          className="bg-red-500 text-white px-3 py-1 rounded-lg"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {o.status === 'accepted' && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => updateStatus(o._id, 'in-transit')}
                          className="bg-blue-500 text-white px-3 py-1 rounded-lg"
                        >
                          Start Delivery
                        </button>
                      </div>
                    )}
                    {o.status === 'in-transit' && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() =>
                            window.open(`https://maps.google.com/?q=${o.street}`, '_blank')
                          }
                          className="bg-gray-500 text-white px-3 py-1 rounded-lg"
                        >
                          Navigate
                        </button>
                        <button
                          onClick={() => updateStatus(o._id, 'delivered')}
                          className="bg-green-700 text-white px-3 py-1 rounded-lg"
                        >
                          Mark as Delivered
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings">
            <div className="bg-white p-4 rounded-xl shadow flex items-center gap-4">
              <DollarSign className="text-green-600 w-6 h-6" />
              <div>
                <p className="text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold">₦{profile?.earnings || 0}</p>
              </div>
            </div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            {profile ? (
              <div className="bg-white p-4 rounded-xl shadow">
                <p className="font-bold">{profile.name}</p>
                <p>{profile.email}</p>
              </div>
            ) : (
              <p>No profile data</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
