export const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://fastfolderbackend.fly.dev"
    : "http://localhost:5000");
