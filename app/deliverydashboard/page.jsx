'use client';

// File: app/delivery-dashboard/DeliveryDashboard.jsx

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck,
  Package,
  MapPin,
  DollarSign,
  Star,
  Bell,
  User,
  Menu,
  X,
  Phone,
  Navigation,
  CheckCircle,
  AlertCircle,
  Calendar,
  TrendingUp,
  LogOut,
  Settings as SettingsIcon,
} from 'lucide-react';

// Use relative API path so Next.js rewrites send to the correct backend in dev/prod
const API_BASE = '/api';

export default function DeliveryDashboard() {
  const router = useRouter();

  // UI state
  const [activeTab, setActiveTab] = useState('overview'); // overview | deliveries | earnings | settings
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data state
  const [userInfo, setUserInfo] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    completedToday: 0,
    totalEarnings: 0,
    rating: 0,
    pendingDeliveries: 0,
    monthlyEarnings: 0,
  });

  /* ----------------------------- helpers ----------------------------- */
  const getAuthHeaders = (token) => ({ Authorization: `Bearer ${token}` });

  const ngn = (amount) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(
      Number(amount || 0)
    );

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-transit':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Wrap fetch to handle 401 → redirect
  const safeFetch = async (url, opts = {}) => {
    const res = await fetch(url, opts);
    if (res.status === 401) {
      // token expired/invalid → clear and redirect
      localStorage.removeItem('token');
      router.push('/logindeliverymen');
      throw new Error('Unauthorized');
    }
    if (!res.ok) {
      const msg = (await res.text()) || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    // try json, fallback to empty
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return {};
  };

  /* ------------------------------ effects ---------------------------- */
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/logindeliverymen');
          return;
        }

        const [userData, deliveriesData, statsData] = await Promise.all([
          safeFetch(`${API_BASE}/delivery/dashboard`, { headers: getAuthHeaders(token) }),
          safeFetch(`${API_BASE}/delivery/deliveries`, { headers: getAuthHeaders(token) }),
          safeFetch(`${API_BASE}/delivery/stats`, { headers: getAuthHeaders(token) }),
        ]);

        if (!mounted) return;
        setUserInfo(userData?.deliveryman || null);
        setDeliveries(deliveriesData?.deliveries || []);
        setStats({
          totalDeliveries: Number(statsData?.totalDeliveries || 0),
          completedToday: Number(statsData?.completedToday || 0),
          totalEarnings: Number(statsData?.totalEarnings || 0),
          rating: Number(statsData?.rating || 0),
          pendingDeliveries: Number(statsData?.pendingDeliveries || 0),
          monthlyEarnings: Number(statsData?.monthlyEarnings || 0),
        });
      } catch (err) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [router]);

  /* ------------------------------ actions ---------------------------- */
  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/logindeliverymen');
  };

  const updateDeliveryStatus = async (id, newStatus) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // optimistic update (why: UX responsiveness)
    const prev = deliveries;
    const next = deliveries.map((d) => (d.id === id ? { ...d, status: newStatus } : d));
    setDeliveries(next);

    try {
      await safeFetch(`${API_BASE}/delivery/deliveries/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ status: newStatus }),
      });
      // refresh lightweight stats that may depend on completed count/earnings
      try {
        const s = await safeFetch(`${API_BASE}/delivery/stats`, { headers: getAuthHeaders(token) });
        setStats((old) => ({
          ...old,
          totalDeliveries: Number(s?.totalDeliveries ?? old.totalDeliveries),
          completedToday: Number(s?.completedToday ?? old.completedToday),
          totalEarnings: Number(s?.totalEarnings ?? old.totalEarnings),
          pendingDeliveries: Number(s?.pendingDeliveries ?? old.pendingDeliveries),
          monthlyEarnings: Number(s?.monthlyEarnings ?? old.monthlyEarnings),
        }));
      } catch (_) {}
    } catch (err) {
      setDeliveries(prev); // rollback on error
      alert(err.message || 'Failed to update delivery status');
    }
  };

  /* ------------------------------- UI -------------------------------- */
  const Sidebar = () => (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
    >
      <div className="flex items-center justify-between h-16 px-6 bg-blue-600">
        <div className="flex items-center">
          <Truck className="text-white w-8 h-8 mr-2" />
          <span className="text-white font-bold text-lg">DeliveryHub</span>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white hover:text-gray-200">
          <X className="w-6 h-6" />
        </button>
      </div>

      <nav className="mt-8 px-4">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'deliveries', label: 'Deliveries', icon: Package },
          { id: 'earnings', label: 'Earnings', icon: DollarSign },
          { id: 'settings', label: 'Settings', icon: SettingsIcon },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center px-4 py-3 mb-2 rounded-lg text-left transition-colors ${
              activeTab === id ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-5 h-5 mr-3" />
            {label}
          </button>
        ))}
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </div>
  );

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Deliveries', value: stats.totalDeliveries, icon: Package, color: 'blue' },
          { label: "Today's Deliveries", value: stats.completedToday, icon: CheckCircle, color: 'green' },
          { label: "Today's Earnings", value: ngn(stats.totalEarnings), icon: DollarSign, color: 'yellow' },
          { label: 'Rating', value: stats.rating, icon: Star, color: 'purple' },
        ].map(({ label, value, icon: Icon, color }, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{String(value)}</p>
              </div>
              <div className={`p-3 rounded-full bg-${color}-100`}>
                <Icon className={`w-6 h-6 text-${color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions (placeholder) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
            <Navigation className="w-5 h-5 text-blue-600 mr-2" />
            Start Navigation
          </button>
          <button className="flex items-center justify-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            Mark as Delivered
          </button>
          <button className="flex items-center justify-center p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
            Report Issue
          </button>
        </div>
      </div>

      {/* Recent Deliveries */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Deliveries</h3>
        <div className="space-y-4">
          {(deliveries || []).slice(0, 3).map((delivery) => (
            <div key={delivery.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Package className="w-8 h-8 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{delivery.customer}</p>
                  <p className="text-sm text-gray-600">{delivery.address}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                  {delivery.status}
                </span>
                <span className="text-sm font-medium text-gray-900">{ngn(delivery.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const DeliveriesTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Active Deliveries</h3>
          <span className="text-sm text-gray-600">{deliveries.length} total deliveries</span>
        </div>

        <div className="space-y-4">
          {(deliveries || []).map((delivery) => (
            <div key={delivery.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h4 className="font-semibold text-gray-900 mr-2">{delivery.customer}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                      {delivery.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {delivery.address}
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-1" />
                      {delivery.phone}
                    </div>
                    <div className="flex items-center">
                      <Package className="w-4 h-4 mr-1" />
                      {delivery.items}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">{ngn(delivery.amount)}</div>
                  <div className="text-sm text-gray-500">{delivery.distance} • {delivery.time}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex space-x-2">
                  {delivery.status === 'pending' && (
                    <button
                      onClick={() => updateDeliveryStatus(delivery.id, 'in-transit')}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Start Delivery
                    </button>
                  )}
                  {delivery.status === 'in-transit' && (
                    <button
                      onClick={() => updateDeliveryStatus(delivery.id, 'completed')}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Mark Complete
                    </button>
                  )}
                  <button className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                    <Phone className="w-4 h-4" />
                  </button>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      delivery.address || ''
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Navigation className="w-4 h-4 inline" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const EarningsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Today's Earnings</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{ngn(stats.totalEarnings)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">This Week</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{ngn(Number(stats.totalEarnings) * 5)}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">This Month</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{ngn(stats.monthlyEarnings)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          {(deliveries || [])
            .filter((d) => d.status === 'completed')
            .map((delivery) => (
              <div key={delivery.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{delivery.customer}</p>
                    <p className="text-sm text-gray-600">{delivery.time}</p>
                  </div>
                </div>
                <span className="text-green-600 font-semibold">+{ngn(delivery.amount)}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const SettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Profile & Preferences</h3>
        {userInfo ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl font-bold">{userInfo?.name?.[0]?.toUpperCase() || 'U'}</span>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{userInfo?.name}</p>
                <p className="text-gray-600">Delivery Rider</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={userInfo?.email || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />

              <label className="block text-sm font-medium text-gray-700 mt-4">Phone</label>
              <input
                type="tel"
                value={userInfo?.phone || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea
                value={userInfo?.address || ''}
                readOnly
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
              <div>
                <p className="font-medium text-gray-900">Notifications</p>
                <p className="text-sm text-gray-600">Get alerts for new deliveries and status changes</p>
              </div>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => alert('Notifications preference saved')}
              >
                Enable
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading profile...</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'deliveries':
        return <DeliveriesTab />;
      case 'earnings':
        return <EarningsTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden mr-4 text-gray-600 hover:text-gray-900">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h1>
                <p className="text-gray-600">Welcome back, {userInfo?.name?.split(' ')[0] || 'User'}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-6 h-6" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">{userInfo?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading dashboard...</p>
                {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
              </div>
            </div>
          ) : (
            renderTabContent()
          )}
        </main>
      </div>
    </div>
  );
}
