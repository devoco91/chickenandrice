// OPTION A — Make it a Client Component (easiest, works now)
// File: app/debug/env/page.jsx
"use client";

export default function EnvDebug() {
  const api = process.env.NEXT_PUBLIC_API_URL || "(unset)";
  const uploads = process.env.NEXT_PUBLIC_BACKEND_UPLOADS_BASE || "(unset)";
  const src = `${(uploads || "").replace(/\/+$/, "")}/probe.jpg`;
  return (
    <pre style={{ padding: 16 }}>
{`API_URL: ${api}
UPLOADS_BASE: ${uploads}
`}
      <img
        alt="probe"
        src={src}
        onError={(e) => {
          // only for debug; remove after verifying prod envs
          e.currentTarget.alt = "probe failed (expected if probe.jpg not there)";
        }}
      />
    </pre>
  );
}