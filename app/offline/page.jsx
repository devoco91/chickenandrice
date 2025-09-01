// app/offline/page.jsx
"use client";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6">
      <div className="max-w-md w-full text-center rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-6 shadow-sm">
        <div className="mx-auto mb-3 h-10 w-10 rounded-full border flex items-center justify-center">
          <span className="block h-2 w-2 bg-gray-800 rounded-full" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">You’re offline</h1>
        <p className="mt-2 text-sm text-gray-600">
          We couldn’t reach the network. You can still browse cached pages. Try again when you’re back online.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold hover:opacity-95 active:scale-[0.98] transition"
          >
            Retry
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 active:scale-[0.98] transition"
          >
            Go Home
          </Link>
        </div>

        <p className="mt-4 text-xs text-gray-500">Tip: Add to Home Screen for faster offline access.</p>
      </div>
    </main>
  );
}
