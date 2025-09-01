import { NextResponse } from "next/server";

let orders = [
  { _id: "1", status: "pending" },
];

export async function PUT(req, { params }) {
  const { id } = params;
  const { status } = await req.json();

  orders = orders.map(o =>
    o._id === id ? { ...o, status } : o
  );

  return NextResponse.json({ message: "Status updated", id, status });
}
