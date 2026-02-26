import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import UserService from '@/service/UserService'
import type { Data, Employee, EmployeesWithoutGroup } from '@/utils/interfaces/equipe.interface'

export interface TeamEmployee {
  id: string
  guid: string
  name: string
  firstName: string
  lastName: string
  position: string
  email: string
  avatar: string | null
  country: string | null
  initials: string
  punctualityScore: number
  roles: any[]
  isActive: boolean
  department: string
  employeeCode: string
  phoneNumber: string
  jobTitle: string
  hireDate: string | null
  groupName: string
  groupGuid: string | null
  assignmentInfo: any
  isManager: boolean
}

export const useTeamStore = defineStore('team', () => {
  // 📦 État
  const employees = ref<TeamEmployee[]>([])
  const rawData = ref<Data | null>(null)
  const lastFetch = ref<number | null>(null)
  const isLoading = ref(false)
  const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 heures apres le chargement

  // 📊 Computed
  const totalEmployees = computed(() => employees.value.length)

  const isCacheValid = computed(() => {
    if (!lastFetch.value) return false
    return Date.now() - lastFetch.value < CACHE_DURATION
  })

  // 🔄 Actions
  const loadTeam = async (managerGuid: string, forceRefresh = false) => {

    // Si cache valide et pas de force refresh, ne rien faire
    if (isCacheValid.value && !forceRefresh) {
      console.log('✅ Utilisation du cache')
      return employees.value
    }

    try {
      isLoading.value = true
      console.log('🔄 Chargement de l\'équipe depuis l\'API...')

      const response = await UserService.listSubordinates(managerGuid)

      if (response.success && response.data) {
        rawData.value = response.data
        const allEmployees: any[] = []

        // Employés groupés
        response.data.employees_by_group?.forEach((groupData: any) => {
          groupData.employees?.forEach((emp: Employee) => {
            allEmployees.push({
              ...emp,
              groupName: groupData.group?.name || 'Sans groupe',
              groupGuid: groupData.group?.guid || null
            })
          })
        })

        // Employés sans groupe
        response.data.employees_without_group?.forEach((emp: EmployeesWithoutGroup) => {
          allEmployees.push({
            ...emp,
            groupName: 'Sans groupe',
            groupGuid: null
          })
        })

        // Transformer les données
        employees.value = allEmployees.map(emp => transformEmployee(emp))
        lastFetch.value = Date.now()

        console.log('✅ Équipe chargée:', employees.value.length)
        return employees.value
      }
    } catch (error) {
      console.error('❌ Erreur chargement équipe:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const getEmployeeById = (guid: string): TeamEmployee | undefined => {
    return employees.value.find(emp => emp.guid === guid)
  }

  const clearCache = () => {
    employees.value = []
    rawData.value = null
    lastFetch.value = null
  }

  const addEmployee = (newEmployee: any) => {
    const transformed = transformEmployee({
      ...newEmployee,
      groupName: 'Sans groupe',
      groupGuid: null,
    })
    employees.value.unshift(transformed)
  }

  return {
    // State
    employees,
    rawData,
    isLoading,
    lastFetch,

    // Computed
    totalEmployees,
    isCacheValid,

    // Actions
    loadTeam,
    getEmployeeById,
    addEmployee,
    clearCache
  }
},{
  persist: {
    key: 'team-store',
    storage: localStorage, // ou sessionStorage
    paths: ['employees', 'rawData', 'lastFetch'] // Ne persiste que ces données
  }
} as any)

// 🛠️ Fonction helper pour transformer les données
function transformEmployee(emp: any): TeamEmployee {
  const firstName = emp.first_name || ''
  const lastName = emp.last_name || ''
  const nameParts = firstName.split(' ')
  const initials = nameParts.length > 1
      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
      : lastName ? `${firstName[0]}${lastName[0]}`.toUpperCase() : firstName[0]?.toUpperCase() || 'U'

  const mainRole = emp.roles?.[0]?.name || 'N/A'
  const isManager = emp.roles.items?.some((r: any) =>
      r.name?.toLowerCase().includes('manager') ||
      r.code?.toLowerCase().includes('manager')
  ) || false

  return {
    id: emp.guid,
    guid: emp.guid,
    name: `${firstName} ${lastName}`.trim() || 'N/A',
    firstName,
    lastName,
    position: emp.job_title || mainRole,
    email: emp.email || 'N/A',
    avatar: emp.avatar_url || null,
    country : emp.country || 'N/A',
    initials,
    punctualityScore: Math.floor(Math.random() * 30) + 70,
    roles: emp.roles || [],
    isActive: emp.active || false,
    department: emp.department || 'N/A',
    employeeCode: emp.employee_code || 'N/A',
    phoneNumber: emp.phone_number || 'N/A',
    jobTitle: emp.job_title || 'N/A',
    hireDate: emp.hire_date || null,
    groupName: emp.groupName,
    groupGuid: emp.groupGuid,
    assignmentInfo: emp.assignment_info || null,
    isManager
  }
}