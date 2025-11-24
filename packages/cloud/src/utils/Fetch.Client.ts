// fetchClient.ts
const isDev = import.meta.env.MODE === 'development';

const baseURL = isDev
  ? `${import.meta.env.VITE_API_URL}:${import.meta.env.VITE_API_PORT}`
  : import.meta.env.VITE_API_URL;

const apiKey: string = import.meta.env.VITE_API_KEY;

interface FetchOptions extends RequestInit {
  path: string; // endpoint relatif
}

export const apiFetch = async ({ path, ...options }: FetchOptions) => {
  const url = `${baseURL}${path}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  };

  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
    credentials: "include", // si besoin de cookies/session
  };

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status} - ${text}`);
  }

  // suppose que toutes les réponses sont JSON
  return response.json();
};