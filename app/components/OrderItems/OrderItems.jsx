export default function OrderItem({ order, onDelete, onEdit }) {
  return (
    <div className="bg-white border rounded p-4 mb-4 shadow">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-semibold">{order.customerName}</h2>
          <p className="text-sm">
            {order.items.map(i => `${i.foodId.name} ×${i.quantity}`).join(', ')}
          </p>
          <p className="text-primary font-bold">₦{order.totalPrice}</p>
          <p>Status: <span className="text-accentBlue">{order.status}</span></p>
        </div>
        <div className="space-x-2">
          <button
            className="px-3 py-1 bg-accentYellow rounded hover:bg-yellow-400"
            onClick={onEdit}
          >
            Edit
          </button>
          <button
            className="px-3 py-1 bg-accentBlue text-white rounded hover:bg-blue-600"
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
