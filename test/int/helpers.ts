const API_URL = process.env.API_URL || "http://localhost:4000";
const WS_URL = process.env.WS_URL || "ws://localhost:4000/ws";

export { API_URL, WS_URL };

export async function fetchApi(path: string, options: RequestInit = {}) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
}

export async function fetchWithAuth(path: string, token: string, options: RequestInit = {}) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}
