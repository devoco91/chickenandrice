"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function DeliverySignup() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    address: "",
    dateOfBirth: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.name || !form.email || !form.phone || !form.password || !form.address) {
      alert("Please fill in all required fields.");
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      alert("Please enter a valid email address.");
      return false;
    }
    if (form.password.length < 4) {
      alert("Password is too short.");
      return false;
    }
    return true;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const url = `/api/delivery/signup?ts=${Date.now()}`; // bust proxy/CDN cache
      const res = await axios.post(url, form, {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        validateStatus: () => true, // handle status manually
      });

      if (res.status < 200 || res.status >= 300) {
        const body = typeof res.data === "string" ? res.data : JSON.stringify(res.data || {});
        throw new Error(`Signup failed (${res.status}) ${res.statusText || ""} ${body?.slice?.(0,140) || ""}`);
      }

      // Normalize data if backend mislabels content-type
      let data = res.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch {}
      }

      alert("Signup successful!");
      router.push("/deliverylogin");
    } catch (err) {
      console.error("Signup error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message ||
        "Signup failed";
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow rounded-2xl">
      <h1 className="text-xl font-bold mb-4">Deliveryman Signup</h1>
      <form onSubmit={handleSignup} className="space-y-3" autoComplete="off">
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="text"
          name="phone"
          placeholder="Phone Number"
          value={form.phone}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="text"
          name="address"
          placeholder="Address"
          value={form.address}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="date"
          name="dateOfBirth"
          value={form.dateOfBirth}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? "Signing up..." : "Signup"}
        </button>
      </form>
    </div>
  );
}
