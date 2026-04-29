// lib/api.js
const API = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(`${API}${path}`, options);

    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error("API Fetch Error:", error);
    return { error: true, message: error.message };
  }
}