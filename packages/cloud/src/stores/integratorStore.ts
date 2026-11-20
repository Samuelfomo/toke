import {defineStore} from 'pinia'
import {computed, ref} from 'vue'

import {IntegratorService, integratorStorage, type TenantItem, type Responsible} from '@/service/IntegratorService'
import {useUserStore} from '@/stores/userStore'

export const useIntegratorStore = defineStore('integrator', () => {
    const authenticated = ref(Boolean(integratorStorage.token()))
    const email = ref(integratorStorage.email())
    const tenants = ref<TenantItem[]>([])
    const selectedTenant = ref<TenantItem | null>(null)
    const responsibles = ref<Responsible[]>([])
    const selectedResponsible = ref<Responsible | null>(null)
    const activeContext = ref(integratorStorage.context())
    const busy = ref(false)
    const tenantCount = computed(() => tenants.value.length)

    async function validate() {
        if (!integratorStorage.token()) return false
        try {
            const data = await IntegratorService.session();
            email.value = data.email;
            authenticated.value = true;
            return true
        } catch {
            if (integratorStorage.context()) useUserStore().clearDelegatedProfile();
            clearLocal();
            return false
        }
    }

    function clearLocal() {
        useUserStore().clearDelegatedProfile();
        integratorStorage.clear();
        authenticated.value = false;
        tenants.value = [];
        responsibles.value = []
        selectedTenant.value = null;
        selectedResponsible.value = null;
        activeContext.value = null;
        email.value = ''
    }

    async function request(emailAddress: string) {
        await IntegratorService.requestOtp(emailAddress);
        email.value = emailAddress;
        integratorStorage.setEmail(emailAddress)
    }

    async function verify(code: string) {
        const response = await IntegratorService.verifyOtp(email.value, code)
        if (!response.token) throw new Error('Session intégrateur non reçue')
        integratorStorage.setToken(response.token);
        authenticated.value = true
    }

    async function loadTenants() {
        const response = await IntegratorService.tenants();
        tenants.value = response.tenants ?? []
    }

    async function loadResponsibles(tenantGuid: string) {
        if (!tenants.value.length) await loadTenants()
        const found = tenants.value.find(t => String(t.guid) === String(tenantGuid))
        if (!found) throw new Error('Cette entreprise n’est plus disponible.')
        selectedTenant.value = found
        const response = await IntegratorService.responsibles(found.subdomain)
        responsibles.value = response.profiles ?? []
    }

    async function releaseContext() {
        const current = integratorStorage.context()
        if (current) await IntegratorService.leave(current)
        integratorStorage.clearContext();
        activeContext.value = null;
        selectedResponsible.value = null
        // Les données client sont effacées entre deux profils pour éviter tout mélange.
        useUserStore().clearDelegatedProfile()
    }

    async function loadContextProfile(token: string) {
        if (!integratorStorage.token() || !/^[A-Za-z0-9_-]{32,128}$/.test(token))
            throw new Error('Contexte intégrateur invalide.')
        const context = await IntegratorService.context(token)
        const profile = await IntegratorService.profile(token)
        if (!context?.subdomain || !context.tenantGuid || !context.userGuid ||
            !profile?.user?.guid || !profile?.tenant?.guid ||
            String(profile.user.guid) !== String(context.userGuid) ||
            String(profile.tenant.guid) !== String(context.tenantGuid) ||
            profile.tenant.subdomain !== context.subdomain)
            throw new Error('Profil intégrateur incomplet ou incohérent.')
        return { context, profile }
    }

    async function validateContext() {
        const token = integratorStorage.context()
        if (!token) return false
        const { profile } = await loadContextProfile(token)
        if (integratorStorage.context() !== token) throw new Error('Le contexte a changé.')
        useUserStore().setDelegatedProfile(profile)
        activeContext.value = token
        return true
    }

    async function enterProfile(profile: Responsible) {
        const tenant = selectedTenant.value
        if (!tenant) throw new Error('Aucune entreprise sélectionnée.')
        if (integratorStorage.context()) await releaseContext()
        const response = await IntegratorService.select(tenant.subdomain, profile.guid)
        const token = response?.contextToken
        if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(token))
            throw new Error('Contexte intégrateur incomplet.')
        try {
            const verified = await loadContextProfile(token)
            if (verified.context.subdomain !== tenant.subdomain ||
                String(verified.context.tenantGuid) !== String(tenant.guid) ||
                String(verified.context.userGuid) !== String(profile.guid))
                throw new Error('Le profil ne correspond pas à la sélection.')
            integratorStorage.setContext(token)
            activeContext.value = token
            selectedResponsible.value = profile
            useUserStore().setDelegatedProfile(verified.profile)
        } catch (error) {
            await IntegratorService.leave(token).catch(() => undefined)
            integratorStorage.clearContext()
            activeContext.value = null
            selectedResponsible.value = null
            useUserStore().clearDelegatedProfile()
            throw error
        }
    }

    async function logout() {
        try {
            if (integratorStorage.context()) await releaseContext();
            if (integratorStorage.token()) await IntegratorService.logout()
        } finally {
            clearLocal()
        }
    }

    return {
        authenticated,
        email,
        tenants,
        selectedTenant,
        responsibles,
        selectedResponsible,
        activeContext,
        busy,
        tenantCount,
        validate,
        validateContext,
        request,
        verify,
        loadTenants,
        loadResponsibles,
        releaseContext,
        enterProfile,
        logout
    }
})
