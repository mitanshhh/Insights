// lib/api.js
const API = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch(path) {
  const res = await fetch(`${API}${path}`);
  return res.json();
}