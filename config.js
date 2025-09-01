// app/config.js

// ✅ API base (your backend server)
export const API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://fastfolderbackend.fly.dev/api"
    : "http://localhost:5000/api";

// ✅ Uploads base (for images)
export const UPLOADS_BASE =
  process.env.NODE_ENV === "production"
    ? "https://fastfolderbackend.fly.dev/uploads/"
    : "http://localhost:5000/uploads/";
