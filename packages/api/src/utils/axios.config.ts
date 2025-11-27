import axios, { AxiosInstance } from 'axios';
// import type { AxiosInstance } from 'axios';
// import axios from 'axios';
import dotenv from 'dotenv';

import { ApiKeyManager } from '../tools/api-key-manager.js';

dotenv.config();

/**
 * Crée un client Axios avec baseURL paramétrable
 * @param customBaseURL (optionnel) – URL de base, par défaut process.env.SITE_URL
 * @param secret
 * @param key
 */
export function createApiClient(
  customBaseURL?: string,
  secret: string = process.env.API_SECRET!,
  key: string = process.env.API_KEY!,
): AxiosInstance {
  // const baseURL = customBaseURL ?? process.env.SITE_URL!;
  const baseURL = customBaseURL;

  const signature = ApiKeyManager.generate(secret, key);

  return axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': key,
      'X-Api-Timestamp': Math.floor(Date.now() / 1000).toString(),
      'X-Api-Signature': signature,
    },
  });
}

// client par défaut (utilise SITE_URL)
const api = createApiClient();
export default api;

// import axios from 'axios';
// import dotenv from 'dotenv';
//
// import { ApiKeyManager } from '../tools/api-key-manager.js';
//
// dotenv.config();
//
// const baseURL = process.env.SITE_URL;
//
// const signature = ApiKeyManager.generate(process.env.API_SECRET!, process.env.API_KEY!);
//
// const api = axios.create({
//   baseURL,
//   headers: {
//     'Content-Type': 'application/json',
//     'X-Api-Key': process.env.API_KEY,
//     'X-Api-Timestamp': Math.floor(Date.now() / 1000).toString(),
//     'X-Api-Signature': signature,
//   },
// });
//
// export default api;
