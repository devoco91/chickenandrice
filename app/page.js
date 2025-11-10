// app/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import Navbar from "./components/Navbar/Navbar";
import Banner from "./components/Banner/Banner";
import Productpage from "./components/Productpage/Product";
import Footer from "./components/Footer/Footer";
import { setMeals } from "./store/mealsSlice";
import LocationModal from "./components/LocationModal/LocationModal";
import WelcomeModal from "./components/WelcomeModal/WelcomeModal";

export default function Home() {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // First-load Welcome modal
  const [hydrated, setHydrated] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      const seen = localStorage.getItem("welcomeSeen_v2");
      if (!seen) setShowWelcome(true);
    } catch {
      setShowWelcome(true);
    }
  }, []);

  const handleCloseWelcome = () => {
    try { localStorage.setItem("welcomeSeen_v2", "1"); } catch {}
    setShowWelcome(false);
  };

  // Add-to-cart location modal (unchanged)
  const [showLocationModal, setShowLocationModal] = useState(false);
  const handleRequireLocation = (mealId) => {
    const params = new URLSearchParams(searchParams.toString());
    if (mealId) params.set("mealId", String(mealId));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setShowLocationModal(true);
  };

  // Load meals (unchanged)
  useEffect(() => {
    const fetchMeals = async () => {
      try {
        const res = await fetch("/api/foods");
        if (!res.ok) throw new Error("Failed to load meals");
        dispatch(setMeals(await res.json()));
      } catch (err) {
        console.error("Error fetching meals:", err);
        dispatch(setMeals([]));
      }
    };
    fetchMeals();
  }, [dispatch]);

  return (
    <div className="relative">
      <Navbar />
      <Banner />
      <Productpage onRequireLocation={handleRequireLocation} />
      <Footer />

      {hydrated && showWelcome && (
        <WelcomeModal isOpen={showWelcome} onClose={handleCloseWelcome} />
      )}

      {showLocationModal && (
        <LocationModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
        />
      )}
    </div>
  );
}
