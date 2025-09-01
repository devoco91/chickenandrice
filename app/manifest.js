// app/manifest.js
export default function manifest() {
return {
name: "chickenandrice",
short_name: "C&R",
start_url: "/",
scope: "/",
display: "standalone",
description: "Best Naija Jollof fried & coconut rice",
background_color: "#ffffff",
theme_color: "#111827",
icons: [
{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
]
};
}