import axios from 'axios';

// Use the captured manager token, independently of later session/context changes.
// Keep logout outside session-invalidating interceptors so cleanup stays atomic.
export async function revokeSession(token: string): Promise<boolean> {
  const response = await axios.post(
    '/tenant/session/logout',
    undefined,
    {
      baseURL: `https://${import.meta.env.VITE_URL}`,
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    },
  );
  return response.data?.success === true && response.data?.data?.revoked === true;
}
