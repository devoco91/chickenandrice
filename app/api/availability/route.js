import dbConnect from "@/lib/dbConnect"
import Meal from "@/models/Meal"

export async function GET(req) {
  await dbConnect()

  const { searchParams } = new URL(req.url)
  const mealId = searchParams.get("mealId")
  const state = searchParams.get("state")
  const lga = searchParams.get("lga")

  if (!mealId || !state || !lga) {
    return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 })
  }

  const meal = await Meal.findById(mealId).lean()
  if (!meal) {
    return new Response(JSON.stringify({ error: "Meal not found" }), { status: 404 })
  }

  // All meals in that state + lga
  const mealsInLocation = await Meal.find({
    state,
    lgas: { $in: [lga] },
  }).lean()

  const mealAvailable = mealsInLocation.some(m => m._id.toString() === mealId)

  return new Response(
    JSON.stringify({
      available: mealAvailable,
      meal,
      alternatives: mealsInLocation.filter(m => m._id.toString() !== mealId),
    }),
    { status: 200 }
  )
}
