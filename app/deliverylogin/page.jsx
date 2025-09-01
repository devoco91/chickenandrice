"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Lock, Mail, Truck, Eye, EyeOff } from 'lucide-react';

const DeliveryLoginPage = () => {
  const router = useRouter();

  // form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // ui
  const [isLoading, setIsLoading] = useState(false);
  const [savedEmails, setSavedEmails] = useState([]);
  const [banner, setBanner] = useState(null); // { type: 'success'|'error'|'info', text: string }

  // Load saved emails on mount
  useEffect(() => {
    try {
      const emails = JSON.parse(localStorage.getItem("savedEmails") || "[]");
      if (Array.isArray(emails)) setSavedEmails(emails);
    } catch {}
  }, []);

  // Auto-dismiss banners
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  const validate = () => {
    if (!email || !password) {
      setBanner({ type: 'error', text: 'Please fill in all fields.' });
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setBanner({ type: 'error', text: 'Please enter a valid email address.' });
      return false;
    }
    if (password.length < 4) {
      setBanner({ type: 'error', text: 'Password is too short.' });
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      setIsLoading(true);
      setBanner(null);

      // Choose endpoint by email hint (kept from your logic)
      const isAdmin = email.includes("admin") || email.endsWith("@admin.com");
      const endpoint = isAdmin ? "/api/admin/login" : "/api/delivery/login";

      const res = await axios.post(endpoint, { email, password });
      const token = res.data && res.data.token;
      const role  = res.data && res.data.user && res.data.user.role;

      if (!token || !role) throw new Error("Login response missing token or role");

      // Save token (cookie + localStorage)
      Cookies.set("token", token, { expires: 7 });
      localStorage.setItem("token", token);

      // Save email only if "remember me"
      if (rememberMe) {
        try {
          let emails = JSON.parse(localStorage.getItem("savedEmails") || "[]");
          if (!Array.isArray(emails)) emails = [];
          if (!emails.includes(email)) {
            emails.push(email);
            localStorage.setItem("savedEmails", JSON.stringify(emails));
            setSavedEmails(emails);
          }
        } catch {}
      }

      setBanner({ type: 'success', text: 'Login successful. Redirecting…' });

      // Redirect by role
      if (role === "admin") {
        router.push("/dispatchCenter");
      } else if (role === "deliveryman") {
        router.push("/deliverydashboard");
      } else {
        throw new Error("Unknown role: " + role);
      }

    } catch (err) {
      console.error("❌ Login error:", err);
      const msg =
        (err && err.response && (err.response.data?.message || err.response.data?.error)) ||
        err?.message ||
        "Login failed";
      setBanner({ type: 'error', text: msg });
      alert(msg); // keep your original alert behavior
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Truck className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Sign in to access your dashboard</p>
        </div>

        {/* Banner */}
        {banner && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-4 p-3 rounded-lg text-sm ${
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

        <form
          autoComplete="off"
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          {/* Email Input with saved emails */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                list="email-options"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your email"
              />
              <datalist id="email-options">
                {savedEmails.map((savedEmail, index) => (
                  <option key={index} value={savedEmail} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Remember Me + Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Remember me</span>
            </label>
            <div className="text-sm">
              <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                Forgot password?
              </a>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Sign Up Link */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <a href="/signup" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
              Sign up here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeliveryLoginPage;
