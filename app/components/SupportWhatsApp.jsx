// components/SupportWhatsApp.jsx
"use client";

import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { MessageCircle } from "lucide-react";

const PHONE = "2349040002075";

const formatCurrency = (n) =>
  Number.isFinite(+n)
    ? Number(n).toLocaleString("en-NG", { maximumFractionDigits: 0 })
    : String(n || "");

export default function SupportWhatsApp() {
  const cartItems = useSelector((s) => s.cart.cartItem || []);

  const { lines, subtotal } = useMemo(() => {
    const s = Array.isArray(cartItems)
      ? cartItems.reduce(
          (acc, it) =>
            acc +
            (Number(it?.price) || 0) * (Number(it?.quantity) || 0),
          0
        )
      : 0;
    const topLines = (Array.isArray(cartItems) ? cartItems : [])
      .filter((it) => (it?.quantity || 0) > 0)
      .slice(0, 8)
      .map(
        (it) =>
          `• ${it?.name ?? "Item"} x${it?.quantity} @ ₦${formatCurrency(
            it?.price
          )}`
      );
    return { lines: topLines, subtotal: s };
  }, [cartItems]);

  const text = [
    "Hello 👋, I'd like to place a personalized order.",
    "",
    lines.length ? "My current cart:" : "I haven't added anything yet.",
    ...(lines.length ? lines : []),
    lines.length ? `Subtotal: ₦${formatCurrency(subtotal)}` : "",
    "",
    "Here are my preferences / custom request:",
  ]
    .filter(Boolean)
    .join("\n");

  // wa.me link ensures direct chat open
  const href = `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      title="Personalize your order on WhatsApp"
      className={[
        "fixed z-50 right-5 bottom-5",
        "group inline-flex items-center gap-2",
        "rounded-full shadow-xl border border-emerald-200",
        "bg-gradient-to-r from-emerald-500 to-emerald-700",
        "text-white px-4 py-3",
        "hover:opacity-95 active:scale-[0.98] transition",
      ].join(" ")}
    >
      <MessageCircle className="w-5 h-5" />
      <span className="font-semibold hidden sm:block">Want to personalize you order? Chat</span>
      <span className="sr-only">WhatsApp</span>
      {subtotal > 0 && (
        <span className="ml-1 hidden md:inline-block text-xs bg-white/20 rounded-full px-2 py-[2px] font-medium">
          Subtotal ₦{formatCurrency(subtotal)}
        </span>
      )}
    </a>
  );
}
