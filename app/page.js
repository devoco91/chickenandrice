import Image from "next/image";
import Navbar from "./components/Navbar/Navbar";
import Banner from "./components/Banner/Banner";
import Productpage from "./components/Productpage/Product"

export default function Home() {
  return (
    <div>
      <Navbar/>
      <Banner/>
      <Productpage/>
    </div>
  );
}
