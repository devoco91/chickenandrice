import { NextResponse } from "next/server";

let deliverymen = [
  { _id: "dm1", name: "Alex Rider", isOnline: true, phone: "08012345678" },
  { _id: "dm2", name: "Jane Smith", isOnline: false, phone: "08098765432" },
];

export async function GET() {
  return NextResponse.json(deliverymen);
}
