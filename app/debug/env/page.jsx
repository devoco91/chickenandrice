// app/debug/env/page.jsx
export default function EnvDebug() {
  const api = process.env.NEXT_PUBLIC_API_URL || "(unset)";
  const uploads = process.env.NEXT_PUBLIC_BACKEND_UPLOADS_BASE || "(unset)";
  return (
    <pre style={{padding:16}}>
{`API_URL: ${api}
UPLOADS_BASE: ${uploads}
`}
      <img
        alt="probe"
        src={`${(uploads || '').replace(/\/+$/,'')}/probe.jpg`}
        onError={(e)=>{e.currentTarget.alt='probe failed (expected if probe.jpg not there)'}}
      />
    </pre>
  );
}
