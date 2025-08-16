'use client';
import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5000";


export default function AdminDashboard() {
  const [foods, setFoods] = useState([]);
  const [orders, setOrders] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "Main",
    isAvailable: true,
    isPopular: false,
    image: "" 
  });
  const [editingFoodId, setEditingFoodId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchFoods = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/foods`);
      const data = await res.json();
      setFoods(data);
    } catch (error) {
      console.error('Failed to fetch foods:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/orders`);
      const data = await res.json();
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  useEffect(() => {
    fetchFoods();
    fetchOrders();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "imageFile") return; 
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const url = editingFoodId
      ? `${API_BASE}/api/foods/${editingFoodId}`
      : `${API_BASE}/api/foods`;

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("description", form.description);
    formData.append("price", form.price);
    formData.append("category", form.category);
    formData.append("isAvailable", form.isAvailable);
    formData.append("isPopular", form.isPopular);

    if (form.image && form.image.trim() !== "") {
      formData.append("image", form.image.trim());
    }

    if (imageFile) {
      formData.append("imageFile", imageFile);
    }

    try {
      const response = await fetch(url, {
        method: editingFoodId ? "PUT" : "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Success:', result);
      
      resetForm();
      fetchFoods();
      alert(editingFoodId ? 'Food updated successfully!' : 'Food added successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert(`Failed to save food item: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      category: "Main",
      isAvailable: true,
      isPopular: false,
      image: ""
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingFoodId(null);
  };

  const handleEdit = (food) => {
    setForm({
      name: food.name,
      description: food.description || "",
      price: food.price,
      category: food.category,
      isAvailable: food.isAvailable,
      isPopular: food.isPopular || false,
      image: food.image || ""
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingFoodId(food._id);
  };

  const handleDeleteFood = async (id) => {
    if (!confirm("Are you sure you want to delete this food?")) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/foods/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error('Failed to delete');
      
      fetchFoods();
      alert('Food deleted successfully!');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete food item');
    }
  };

  const updateOrderStatus = async (id, newStatus) => {
    try {
      await fetch(`${API_BASE}/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchOrders();
    } catch (error) {
      console.error('Order update error:', error);
    }
  };

  const deleteOrder = async (id) => {
    if (!confirm("Delete this order?")) return;
    try {
      await fetch(`${API_BASE}/api/orders/${id}`, { method: "DELETE" });
      fetchOrders();
    } catch (error) {
      console.error('Order delete error:', error);
    }
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    if (imageUrl.startsWith('http')) return imageUrl;
    
    if (imageUrl.startsWith('/uploads/')) return `${API_BASE}${imageUrl}`;

    return `${API_BASE}${imageUrl}`;
  };

  return (
    <div className="min-h-screen bg-red-50 p-8 text-gray-900">
      <h1 className="text-4xl font-bold mb-6 text-red-700">Admin Dashboard</h1>

      {/* Food Management */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-red-600">Manage Foods</h2>
        <form onSubmit={handleSubmit} className="mb-6 space-y-4 max-w-xl bg-white p-6 rounded shadow">
          <input
            name="name"
            placeholder="Food Name"
            value={form.name}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          />
          <textarea
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
            rows="3"
          />
          <input
            name="price"
            type="number"
            step="0.01"
            placeholder="Price"
            value={form.price}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          />
          <select
            name="category"
            value={form.category}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option>Main</option>
            <option>Side</option>
            <option>Drink</option>
            <option>Dessert</option>
          </select>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL (optional)
            </label>
            <input
              name="image"
              placeholder="https://example.com/image.jpg"
              value={form.image}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Or Upload Image File
            </label>
            <input
              type="file"
              name="imageFile"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          
          {/* Image Preview */}
          {(imagePreview || (form.image && !imageFile)) && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image Preview:
              </label>
              <img
                src={imagePreview || getImageUrl(form.image)}
                alt="Preview"
                className="w-32 h-32 object-cover rounded border"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NCA0NEg0NEE0IDQgMCAwIDAgNDAgNDhWODBBNCA0IDAgMCAwIDQ0IDg0SDg0QTQgNCAwIDAgMCA4OCA4MFY0OEE0IDQgMCAwIDAgODQgNDRaTTU2IDY4QTQgNCAwIDEgMSA2MCA2NEE0IDQgMCAwIDEgNTYgNjhaTTgyIDc2SDQ2TDU2IDY2TDYwIDcwTDcwIDYwTDgyIDcyVjc2WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                }}
              />
              {imageFile && (
                <p className="text-sm text-gray-600 mt-1">File: {imageFile.name}</p>
              )}
            </div>
          )}

          {/* Toggles */}
          <div className="flex space-x-6">
            <label className="inline-flex items-center space-x-2">
              <input
                name="isAvailable"
                type="checkbox"
                checked={form.isAvailable}
                onChange={handleInputChange}
                className="form-checkbox text-red-600"
              />
              <span>Available</span>
            </label>

            <label className="inline-flex items-center space-x-2">
              <input
                name="isPopular"
                type="checkbox"
                checked={form.isPopular}
                onChange={handleInputChange}
                className="form-checkbox text-red-600"
              />
              <span>Popular</span>
            </label>
          </div>

          {/* Submit */}
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : (editingFoodId ? "Update Food" : "Add Food")}
            </button>
            {editingFoodId && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Food Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {foods.map((food) => (
            <div key={food._id} className="bg-white p-4 rounded shadow hover:shadow-md transition">
              {food.image && (
                <div className="relative mb-3">
                  <img
                    src={getImageUrl(food.image)}
                    alt={food.name}
                    className="w-full h-40 object-cover rounded"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE2MCIgdmlld0JveD0iMCAwIDMyMCAxNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xODAgODBIMTQwQTEwIDEwIDAgMCAwIDEzMCA5MFYxMjBBMTAgMTAgMCAwIDAgMTQwIDEzMEgxODBBMTAgMTAgMCAwIDAgMTkwIDEyMFY5MEExMCAxMCAwIDAgMCAxODAgODBaTTE1MCAxMTBBMTAgMTAgMCAxIDEgMTYwIDEwMEExMCAxMCAwIDAgMSAxNTAgMTEwWk0xODUgMTI1SDE0NUwxNTUgMTE1TDE2MCAzTDE3MCA5NUwxODUgMTEwVjEyNVoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                      e.target.classList.add('opacity-50');
                    }}
                  />
                  {food.isPopular && (
                    <span className="absolute top-2 right-2 px-2 py-1 text-xs font-semibold bg-yellow-400 text-black rounded-full">
                      Popular
                    </span>
                  )}
                </div>
              )}
              <h3 className="text-lg font-bold text-red-700 mb-1">{food.name}</h3>
              <p className="text-gray-700 mb-2 text-sm">{food.description}</p>
              <div className="flex justify-between items-center mb-2">
                <p className="font-semibold text-lg">₦{food.price}</p>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {food.category}
                </span>
              </div>
              <p
                className={`mb-3 font-semibold text-sm ${
                  food.isAvailable ? "text-green-600" : "text-red-600"
                }`}
              >
                {food.isAvailable ? "✅ Available" : "❌ Unavailable"}
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(food)}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteFood(food._id)}
                  className="flex-1 bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 transition text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {foods.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No foods found. Add some food items to get started!
          </div>
        )}
      </section>
    </div>
  );
}