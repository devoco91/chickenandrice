export const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://fastfolderbackend.fly.devs"
    : "http://localhost:5000");
