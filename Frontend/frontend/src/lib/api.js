const API = "https://insights-aphh.onrender.com";

export async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(`${API}${path}`, options);

    if (!res.ok) {
      throw new Error(`Error: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error("API ERROR:", err);
    throw err;
  }
}