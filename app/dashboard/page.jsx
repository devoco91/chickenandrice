'use client';
import { useState, useEffect } from "react";

const API_BASE = "http://localhost:5000"; 

export default function AdminDashboard() {
  const [foods, setFoods] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "Main",
    isAvailable: true,
    image: ""
  });
  const [editingFoodId, setEditingFoodId] = useState(null);

  // Fetch foods
  const fetchFoods = async () => {
    const res = await fetch(`${API_BASE}/api/foods`);
    const data = await res.json();
    setFoods(data);
  };

  // Fetch orders
  const fetchOrders = async () => {
    const res = await fetch(`${API_BASE}/api/orders`);
    const data = await res.json();
    setOrders(data);
  };

  useEffect(() => {
    fetchFoods();
    fetchOrders();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingFoodId
      ? `${API_BASE}/api/foods/${editingFoodId}`
      : `${API_BASE}/api/foods`;

    await fetch(url, {
      method: editingFoodId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setForm({
      name: "",
      description: "",
      price: "",
      category: "Main",
      isAvailable: true,
      image: ""
    });
    setEditingFoodId(null);
    fetchFoods();
  };

  const handleEdit = (food) => {
    setForm({
      name: food.name,
      description: food.description || "",
      price: food.price,
      category: food.category,
      isAvailable: food.isAvailable,
      image: food.image || ""
    });
    setEditingFoodId(food._id);
  };

  const handleDeleteFood = async (id) => {
    if (!confirm("Are you sure you want to delete this food?")) return;
    await fetch(`${API_BASE}/api/foods/${id}`, { method: "DELETE" });
    fetchFoods();
  };

  const updateOrderStatus = async (id, newStatus) => {
    await fetch(`${API_BASE}/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchOrders();
  };

  const deleteOrder = async (id) => {
    if (!confirm("Delete this order?")) return;
    await fetch(`${API_BASE}/api/orders/${id}`, { method: "DELETE" });
    fetchOrders();
  };

  return (
    <div className="min-h-screen bg-red-50 p-8 text-gray-900">
      <h1 className="text-4xl font-bold mb-6 text-red-700">Admin Dashboard</h1>

      {/* Food Management */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-red-600">Manage Foods</h2>
        <form onSubmit={handleSubmit} className="mb-6 space-y-4 max-w-xl bg-white p-6 rounded shadow">
          <input name="name" placeholder="Food Name" value={form.name} onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2" required />
          <input name="description" placeholder="Description" value={form.description} onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2" />
          <input name="price" type="number" placeholder="Price" value={form.price} onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2" required />
          <select name="category" value={form.category} onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2">
            <option>Main</option>
            <option>Side</option>
            <option>Drink</option>
            <option>Dessert</option>
          </select>
          <input name="image" placeholder="Image URL" value={form.image} onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2" />
          <label className="inline-flex items-center space-x-2">
            <input name="isAvailable" type="checkbox" checked={form.isAvailable} onChange={handleInputChange}
              className="form-checkbox" />
            <span>Available</span>
          </label>
          <button type="submit"
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition">
            {editingFoodId ? "Update Food" : "Add Food"}
          </button>
          {editingFoodId && (
            <button type="button" onClick={() => {
              setEditingFoodId(null);
              setForm({ name: "", description: "", price: "", category: "Main", isAvailable: true, image: "" });
            }} className="ml-4 text-red-700 underline">
              Cancel
            </button>
          )}
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {foods.map((food) => (
            <div key={food._id} className="bg-white p-4 rounded shadow">
              {food.image && <img src={food.image} alt={food.name} className="w-full h-40 object-cover rounded mb-3" />}
              <h3 className="text-lg font-bold text-red-700">{food.name}</h3>
              <p className="text-gray-700">{food.description}</p>
              <p className="mt-2 font-semibold">₦{food.price}</p>
              <p className="text-sm text-gray-500">Category: {food.category}</p>
              <p className={`mt-1 font-semibold ${food.isAvailable ? "text-green-600" : "text-red-600"}`}>
                {food.isAvailable ? "Available" : "Unavailable"}
              </p>
              <div className="mt-3 flex space-x-2">
                <button onClick={() => handleEdit(food)}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition">
                  Edit
                </button>
                <button onClick={() => handleDeleteFood(food._id)}
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Order Management */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-red-600">Manage Orders</h2>
        {orders.length === 0 && <p>No orders found.</p>}
        <div className="space-y-4 max-w-4xl">
          {orders.map((order) => (
            <div key={order._id} className="bg-white p-4 rounded shadow">
              <p>
                <strong>Customer:</strong> {order.customerName} <br />
                <strong>Address:</strong> {order.address} <br />
                <strong>Phone:</strong> {order.phone} <br />
                <strong>Total:</strong> ₦{order.totalPrice} <br />
                <strong>Status:</strong>{" "}
                <span className={
                  order.status === "completed" ? "text-green-600 font-semibold" :
                  order.status === "pending" ? "text-yellow-600 font-semibold" :
                  "text-red-600 font-semibold"
                }>
                  {order.status}
                </span>
              </p>
              <div className="mt-2">
                <strong>Items:</strong>
                <ul className="list-disc ml-6">
                  {order.items.map(({ foodId, quantity }) => (
                    foodId ? (
                      <li key={foodId._id}>
                        {foodId.name} x {quantity} (₦{foodId.price * quantity})
                      </li>
                    ) : (
                      <li key={quantity + Math.random()}>
                        Item data unavailable x {quantity}
                      </li>
                    )
                  ))}
                </ul>
              </div>
              <div className="mt-4 flex space-x-3">
                <button onClick={() => updateOrderStatus(order._id, "pending")}
                  className="bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-1 rounded">
                  Pending
                </button>
                <button onClick={() => updateOrderStatus(order._id, "completed")}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">
                  Completed
                </button>
                <button onClick={() => updateOrderStatus(order._id, "cancelled")}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">
                  Cancelled
                </button>
                <button onClick={() => deleteOrder(order._id)}
                  className="bg-red-800 hover:bg-red-900 text-white px-3 py-1 rounded">
                  Delete Order
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
