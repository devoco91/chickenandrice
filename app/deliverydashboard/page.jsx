'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle } from 'lucide-react';

const API_BASE = '/api';
const NOTIFICATION_ICON = '/favicon.ico';
const DASHBOARD_PATH = '/deliverydashboard';
const LOGOUT_REDIRECT = '/deliverylogin'; // fallback handled in logout()

// --- Tabs ---
function Tabs({ defaultValue, children }) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <div>
      <div className="flex gap-2">
        {React.Children.map(children, (child) =>
          child.type === TabsList
            ? React.cloneElement(child, { activeTab, setActiveTab })
            : null
        )}
      </div>
      {React.Children.map(children, (child) =>
        child.type === TabsContent && child.props.value === activeTab
          ? child.props.children
          : null
      )}
    </div>
  );
}
function TabsList({ children, activeTab, setActiveTab }) {
  return (
    <div className="flex gap-2">
      {React.Children.map(children, (child) =>
        React.cloneElement(child, {
          active: activeTab === child.props.value,
          onClick: () => setActiveTab(child.props.value),
        })
      )}
    </div>
  );
}
function TabsTrigger({ value, children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
      }`}
    >
      {children}
    </button>
  );
}
function TabsContent({ children }) {
  return <div className="mt-4">{children}</div>;
}

export default function DeliveryDashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState(null);

  const [banner, setBanner] = useState(null); // { type: 'success'|'error'|'info', text: string }
  const [notifPermission, setNotifPermission] = useState(null); // 'granted' | 'denied' | 'default' | null

  const audioRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const initialLoadRef = useRef(true);

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  const getAuthHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

  const safeFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  // === FETCH ORDERS ===
  const fetchDeliveries = async () => {
    const token = getToken();
    const data = await safeFetch(`${API_BASE}/delivery/orders/assigned`, {
      headers: getAuthHeaders(token),
    });
    const list = Array.isArray(data) ? data : data.orders || [];
    const onlyOnline = list.filter((o) => o.orderType === 'online'); // ✅ filter online orders only

    if (initialLoadRef.current) {
      onlyOnline.forEach((o) => seenIdsRef.current.add(o._id));
      initialLoadRef.current = false;
    } else {
      const newOnes = onlyOnline.filter((o) => !seenIdsRef.current.has(o._id));
      newOnes.forEach((o) => notifyNewAssignment(o));
      newOnes.forEach((o) => seenIdsRef.current.add(o._id));
    }
    setDeliveries(onlyOnline.filter((o) => o.status !== 'delivered'));
    setHistory(onlyOnline.filter((o) => o.status === 'delivered'));
  };

  // === FETCH PROFILE ===
  const fetchProfile = async () => {
    try {
      const token = getToken();
      const data = await safeFetch(`${API_BASE}/delivery/profile`, {
        headers: getAuthHeaders(token),
      });
      setProfile(data);
    } catch {
      setProfile(null);
    }
  };

  // === ORDER ACTIONS ===
  const callAction = async (orderId, action) => {
    try {
      const updated = await safeFetch(`${API_BASE}/delivery/orders/${orderId}/${action}`, {
        method: 'POST',
        headers: getAuthHeaders(getToken()),
      });

      // Update active list
      setDeliveries((prev) =>
        prev.map((o) => (o._id === orderId ? updated : o)).filter((o) => o.status !== 'delivered')
      );

      // Push to history if delivered
      if (updated.status === 'delivered') {
        setHistory((prev) => [updated, ...prev]);
        // Success banner
        setBanner({
          type: 'success',
          text: `Order delivered to ${updated.customerName || 'customer'} (₦${updated.total}).`,
        });
        // System notification (optional)
        notifyDelivered(updated);
        // Haptic
        if ('vibrate' in navigator) navigator.vibrate([120, 60, 120]);
      }
    } catch (e) {
      setBanner({ type: 'error', text: `Action failed: ${e.message || e}` });
    }
  };

  // === NOTIFICATIONS ===
  const notifyNewAssignment = (order) => {
    try {
      if (audioRef.current) audioRef.current.play();
    } catch {}
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const n = new Notification('📦 New Order Assigned!', {
        body: `${order.customerName || 'Customer'} — ₦${order.total}`,
        icon: NOTIFICATION_ICON,
        tag: order._id,
      });
      n.onclick = () => {
        window.focus();
        window.location.assign(DASHBOARD_PATH);
        n.close();
      };
    }
  };

  const notifyDelivered = (order) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const n = new Notification('✅ Order Delivered', {
        body: `${order.customerName || 'Customer'} — ₦${order.total}`,
        icon: NOTIFICATION_ICON,
        tag: `delivered-${order._id}`,
      });
      n.onclick = () => {
        window.focus();
        window.location.assign(DASHBOARD_PATH);
        n.close();
      };
    }
  };

  const requestNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        setBanner({ type: 'success', text: 'Notifications enabled.' });
      } else if (perm === 'denied') {
        setBanner({ type: 'error', text: 'Notifications blocked in browser settings.' });
      }
    } catch {
      // ignore
    }
  };

  // === LOGOUT ===
  const logout = () => {
    try {
      localStorage.removeItem('token');
    } catch {}
    // best-effort redirect
    if (typeof window !== 'undefined') {
      window.location.assign(LOGOUT_REDIRECT || '/');
    }
  };

  useEffect(() => {
    audioRef.current = new Audio('/sound/notification.wav');
    audioRef.current.preload = 'auto';
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
    fetchDeliveries();
    fetchProfile();
    const interval = setInterval(fetchDeliveries, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss banner
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Top bar: Title + actions */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Deliveryman Dashboard</h1>
          <div className="flex items-center gap-2">
            {typeof window !== 'undefined' && 'Notification' in window && notifPermission !== 'granted' && (
              <button
                onClick={requestNotifications}
                className="px-3 py-2 rounded-xl bg-yellow-500 text-white hover:opacity-95"
              >
                Enable Notifications
              </button>
            )}
            <button
              onClick={logout}
              className="px-3 py-2 rounded-xl bg-gray-800 text-white hover:opacity-95"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Banner */}
        {banner && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-4 p-3 rounded-xl shadow ${
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

        <Tabs defaultValue="deliveries">
          <TabsList>
            <TabsTrigger value="deliveries">Active Deliveries</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Active Deliveries */}
          <TabsContent value="deliveries">
            <div className="grid gap-4">
              {deliveries.map((o) => (
                <div key={o._id} className="bg-white p-4 rounded-xl shadow">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-bold">{o.customerName}</p>
                      <p className="text-sm">
                        {o.houseNumber} {o.street}
                      </p>
                      <p className="text-sm">{o.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-600 font-bold">₦{o.total}</p>
                      <p className="text-sm">{o.status}</p>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  {o.status === 'assigned' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => callAction(o._id, 'accept')}
                        className="bg-green-500 text-white px-3 py-1 rounded"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => callAction(o._id, 'decline')}
                        className="bg-red-500 text-white px-3 py-1 rounded"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {/* After Accept → Start Delivery */}
                  {o.status === 'accepted' && (
                    <div className="mt-3">
                      <button
                        onClick={() => callAction(o._id, 'in-transit')}
                        className="bg-blue-500 text-white px-3 py-1 rounded"
                      >
                        Start Delivery
                      </button>
                    </div>
                  )}

                  {/* After Start Delivery → Navigate + Delivered */}
                  {o.status === 'in-transit' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          const addr = [o.houseNumber, o.street, o.landmark].filter(Boolean).join(' ');
                          const url = `https://maps.google.com/?q=${encodeURIComponent(addr)}`;
                          window.open(url, '_blank');
                        }}
                        className="bg-gray-500 text-white px-3 py-1 rounded"
                      >
                        Navigate
                      </button>
                      <button
                        onClick={() => callAction(o._id, 'deliver')}
                        className="bg-green-700 text-white px-3 py-1 rounded"
                      >
                        Mark as Delivered
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            {history.length === 0 ? (
              <p>No completed deliveries yet</p>
            ) : (
              <div className="grid gap-4">
                {history.map((o) => (
                  <div key={o._id} className="bg-white p-4 rounded-xl shadow flex justify-between">
                    <div>
                      <p className="font-bold">{o.customerName}</p>
                      <p className="text-sm">
                        {o.houseNumber} {o.street}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" /> Delivered
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Profile */}
          <TabsContent value="profile">
            {profile ? (
              <div className="bg-white p-4 rounded-xl shadow">
                <p className="font-bold">{profile.name}</p>
                <p>{profile.email}</p>
                <p>{profile.phone}</p>
                <p>{profile.address}</p>
                {profile.dateOfBirth && (
                  <p>DOB: {new Date(profile.dateOfBirth).toLocaleDateString()}</p>
                )}
                <p>Status: {profile.isOnline ? '🟢 Online' : '🔴 Offline'}</p>
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
