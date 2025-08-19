import dbConnect from "@/lib/dbConnect";
import Meal from "@/models/Meal";

export async function GET(req) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const mealId = searchParams.get("mealId");
  const state = searchParams.get("state");
  const lga = searchParams.get("lga");

  if (!mealId || !state || !lga) {
    return new Response(JSON.stringify({ error: "Missing parameters" }), {
      status: 400,
    });
  }

  const meal = await Meal.findById(mealId).lean();
  if (!meal) {
    return new Response(JSON.stringify({ error: "Meal not found" }), {
      status: 404,
    });
  }

  // Meals in same state & LGA
  const mealsInLga = await Meal.find({
    state,
    lgas: { $in: [lga] },
  }).lean();

  const mealAvailable = mealsInLga.some((m) => m._id.toString() === mealId);

  // If meal not in LGA, check for state-wide alternatives
  let alternatives = [];
  if (!mealAvailable) {
    const mealsInState = await Meal.find({ state }).lean();
    alternatives = mealsInState.filter((m) => m._id.toString() !== mealId);
  }

  return new Response(
    JSON.stringify({
      available: mealAvailable,
      meal,
      alternatives,
    }),
    { status: 200 }
  );
}
