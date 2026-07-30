import axios, {AxiosInstance, AxiosRequestConfig} from "axios";

import {useUserStore} from '@/stores/userStore'

const baseURL = `https://${import.meta.env.VITE_URL}`;

interface ApiRequestConfig extends AxiosRequestConfig {
    path: string;
}

export class ApiClientError<TDetails = unknown> extends Error {
    readonly status?: number;
    readonly code: string;
    readonly details?: TDetails;
    readonly payload?: unknown;

    constructor(options: {
        message: string;
        code?: string;
        status?: number;
        details?: TDetails;
        payload?: unknown;
    }) {
        super(options.message);
        this.name = 'ApiClientError';
        this.status = options.status;
        this.code = options.code ?? 'request_failed';
        this.details = options.details;
        this.payload = options.payload;
    }
}

const axiosClient: AxiosInstance = axios.create({
    baseURL,
    headers: {
        "Content-Type": "application/json",
    },
});

axiosClient.interceptors.request.use((config) => {
    const userStore = useUserStore();

    if (userStore.tenant?.guid) {
        config.headers["x-api-client"] = userStore.tenant.guid;
    }

    return config;
});

const extractApiError = (payload: any) => {
    const nestedError = payload?.error?.error;
    const directError = payload?.error;
    const apiError = nestedError ?? directError ?? payload;
    return {
        code: apiError?.code ?? 'request_failed',
        message: apiError?.message ?? payload?.message ?? 'Une erreur inattendue est survenue.',
        details: apiError?.details,
    };
};

export const apiRequest = async <T = unknown>({path, ...config}: ApiRequestConfig): Promise<T> => {
    try {
        const response = await axiosClient({
            url: path,
            ...config,
        });

        return response.data;
    } catch (error: any) {
        const status = error?.response?.status;
        const payload = error?.response?.data;
        const apiError = extractApiError(payload);

        throw new ApiClientError({
            status,
            code: apiError.code,
            message: apiError.message || error?.message || 'Erreur réseau.',
            details: apiError.details,
            payload,
        });
    }
};

export default axiosClient;