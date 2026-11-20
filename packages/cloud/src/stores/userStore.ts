// composables/userStore.ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import UserService from '../service/UserService';

import { useTeamStore } from '@/stores/teamStore';
import { sessionExpiry } from '@/utils/sessionExpiry';

interface UserRole {
  guid: string;
  code: string;
  name: string;
  description: string;
  permissions: Record<string, any>;
}

export interface Address {
  city: string;
  location: string;
  place_name: string;
}

export interface Tenant {
  guid: string;
  code: string;
  name: string;
  country: string;
  currency: string;
  language: string;
  timezone: string;
  tax_number: string;
  tax_exempt: string;
  email: string;
  phone: string;
  address: Address;
  status: boolean;
  short_name: string;
  registration_number: string;
  employee_count: number[];
  subdomain: string;
}

export interface User {
  active: boolean;
  avatar_url: string | null;
  country: string;
  department: string;
  email: string;
  employee_code: string;
  employee_color: string | null;
  first_name: string;
  guid: string;
  hire_date: string;
  job_title: string;
  last_login_at: string | null;
  last_name: string;
  phone_number: string;
  roles: UserRole[];
  tenant: string;
}

interface AuthResponse {
  success: boolean;
  data: {
    message: string;
    tenant: Tenant;
    user: User;
    access_token: string;
    expires_in: number;
  };
}

export interface Subordinate {
  id: number;
  guid?: string;
  name: string;
  email: string;
  position: string;
  siteId: number | string;
  punctualityScore: number;
  avatar?: string;
  initials: string;
  employeeColor?: string | null;
}

interface StoredData {
  user: User;
  tenant: Tenant;
  expiresAt: number;
}

export const useUserStore = defineStore('user', () => {
  // Local cache lifetime only; does not change tokens or server authentication.
  const sessionGeneration = ref(0);
  // État
  const user = ref<User | null>(null);
  const tenant = ref<Tenant | null>(null);
  const isAuthenticated = ref<boolean>(false);
  const subordinates = ref<Subordinate[]>([]);
  const isLoadingSubordinates = ref<boolean>(false);

  // Initialisation depuis localStorage
  const initializeFromStorage = (): StoredData | null => {
    try {
      const savedData = localStorage.getItem('authData');
      if (!savedData) return null;

      const data: StoredData = JSON.parse(savedData);
      const now = Date.now();

      const expiresAt = sessionExpiry(localStorage.getItem('auth_token'), data.expiresAt);
      if (!data.user || !data.tenant || expiresAt === null || now >= expiresAt) {
        console.log('⏳ Session expirée');
        localStorage.removeItem('authData');
        return null;
      }

      data.expiresAt = expiresAt;
      localStorage.setItem('authData', JSON.stringify(data));
      console.log('✅ Données chargées depuis localStorage');
      return data;
    } catch (error) {
      console.error('❌ Erreur initialisation localStorage:', error);
      localStorage.removeItem('authData');
      return null;
    }
  };

  // Initialisation automatique
  const initialData = initializeFromStorage();
  if (initialData) {
    user.value = initialData.user;
    tenant.value = initialData.tenant;
    isAuthenticated.value = true;
  }

  // Getters
  const fullName = computed(() => {
    if (!user.value) return '';
    const firstName = user.value.first_name || '';
    const lastName = user.value.last_name || '';
    return `${firstName} ${lastName}`.trim();
  });

  const userInitials = computed(() => {
    if (!user.value) return '?';
    const firstName = user.value.first_name || '';
    const lastName = user.value.last_name || '';
    const firstInitial = firstName.charAt(0) || '?';
    const lastInitial = lastName.charAt(0) || '?';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  });

  const tenantName = computed(() => tenant.value?.name || '');
  const employeeCode = computed(() => user.value?.employee_code || '');
  const department = computed(() => user.value?.department || '');
  const jobTitle = computed(() => user.value?.job_title || '');
  const userRoles = computed(() => user.value?.roles || []);
  const teamList = computed(() => subordinates.value);

  const hasRole = (roleCode: string) => {
    return user.value?.roles?.some((role) => role.code === roleCode) || false;
  };

  // Sauvegarde
  const saveToStorage = (userData: User, tenantData: Tenant, expiresAt: number) => {
    try {
      const dataToStore: StoredData = {
        user: userData,
        tenant: tenantData,
        expiresAt,
      };
      localStorage.setItem('authData', JSON.stringify(dataToStore));
      console.log('💾 Données sauvegardées avec expiration:', new Date(expiresAt));
    } catch (error) {
      console.error('❌ Erreur sauvegarde localStorage:', error);
    }
  };

  // // 🎯 NOUVELLE FONCTION: Transformer les données API en format Subordinate
  // const transformSubordinate = (apiData: SubordinateResponse): Subordinate => {
  //   const firstName = apiData.first_name || ''
  //   const lastName = apiData.last_name || ''
  //   const name = `${firstName} ${lastName}`.trim() || apiData.name || 'N/A'
  //
  //   const firstInitial = firstName.charAt(0) || name.charAt(0) || '?'
  //   const lastInitial = lastName.charAt(0) || name.charAt(1) || '?'
  //   const initials = `${firstInitial}${lastInitial}`.toUpperCase()
  //
  //   return {
  //     id: apiData.id,
  //     guid: apiData.guid,
  //     name,
  //     email: apiData.email || '',
  //     position: apiData.job_title || apiData.position || 'N/A',
  //     siteId: apiData.siteId || apiData.department || 'default',
  //     punctualityScore: apiData.punctualityScore || 0,
  //     avatar: apiData.avatar,
  //     initials
  //   }
  // }

  // 🎯 NOUVELLE FONCTION: Charger les subordonnés depuis l'API

  const loadSubordinates = async () => {
    if (!user.value?.guid) {
      console.warn('⚠️ Impossible de charger les subordonnés: utilisateur non connecté');
      return;
    }

    isLoadingSubordinates.value = true;

    try {
      console.log('🔄 Chargement des subordonnés pour:', user.value.guid);

      const response = await UserService.listSubordinates(user.value.guid);

      if (response.success && response.data?.hierarchy) {
        // ✅ CORRECTION: Accéder à hierarchy et transformer correctement
        const transformedSubordinates = response.data.hierarchy.map((item: any) => {
          const firstName = item.user.first_name || '';
          const lastName = item.user.last_name || '';
          const name = `${firstName} ${lastName}`.trim();

          const firstInitial = firstName.charAt(0) || '?';
          const lastInitial = lastName.charAt(0) || '?';
          const initials = `${firstInitial}${lastInitial}`.toUpperCase();

          return {
            id: parseInt(item.user.guid) || 0,
            guid: item.user.guid,
            name,
            email: item.user.email || '',
            position: item.roles?.[0]?.role || item.user.job_title || 'N/A',
            siteId: item.user.department || 'default',
            punctualityScore: 0,
            avatar: item.user.avatar_url,
            employeeColor: item.user.employee_color ?? null,
            initials,
          };
        });

        subordinates.value = transformedSubordinates;

        console.log(
          `✅ ${transformedSubordinates.length} subordonnés chargés:`,
          transformedSubordinates,
        );
      } else {
        console.warn('⚠️ Aucun subordonnŽ trouvé ou réponse invalide');
        subordinates.value = [];
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des subordonnés:', error);
      subordinates.value = [];
    } finally {
      isLoadingSubordinates.value = false;
    }
  };

  // Action: Définir les données d'authentification
  const setAuthData = async (authResponse: AuthResponse) => {
    if (!authResponse.success || !authResponse.data) {
      console.error('❌ Store - Données API invalides:', authResponse);
      return;
    }

    const { user: authUser, tenant: authTenant, access_token, expires_in } = authResponse.data;

    // Vérifier avant de modifier l'état d'authentification
    if (!authUser || !authTenant || !access_token) {
      throw new Error('Incomplete authentication response');
    }

    const expiresAt = sessionExpiry(access_token, Date.now() + expires_in * 1000);
    if (!Number.isFinite(expires_in) || expires_in <= 0 || expiresAt === null || expiresAt <= Date.now()) {
      throw new Error('Invalid session expiration');
    }

    // Enregistrer le jeton avant les appels API secondaires
    sessionGeneration.value++;
    localStorage.setItem('auth_token', access_token);

    user.value = authUser;
    tenant.value = authTenant;
    isAuthenticated.value = true;

    saveToStorage(authUser, authTenant, expiresAt);

    console.log('✅ Store - Authentification réussie:', {
      fullName: fullName.value,
      tenant: tenantName.value,
      initials: userInitials.value,
    });

    // Charger les subordonnés après authentification
    await loadSubordinates();
  };

  // const setAuthData = async (authResponse: AuthResponse) => {
  //   if (authResponse.success && authResponse.data) {
  //     user.value = authResponse.data.user;
  //     tenant.value = authResponse.data.tenant;
  //     isAuthenticated.value = true;
  //
  //     saveToStorage(authResponse.data.user, authResponse.data.tenant);
  //
  //     console.log('✅ Store - Authentification réussie:', {
  //       fullName: fullName.value,
  //       tenant: tenantName.value,
  //       initials: userInitials.value,
  //     });
  //
  //     // 🎯 CHARGEMENT AUTOMATIQUE des subordonnés après connexion
  //     await loadSubordinates();
  //   } else {
  //     console.error('❌ Store - Données API invalides:', authResponse);
  //   }
  // };

  // Action: Définir manuellement les subordonnés (optionnel)
  const setSubordinates = (subordinatesList: Subordinate[]) => {
    subordinates.value = subordinatesList;
    console.log(`✅ ${subordinatesList.length} subordonnés définis manuellement.`);
  };

  // Action: Ajouter un subordonné
  const addSubordinate = (subordinate: Subordinate) => {
    subordinates.value.push(subordinate);
    console.log(`✅ Subordonné ajouté: ${subordinate.name}`);
  };

  // Action: Supprimer un subordonné
  const removeSubordinate = (subordinateId: number) => {
    const index = subordinates.value.findIndex((s) => s.id === subordinateId);
    if (index !== -1) {
      const removed = subordinates.value.splice(index, 1)[0];
      console.log(`✅ Subordonné supprimé: ${removed.name}`);
    }
  };

  // Vérification de session
  const checkSession = (): boolean => {
    if (initializeFromStorage()) return true;
    invalidateSession();
    return false;
  };

  // Local invalidation only; the explicit logout flow remains unchanged.
  const invalidateSession = () => {
    sessionGeneration.value++;
    user.value = null;
    tenant.value = null;
    isAuthenticated.value = false;
    localStorage.removeItem('authData');
    localStorage.removeItem('auth_token');
  };

  // Révoquer le jeton capturé avant le nettoyage local.
  const logout = async (): Promise<{ revoked: boolean; localCleared: boolean }> => {
    if (delegatedContext.value) {
      const { useIntegratorStore } = await import('./integratorStore');
      await useIntegratorStore().releaseContext();
      return { revoked: false, localCleared: true };
    }
    const token = localStorage.getItem('auth_token');
    const generation = sessionGeneration.value;
    let revoked = false;
    let localCleared = false;
    try {
      if (token) {
        const { revokeSession } = await import('../service/SessionLogoutService');
        revoked = await revokeSession(token);
        if (!revoked) console.warn('Révocation de session non confirmée.');
      }
    } catch {
      console.warn('Révocation de session non confirmée.');
    } finally {
      // Une réponse tardive ne doit pas effacer une connexion plus récente.
      if (generation === sessionGeneration.value && token === localStorage.getItem('auth_token')) {
        sessionGeneration.value++;
        user.value = null;
        tenant.value = null;
        isAuthenticated.value = false;
        subordinates.value = [];
        try {
          useTeamStore().clearCache();
        } finally {
          localStorage.removeItem('authData');
          localStorage.removeItem('auth_token');
          localCleared = true;
        }
      }
    }
    return { revoked, localCleared };
  };

  // Recharger depuis storage
  const loadFromStorage = async (): Promise<boolean> => {
    const data = initializeFromStorage();

    if (data) {
      sessionGeneration.value++;
      user.value = data.user;
      tenant.value = data.tenant;
      isAuthenticated.value = true;

      console.log('🔄 Store rechargé:', {
        fullName: fullName.value,
        tenant: tenantName.value,
      });

      // 🎯 Recharger les subordonnés après restauration de session
      await loadSubordinates();

      return true;
    }

    return false;
  };

  // Projection UI d'un contexte délégué vérifié ; aucune session manager émise.
  const delegatedContext = ref(false);
  const setDelegatedProfile = (profile: { user: User; tenant: Tenant }) => {
    const changed = !delegatedContext.value || user.value?.guid !== profile.user.guid || tenant.value?.guid !== profile.tenant.guid;
    if (changed) {
      sessionGeneration.value++;
      subordinates.value = [];
      useTeamStore().clearCache();
    }
    user.value = profile.user;
    tenant.value = profile.tenant;
    delegatedContext.value = true;
  };
  const clearDelegatedProfile = () => {
    if (!delegatedContext.value) return;
    sessionGeneration.value++;
    delegatedContext.value = false;
    subordinates.value = [];
    useTeamStore().clearCache();
    const saved = initializeFromStorage();
    user.value = saved?.user ?? null;
    tenant.value = saved?.tenant ?? null;
    isAuthenticated.value = Boolean(saved);
  };

  // Mise à jour partielle
  const updateUserData = (updates: Partial<User>) => {
    if (!user.value) return;

    user.value = { ...user.value, ...updates };

    if (tenant.value && !delegatedContext.value) {
      const data = initializeFromStorage();
      if (!data) { invalidateSession(); return; }
      saveToStorage(user.value, tenant.value, data.expiresAt);
      console.log('🔄 Données utilisateur mises à jour');
    }
  };

  return {
    sessionGeneration,
    delegatedContext,
    setDelegatedProfile,
    clearDelegatedProfile,
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
    invalidateSession,
    loadFromStorage,
    updateUserData,
    hasRole,
    setSubordinates,
    loadSubordinates,
    addSubordinate,
    removeSubordinate,
  };
});
