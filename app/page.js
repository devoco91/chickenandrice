"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import Navbar from "./components/Navbar/Navbar";
import Banner from "./components/Banner/Banner";
import Productpage from "./components/Productpage/Product";
import Footer from "./components/Footer/Footer";

import { setMeals } from "./store/mealsSlice";

export default function Home() {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchMeals = async () => {
      try {
        const res = await fetch("/api/foods"); // ✅ always load all meals
        if (!res.ok) throw new Error("Failed to load meals");
        const data = await res.json();
        dispatch(setMeals(data));
      } catch (err) {
        console.error("Error fetching meals:", err);
        dispatch(setMeals([]));
      }
    };

    fetchMeals();
  }, [dispatch]);

  return (
    <div>
      <Navbar />
      <Banner />
      <Productpage />
      <Footer />
    </div>
  );
}
