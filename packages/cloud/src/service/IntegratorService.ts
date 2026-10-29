import axios from 'axios'

const client = axios.create({baseURL: `https://${import.meta.env.VITE_URL}/integrator`, timeout: 25000})
const SESSION = 'toke:integrator:token'
const EMAIL = 'toke:integrator:email'
const CONTEXT = 'toke:integrator:context'
export type TenantItem = { guid: string | number; name: string; subdomain: string }
export type Responsible = { guid: string | number; first_name: string; last_name: string; email: string; roles: string[] }
export type ContextInfo = { contextToken: string; expiresIn: number; user: any; tenant: any }
export const integratorStorage = {
    token: () => sessionStorage.getItem(SESSION),
    email: () => sessionStorage.getItem(EMAIL) || '',
    setEmail: (value: string) => sessionStorage.setItem(EMAIL, value),
    setToken: (value: string) => sessionStorage.setItem(SESSION, value),
    clear: () => {
        sessionStorage.removeItem(SESSION);
        sessionStorage.removeItem(EMAIL);
        sessionStorage.removeItem(CONTEXT)
    },
    context: () => sessionStorage.getItem(CONTEXT),
    setContext: (value: string) => sessionStorage.setItem(CONTEXT, value),
    clearContext: () => sessionStorage.removeItem(CONTEXT),
}
const auth = () => ({headers: {Authorization: `Bearer ${integratorStorage.token() || ''}`}})
const payload = async <T>(p: Promise<{ data: T }>): Promise<T> => (await p).data
export const IntegratorService = {
    requestOtp: (email: string) => payload(client.post('/otp/request', {email})),
    verifyOtp: (email: string, otp: string) => payload<{
        token: string;
        expiresIn: number
    }>(client.post('/otp/verify', {email, otp})),
    session: () => payload<{ email: string }>(client.get('/session', auth())),
    tenants: () => payload<{ tenants: TenantItem[] }>(client.get('/tenants', auth())),
    responsibles: (subdomain: string) => payload<{
        profiles: Responsible[]
    }>(client.get(`/tenants/${encodeURIComponent(subdomain)}/responsibles`, auth())),
    select: (subdomain: string, userGuid: string | number) => payload<ContextInfo>(client.post('/context/select', {
        subdomain,
        userGuid
    }, auth())),
    profile: (token: string) => payload<{
        user: any;
        tenant: any
    }>(client.get(`/context/${encodeURIComponent(token)}/profile`, auth())),
    leave: (token: string) => payload(client.post('/context/leave', {contextToken: token}, auth())),
    logout: () => payload(client.post('/logout', {}, auth())),
}
export const integratorError = (error: unknown): string => {
    if (axios.isAxiosError(error)) return error.response?.data?.message || 'Le service est temporairement indisponible.'
    return error instanceof Error ? error.message : 'Une erreur est survenue.'
}
