import { NextResponse } from "next/server";

let orders = [
  { _id: "1", status: "pending", assignedTo: null },
];

export async function PUT(req, { params }) {
  const { id } = params;
  const { deliverymanId } = await req.json();

  orders = orders.map(o =>
    o._id === id ? { ...o, assignedTo: deliverymanId, status: "assigned" } : o
  );

  return NextResponse.json({ message: "Deliveryman assigned", id, deliverymanId });
}
