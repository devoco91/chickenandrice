// app/components/WelcomeModal/WelcomeModal.jsx
"use client";

import { useEffect, useRef } from "react";

const CARD_BG = "#f1c40f";
const BORDER = "border border-yellow-300";
const SHADOW = "shadow-md";

// WhatsApp with prefilled message
const WHATSAPP_NUMBER = "2349040002074";
const WHATSAPP_TEXT = "Hi Chickenandrice, I need help with my order.";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;

export default function WelcomeModal({ isOpen, onClose }) {
  const bodyRef = useRef(null);

  // lock scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  const close = () => {
    // ensure scroll is restored even if unmount timing changes
    document.body.style.overflow = "";
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* scrim */}
      <div className="absolute inset-0 bg-black/60" onClick={close} />

      {/* panel (scrollable) */}
      <div
        className={[
          "relative w-full max-w-2xl rounded-2xl bg-white overflow-hidden",
          SHADOW,
          "animate-in fade-in zoom-in duration-200",
          "max-h-[90vh] flex flex-col",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
      >
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Welcome to Chickenandrice 🍚🍗</h2>
          <button
            onClick={close}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* body (scrollable) */}
        <div
          ref={bodyRef}
          className="p-6 space-y-4 overflow-y-auto grow"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <Card>
            <Paragraph>
              Welcome to Chickenandrice order channel 😊 We are glad to welcome you specially
              whether you are a new or returning customer.
            </Paragraph>
          </Card>

          <Card>
            <Paragraph>
              Enjoy the best of Chicken and rice at unbeatable prices! Minimum order is{" "} <strong>EIGHT THOUSAND, EIGHT HUNDRED AND FIFTY NAIRA</strong>
               <strong> (₦8,850) ONLY.</strong>
            </Paragraph>
          </Card>

          <Card>
            <Paragraph>
              Bulk order comes with extra discount and you can personalize your order by chatting
              with us on our website.<strong> MINIMUM ORDER FOR OUR PARTY PACKS IS 25.</strong>
            </Paragraph>
          </Card>

          <Card>
            <Paragraph>
              Our delivery is subsidized and our delivery time is as fast as possible so that your
              meals are delivered to you fresh and hot 🔥. Pick up option is available too.
            </Paragraph>
          </Card>

          {/* ✅ New delivery-time note */}
          <Card>
            <Paragraph>
              <strong>Delivery window:</strong> delivery is between <strong>9:00am</strong> and{" "}
              <strong>7:00pm</strong>. Meals ordered outside this time will be delivered from{" "}
              <strong>9:00am the next day</strong>.
            </Paragraph>
          </Card>

        
        </div>

        {/* footer */}
        <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-3">
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-700 hover:underline"
            title="Chat with us on WhatsApp"
          >
            Need help? Chat on WhatsApp
          </a>

          <button
            onClick={close}
            className="px-5 py-2 rounded-xl font-semibold text-white"
            style={{ backgroundColor: "#2563eb" }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ children, tone }) {
  const bg =
    tone === "ok" ? "#e8f7e9" :
    tone === "warn" ? "#fff1f2" :
    tone === "info" ? "#fff9db" :
    CARD_BG;
  return (
    <div
      className={["rounded-2xl p-4", BORDER, SHADOW].join(" ")}
      style={{ background: bg }}
    >
      {children}
    </div>
  );
}

function Paragraph({ children }) {
  return <p className="text-gray-900 leading-relaxed">{children}</p>;
}
