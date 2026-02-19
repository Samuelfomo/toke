// composables/userStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import UserService, { SubordinateResponse } from '../service/UserService'
import {useTeamStore} from "@/stores/teamStore";

interface UserRole {
  guid: string
  code: string
  name: string
  description: string
  permissions: Record<string, any>
}

export interface Address {
  city: string
  location: string
  place_name: string
}

export interface Tenant {
  guid: string
  code: string
  name: string
  country: string
  currency: string
  language: string
  timezone: string
  tax_number: string
  tax_exempt: string
  email: string
  phone: string
  address: Address
  status: boolean
  short_name: string
  registration_number: string
  employee_count: number[]
  subdomain: string
}

export interface User {
  active: boolean
  avatar_url: string | null
  country: string
  department: string
  email: string
  employee_code: string
  first_name: string
  guid: string
  hire_date: string
  job_title: string
  last_login_at: string | null
  last_name: string
  phone_number: string
  roles: UserRole[]
  tenant: string
}

interface AuthResponse {
  success: boolean
  data: {
    message: string
    tenant: Tenant
    user: User
  }
}

export interface Subordinate {
  id: number
  guid?: string
  name: string
  email: string
  position: string
  siteId: number | string
  punctualityScore: number
  avatar?: string
  initials: string
}

interface StoredData {
  user: User
  tenant: Tenant
  expiresAt: number
}

export const useUserStore = defineStore('user', () => {
  // État
  const user = ref<User | null>(null)
  const tenant = ref<Tenant | null>(null)
  const isAuthenticated = ref<boolean>(false)
  const subordinates = ref<Subordinate[]>([])
  const isLoadingSubordinates = ref<boolean>(false)

  // Initialisation depuis localStorage
  const initializeFromStorage = (): StoredData | null => {
    try {
      const savedData = localStorage.getItem('authData')
      if (!savedData) return null

      const data: StoredData = JSON.parse(savedData)
      const now = Date.now()

      if (data.expiresAt && now > data.expiresAt) {
        console.log('⏳ Session expirée')
        localStorage.removeItem('authData')
        return null
      }

      console.log('✅ Données chargées depuis localStorage')
      return data
    } catch (error) {
      console.error('❌ Erreur initialisation localStorage:', error)
      localStorage.removeItem('authData')
      return null
    }
  }

  // Initialisation automatique
  const initialData = initializeFromStorage()
  if (initialData) {
    user.value = initialData.user
    tenant.value = initialData.tenant
    isAuthenticated.value = true
  }

  // Getters
  const fullName = computed(() => {
    if (!user.value) return ''
    const firstName = user.value.first_name || ''
    const lastName = user.value.last_name || ''
    return `${firstName} ${lastName}`.trim()
  })

  const userInitials = computed(() => {
    if (!user.value) return '?'
    const firstName = user.value.first_name || ''
    const lastName = user.value.last_name || ''
    const firstInitial = firstName.charAt(0) || '?'
    const lastInitial = lastName.charAt(0) || '?'
    return `${firstInitial}${lastInitial}`.toUpperCase()
  })

  const tenantName = computed(() => tenant.value?.name || '')
  const employeeCode = computed(() => user.value?.employee_code || '')
  const department = computed(() => user.value?.department || '')
  const jobTitle = computed(() => user.value?.job_title || '')
  const userRoles = computed(() => user.value?.roles || [])
  const teamList = computed(() => subordinates.value)

  const hasRole = (roleCode: string) => {
    return user.value?.roles?.some(role => role.code === roleCode) || false
  }

  // Sauvegarde
  const saveToStorage = (userData: User, tenantData: Tenant) => {
    try {
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000
      const dataToStore: StoredData = {
        user: userData,
        tenant: tenantData,
        expiresAt
      }
      localStorage.setItem('authData', JSON.stringify(dataToStore))
      console.log('💾 Données sauvegardées avec expiration:', new Date(expiresAt))
    } catch (error) {
      console.error('❌ Erreur sauvegarde localStorage:', error)
    }
  }

  // 🎯 NOUVELLE FONCTION: Transformer les données API en format Subordinate
  const transformSubordinate = (apiData: SubordinateResponse): Subordinate => {
    const firstName = apiData.first_name || ''
    const lastName = apiData.last_name || ''
    const name = `${firstName} ${lastName}`.trim() || apiData.name || 'N/A'

    const firstInitial = firstName.charAt(0) || name.charAt(0) || '?'
    const lastInitial = lastName.charAt(0) || name.charAt(1) || '?'
    const initials = `${firstInitial}${lastInitial}`.toUpperCase()

    return {
      id: apiData.id,
      guid: apiData.guid,
      name,
      email: apiData.email || '',
      position: apiData.job_title || apiData.position || 'N/A',
      siteId: apiData.siteId || apiData.department || 'default',
      punctualityScore: apiData.punctualityScore || 0,
      avatar: apiData.avatar,
      initials
    }
  }

  // 🎯 NOUVELLE FONCTION: Charger les subordonnés depuis l'API

  const loadSubordinates = async () => {
    if (!user.value?.guid) {
      console.warn('⚠️ Impossible de charger les subordonnés: utilisateur non connecté')
      return
    }

    isLoadingSubordinates.value = true

    try {
      console.log('🔄 Chargement des subordonnés pour:', user.value.guid)

      const response = await UserService.listSubordinates(user.value.guid)

      if (response.success && response.data?.hierarchy) {
        // ✅ CORRECTION: Accéder à hierarchy et transformer correctement
        const transformedSubordinates = response.data.hierarchy.map((item: any) => {
          const firstName = item.user.first_name || ''
          const lastName = item.user.last_name || ''
          const name = `${firstName} ${lastName}`.trim()

          const firstInitial = firstName.charAt(0) || '?'
          const lastInitial = lastName.charAt(0) || '?'
          const initials = `${firstInitial}${lastInitial}`.toUpperCase()

          return {
            id: parseInt(item.user.guid) || 0,
            guid: item.user.guid,
            name,
            email: item.user.email || '',
            position: item.roles?.[0]?.role || item.user.job_title || 'N/A',
            siteId: item.user.department || 'default',
            punctualityScore: 0,
            avatar: item.user.avatar_url,
            initials
          }
        })

        subordinates.value = transformedSubordinates

        console.log(`✅ ${transformedSubordinates.length} subordonnés chargés:`, transformedSubordinates)
      } else {
        console.warn('⚠️ Aucun subordonnŽ trouvé ou réponse invalide')
        subordinates.value = []
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des subordonnés:', error)
      subordinates.value = []
    } finally {
      isLoadingSubordinates.value = false
    }
  }

  // Action: Définir les données d'authentification
  const setAuthData = async (authResponse: AuthResponse) => {
    if (authResponse.success && authResponse.data) {
      user.value = authResponse.data.user
      tenant.value = authResponse.data.tenant
      isAuthenticated.value = true

      saveToStorage(authResponse.data.user, authResponse.data.tenant)

      console.log('✅ Store - Authentification réussie:', {
        fullName: fullName.value,
        tenant: tenantName.value,
        initials: userInitials.value
      })

      // 🎯 CHARGEMENT AUTOMATIQUE des subordonnés après connexion
      await loadSubordinates()
    } else {
      console.error('❌ Store - Données API invalides:', authResponse)
    }
  }

  // Action: Définir manuellement les subordonnés (optionnel)
  const setSubordinates = (subordinatesList: Subordinate[]) => {
    subordinates.value = subordinatesList
    console.log(`✅ ${subordinatesList.length} subordonnés définis manuellement.`)
  }

  // Action: Ajouter un subordonné
  const addSubordinate = (subordinate: Subordinate) => {
    subordinates.value.push(subordinate)
    console.log(`✅ Subordonné ajouté: ${subordinate.name}`)
  }

  // Action: Supprimer un subordonné
  const removeSubordinate = (subordinateId: number) => {
    const index = subordinates.value.findIndex(s => s.id === subordinateId)
    if (index !== -1) {
      const removed = subordinates.value.splice(index, 1)[0]
      console.log(`✅ Subordonné supprimé: ${removed.name}`)
    }
  }

  // Vérification de session
  const checkSession = (): boolean => {
    try {
      const savedData = localStorage.getItem('authData')
      if (!savedData) return false

      const data: StoredData = JSON.parse(savedData)
      const now = Date.now()

      if (data.expiresAt && now > data.expiresAt) {
        console.log('⏳ Session expirée')
        logout()
        return false
      }

      return true
    } catch (error) {
      console.error('❌ Erreur checkSession:', error)
      return false
    }
  }

  // Déconnexion
  const logout = () => {
    user.value = null
    tenant.value = null
    isAuthenticated.value = false
    subordinates.value = []

    const teamStore = useTeamStore()

    teamStore.clearCache()

    localStorage.removeItem('authData')
    console.log('🔴 Store - Utilisateur déconnecté')
  }

  // Recharger depuis storage
  const loadFromStorage = async (): Promise<boolean> => {
    const data = initializeFromStorage()

    if (data) {
      user.value = data.user
      tenant.value = data.tenant
      isAuthenticated.value = true

      console.log('🔄 Store rechargé:', {
        fullName: fullName.value,
        tenant: tenantName.value
      })

      // 🎯 Recharger les subordonnés après restauration de session
      await loadSubordinates()

      return true
    }

    return false
  }

  // Mise à jour partielle
  const updateUserData = (updates: Partial<User>) => {
    if (!user.value) return

    user.value = { ...user.value, ...updates }

    if (tenant.value) {
      saveToStorage(user.value, tenant.value)
      console.log('🔄 Données utilisateur mises à jour')
    }
  }

  return {
    // État
    user,
    tenant,
    isAuthenticated,
    subordinates,
    isLoadingSubordinates,

    // Getters
    fullName,
    userInitials,
    tenantName,
    employeeCode,
    department,
    jobTitle,
    userRoles,
    teamList,

    // Actions
    setAuthData,
    logout,
    checkSession,
    loadFromStorage,
    updateUserData,
    hasRole,
    setSubordinates,
    loadSubordinates,
    addSubordinate,
    removeSubordinate,
  }
})