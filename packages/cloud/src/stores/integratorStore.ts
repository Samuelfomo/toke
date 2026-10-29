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
            if (integratorStorage.context()) useUserStore().logout();
            clearLocal();
            return false
        }
    }

    function clearLocal() {
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
        useUserStore().logout()
    }

    async function enterProfile(profile: Responsible) {
        if (!selectedTenant.value) throw new Error('Aucune entreprise sélectionnée.')
        if (integratorStorage.context()) await releaseContext()
        const response = await IntegratorService.select(selectedTenant.value.subdomain, profile.guid)
        // On récupère le profil et son tenant vérifiés par le master, et non les données des cartes.
        let profileData: { user: any; tenant: any }
        try {
            profileData = await IntegratorService.profile(response.contextToken)
        } catch (error) {
            await IntegratorService.leave(response.contextToken).catch(() => undefined);
            throw error
        }
        if (!profileData.user || !profileData.tenant) throw new Error('Profil incomplet, impossible d’ouvrir l’espace.')
        integratorStorage.setContext(response.contextToken);
        activeContext.value = response.contextToken
        selectedResponsible.value = profile
        try {
            await useUserStore().setAuthData({
                success: true,
                data: {user: profileData.user, tenant: profileData.tenant, message: 'Accès intégrateur'}
            } as any)
        } catch (error) {
            await releaseContext()
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
        request,
        verify,
        loadTenants,
        loadResponsibles,
        releaseContext,
        enterProfile,
        logout
    }
})
