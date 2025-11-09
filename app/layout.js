// File: app/layout.jsx (RootLayout) — small, safe tweaks
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ReduxProvider from "./store/ReduxProvider";
import Script from "next/script";
import PWARegister from "./components/PWARegister";
import InstallPWAButton from "./components/InstallPWAButton";
import IOSA2HSBanner from "./components/IOSA2HSBanner";
import LocalBusinessJsonLd from "./seo/LocalBusinessJsonLd";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import FacebookPixel from "./components/FacebookPixel";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const pixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || process.env.NEXT_PUBLIC_FB_PIXEL_ID || "";

// Hosts we fetch from (for preconnect/dns-prefetch)
const API_HOST = "https://chickenandrice-server.fly.dev";
// If you also fetch images directly from Firebase Storage, keep this line:
const STORAGE_HOST = "https://firebasestorage.googleapis.com";

export const metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "chickenandrice", template: "%s | chickenandrice" },
  description: "Best Naija Jollof fried & coconut rice",
  icons: { icon: "/favicon.ico?v=123", apple: "/apple-touch-icon-180x180.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "chickenandrice" },
  alternates: { canonical: appUrl },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "chickenandrice",
    description: "Best Naija Jollof fried & coconut rice",
    url: appUrl,
    siteName: "chickenandrice",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Delicious Naija Jollof Rice" }],
    locale: "en_US",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "chickenandrice", description: "Best Naija Jollof fried & coconut rice", images: ["/og-image.jpg"] },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/* Speed up first connection to your API / image host */}
        <link rel="preconnect" href={API_HOST} crossOrigin="" />
        <link rel="dns-prefetch" href={API_HOST} />
        {/* Optional: if images sometimes come directly from Firebase Storage */}
        <link rel="preconnect" href={STORAGE_HOST} crossOrigin="" />
        <link rel="dns-prefetch" href={STORAGE_HOST} />
      </head>
      <body className="antialiased">
        <LocalBusinessJsonLd />

        <ReduxProvider>
          {/* Mount pixel only if configured */}
          {pixelId ? <FacebookPixel pixelId={pixelId} /> : null}
          {children}
        </ReduxProvider>

        <IOSA2HSBanner />
        <InstallPWAButton className="fixed bottom-4 right-4 px-4 py-2 rounded-xl bg-gray-900 text-white shadow" />
        <PWARegister />

        <ToastContainer position="top-center" newestOnTop pauseOnHover closeOnClick draggable />

        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
