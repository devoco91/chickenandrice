export const API_URL =
process.env.NEXT_PUBLIC_API_URLs || "http://localhost:5000";

// Helper to generate full image URL
export const getImageUrl = (fileName) => `${API_URL}/uploads/${fileName}`;
