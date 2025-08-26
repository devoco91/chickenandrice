// app/layout.js
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ReduxProvider from "./store/ReduxProvider";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ✅ Safe fallback if NEXT_PUBLIC_APP_URL isn’t set
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "chickenandrice",
    template: "%s | chickenandrice",
  },
  description: "Best Naija Jollof fried & coconut rice",
  icons: {
    icon: "/favicon.ico?v=123",
  },
  openGraph: {
    title: "chickenandrice",
    description: "Best Naija Jollof fried & coconut rice",
    url: appUrl,
    siteName: "chickenandrice",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Delicious Naija Jollof Rice",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "chickenandrice",
    description: "Best Naija Jollof fried & coconut rice",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        {/* ✅ Redux store available everywhere */}
        <ReduxProvider>{children}</ReduxProvider>

        {/* ✅ Lazy load Google Maps API */}
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
