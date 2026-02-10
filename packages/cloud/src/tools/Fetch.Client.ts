// axiosClient.ts
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

import { useUserStore } from '@/stores/userStore'


// const baseURL = `${import.meta.env.VITE_LOCAL_URL}:${import.meta.env.VITE_LOCAL_PORT}`;
const baseURL = `https://${import.meta.env.VITE_URL}`;

interface ApiRequestConfig extends AxiosRequestConfig {
  path: string; // endpoint relatif
}

/**
 * Client Axios préconfiguré
 */
const axiosClient: AxiosInstance = axios.create({
  baseURL,
  // withCredentials: true, // équivaut à credentials: "include"
  headers: {
    "Content-Type": "application/json",
  },
});

// 🟢 Interceptor exécuté avant chaque requête
axiosClient.interceptors.request.use((config) => {
  const userStore = useUserStore(); // store maintenant disponible
  if (userStore.tenant?.guid) {
    config.headers["x-api-client"] = userStore.tenant.guid;
  }
  return config;
});

/**
 * Requête générique
 */
export const apiRequest = async <T = unknown>({ path, ...config }: ApiRequestConfig): Promise<T> => {
  try {
    const response = await axiosClient({
      url: path,
      ...config,
    });
    return response.data;
  } catch (error: any) {
    // Gestion d'erreur identique au fetch
    const status = error?.response?.status;
    const message = error?.response?.data ?? error.message;
    throw new Error(`HTTP ${status} - ${JSON.stringify(message)}`);
  }
};

export default axiosClient;