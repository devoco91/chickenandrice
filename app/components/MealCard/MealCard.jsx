"use client"
import Link from "next/link"

export default function MealCard({ meal }) {
  const formatPrice = (price) => new Intl.NumberFormat("en-NG").format(price)

  return (
    <div className="border rounded-xl p-4 shadow-md hover:shadow-lg transition duration-200 bg-white">
      <h3 className="font-semibold text-lg text-gray-800">{meal.name}</h3>
      <p className="text-gray-600">₦{formatPrice(meal.price)}</p>

      <Link
        href={`/select-location?mealId=${meal._id}`} 
        className="mt-3 inline-block bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
      >
        Order Now
      </Link>
    </div>
  )
}
