import { NextResponse } from "next/server";

// Temporary in-memory data
let clothes = [
  {
    id: "1",
    name: "T-Shirt",
    price: 499,
    category: "Topwear"
  },
  {
    id: "2",
    name: "Shirt",
    price: 799,
    category: "Topwear"
  },
  {
    id: "3",
    name: "Jeans",
    price: 1299,
    category: "Bottomwear"
  }
];

// GET API
export async function GET() {
  return NextResponse.json({
    success: true,
    data: clothes,
  });
}

// DELETE ALL
export async function DELETE() {
  clothes = [];

  return NextResponse.json({
    success: true,
    message: "All clothes deleted",
  });
}