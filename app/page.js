"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import Navbar from "./components/Navbar/Navbar";
import Banner from "./components/Banner/Banner";
import Productpage from "./components/Productpage/Product";
import Footer from "./components/Footer/Footer";
import { setMeals } from "./store/mealsSlice";
import LocationModal from "./components/LocationModal/LocationModal";

export default function Home() {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [showModal, setShowModal] = useState(false);

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

  // Always open Location modal and attach the mealId as a query param for the modal to read.
  const handleRequireLocation = (mealId) => {
    const params = new URLSearchParams(searchParams.toString());
    if (mealId) params.set("mealId", String(mealId));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setShowModal(true);
  };

  return (
    <div className="relative">
      <Navbar />
      <Banner />
      <Productpage onRequireLocation={handleRequireLocation} />
      <Footer />

      {showModal && (
        <LocationModal isOpen={showModal} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
