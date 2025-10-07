// composables/useEmployeeStore.ts
import { ref, computed } from 'vue'

interface Employee {
  id: number
  name: string
  initials: string
  position: string
  email: string
  siteId: number
  managerId: number
  punctualityScore: number
  punctualityDetails: {
    onTime: number
    totalDays: number
    late: number
    absent: number
  }
  hireDate: string
  avatar?: string
}

interface AttendanceRecord {
  employeeId: number
  date: string
  status: 'present' | 'late' | 'absent' | 'info'
  arrivalTime?: string
  lateMinutes?: number
  reason?: string
  isJustified?: boolean
}

interface Site {
  id: number
  name: string
  address: string
  managerId: number
  description: string
}

// État global partagé
const employees = ref<Employee[]>([])
const attendanceHistory = ref<AttendanceRecord[]>([])
const sites = ref<Site[]>([])

// Flag pour vérifier si les données sont initialisées
const isInitialized = ref(false)

export function useEmployeeStore() {

  // Initialiser les sites (en dur pour le moment)
  const initializeSites = () => {
    if (sites.value.length === 0) {
      sites.value = [
        {
          id: 1,
          name: 'Douala Centre',
          address: '123 Avenue de l\'Indépendance, Douala',
          managerId: 1,
          description: 'Siège social'
        },
        {
          id: 2,
          name: 'Chantier Bonabéri',
          address: 'Zone industrielle Bonabéri, Douala',
          managerId: 1,
          description: 'Chantier principal'
        },
        {
          id: 3,
          name: 'Bureau Central',
          address: 'Centre-ville, Douala',
          managerId: 1,
          description: 'Bureau administratif'
        },
        {
          id: 4,
          name: 'CCIMA',
          address: 'Centre de formation CCIMA, Douala',
          managerId: 1,
          description: 'Centre de formation'
        }
      ]
    }
  }

  // Initialiser les employés de base
  const initializeEmployees = () => {
    if (employees.value.length === 0) {
      employees.value = [
        {
          id: 1,
          name: 'Samuel Femo',
          initials: 'SF',
          position: 'Développeur Senior',
          email: 'samuel.femo@company.com',
          siteId: 1,
          managerId: 1,
          punctualityScore: 0,
          punctualityDetails: { onTime: 0, totalDays: 0, late: 0, absent: 0 },
          hireDate: '2023-01-15'
        },
        {
          id: 2,
          name: 'Manfred Moukate',
          initials: 'MM',
          position: 'Chef de Chantier',
          email: 'manfred.moukate@company.com',
          siteId: 2,
          managerId: 1,
          punctualityScore: 0,
          punctualityDetails: { onTime: 0, totalDays: 0, late: 0, absent: 0 },
          hireDate: '2023-03-10'
        },
        {
          id: 3,
          name: 'Jordan',
          initials: 'J',
          position: 'Assistant Manager',
          email: 'jordan@company.com',
          siteId: 3,
          managerId: 1,
          punctualityScore: 0,
          punctualityDetails: { onTime: 0, totalDays: 0, late: 0, absent: 0 },
          hireDate: '2023-02-01'
        },
        {
          id: 4,
          name: 'Jean Djoko',
          initials: 'JD',
          position: 'Technicien',
          email: 'jean.djoko@company.com',
          siteId: 1,
          managerId: 1,
          punctualityScore: 0,
          punctualityDetails: { onTime: 0, totalDays: 0, late: 0, absent: 0 },
          hireDate: '2022-11-20'
        },
        {
          id: 5,
          name: 'Marie Kengne',
          initials: 'MK',
          position: 'Ingénieur Travaux',
          email: 'marie.kengne@company.com',
          siteId: 2,
          managerId: 1,
          punctualityScore: 0,
          punctualityDetails: { onTime: 0, totalDays: 0, late: 0, absent: 0 },
          hireDate: '2023-05-01'
        },
        {
          id: 6,
          name: 'Sophie Raoul',
          initials: 'SR',
          position: 'Responsable RH',
          email: 'sophie.raoul@company.com',
          siteId: 1,
          managerId: 1,
          punctualityScore: 0,
          punctualityDetails: { onTime: 0, totalDays: 0, late: 0, absent: 0 },
          hireDate: '2024-02-28'
        },
        {
          id: 7,
          name: 'Alex Tchioffo',
          initials: 'AT',
          position: 'Agent de sécurité',
          email: 'alex.tchioffo@company.com',
          siteId: 4,
          managerId: 1,
          punctualityScore: 0,
          punctualityDetails: { onTime: 0, totalDays: 0, late: 0, absent: 0 },
          hireDate: '2023-09-01'
        },
        {
          id: 8,
          name: 'Tchioffo',
          initials: 'T',
          position: 'Opérateur',
          email: 'tchioffo@company.com',
          siteId: 1,
          managerId: 1,
          punctualityScore: 0,
          punctualityDetails: { onTime: 0, totalDays: 0, late: 0, absent: 0 },
          hireDate: '2023-06-05'
        }
      ]
    }
  }

  // Générer l'historique de présence pour le mois en cours
  const generateMonthlyAttendance = () => {
    if (attendanceHistory.value.length > 0) return // Déjà généré

    const records: AttendanceRecord[] = []
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    const today = currentDate.getDate()

    employees.value.forEach(employee => {
      for (let day = 1; day <= today; day++) {
        const date = new Date(currentYear, currentMonth, day)
        const dateString = date.toISOString().split('T')[0]

        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue

        // Générer un statut aléatoire avec une pondération réaliste
        const random = Math.random()
        let status: 'present' | 'late' | 'absent' | 'info'
        let arrivalTime: string | undefined
        let lateMinutes: number | undefined
        let reason: string | undefined

        if (random < 0.75) { // 75% présent à l'heure
          status = 'present'
          const hour = 7 + Math.floor(Math.random() * 1)
          const minute = Math.floor(Math.random() * 60)
          arrivalTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        } else if (random < 0.90) { // 15% en retard
          status = 'late'
          const hour = 8 + Math.floor(Math.random() * 2)
          const minute = Math.floor(Math.random() * 60)
          arrivalTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          lateMinutes = (hour - 8) * 60 + minute
        } else if (random < 0.97) { // 7% absent
          status = 'absent'
        } else { // 3% congé/formation
          status = 'info'
          const reasons = ['En congé', 'Formation', 'Mission externe', 'Congé maladie']
          reason = reasons[Math.floor(Math.random() * reasons.length)]
        }

        records.push({
          employeeId: employee.id,
          date: dateString,
          status,
          arrivalTime,
          lateMinutes,
          reason,
          isJustified: status === 'absent' ? Math.random() > 0.5 : undefined
        })
      }
    })

    attendanceHistory.value = records
  }

  // Calculer la ponctualité mensuelle de chaque employé
  const calculateMonthlyPunctuality = () => {
    employees.value.forEach(employee => {
      const employeeRecords = attendanceHistory.value.filter(r => r.employeeId === employee.id)
      const totalDays = employeeRecords.length
      const onTimeDays = employeeRecords.filter(r => r.status === 'present').length
      const lateDays = employeeRecords.filter(r => r.status === 'late').length
      const absentDays = employeeRecords.filter(r => r.status === 'absent').length
      const infoDays = employeeRecords.filter(r => r.status === 'info').length
      const workDays = totalDays - infoDays

      if (workDays > 0) {
        const score = Math.round(((onTimeDays * 100 + lateDays * 50) / (workDays * 100)) * 100)
        employee.punctualityScore = score
        employee.punctualityDetails = {
          onTime: onTimeDays,
          totalDays: workDays,
          late: lateDays,
          absent: absentDays
        }
      }
    })
  }

  // Obtenir le statut journalier d'un employé pour une date donnée
  const getEmployeeDailyStatus = (employeeId: number, date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    const record = attendanceHistory.value.find(r =>
      r.employeeId === employeeId && r.date === dateString
    )

    if (!record) {
      return { status: 'absent' as const, statusText: 'Absence non enregistrée' }
    }

    let statusText = ''
    switch (record.status) {
      case 'present':
        statusText = `Présent (${record.arrivalTime})`
        break
      case 'late':
        statusText = `En retard (${record.arrivalTime}) - ${record.lateMinutes} min`
        break
      case 'absent':
        statusText = record.isJustified ? 'Absent justifié' : 'Absent non justifié'
        break
      case 'info':
        statusText = record.reason || 'Congé/Formation'
        break
    }

    return { status: record.status, statusText }
  }

  // Obtenir les statistiques pour une date donnée
  const getDailyStats = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    const dayRecords = attendanceHistory.value.filter(r => r.date === dateString)

    return {
      present: dayRecords.filter(r => r.status === 'present').length,
      late: dayRecords.filter(r => r.status === 'late').length,
      absent: dayRecords.filter(r => r.status === 'absent').length,
      info: dayRecords.filter(r => r.status === 'info').length
    }
  }

  // Obtenir les intervalles d'arrivée pour une date donnée
  const getArrivalIntervals = (date: Date) => {
    const intervals = [
      { range: '7h-8h', count: 0 },
      { range: '8h-8h30', count: 0 },
      { range: '8h30-9h', count: 0 },
      { range: '9h-10h', count: 0 },
      { range: '> 10h', count: 0 }
    ]

    const dateString = date.toISOString().split('T')[0]
    const dayRecords = attendanceHistory.value.filter(r =>
      r.date === dateString &&
      (r.status === 'present' || r.status === 'late') &&
      r.arrivalTime
    )

    dayRecords.forEach(record => {
      if (!record.arrivalTime) return

      const [hour, minute] = record.arrivalTime.split(':').map(Number)
      const totalMinutes = hour * 60 + minute

      if (totalMinutes >= 7 * 60 && totalMinutes < 8 * 60) {
        intervals[0].count++
      } else if (totalMinutes >= 8 * 60 && totalMinutes < 8 * 60 + 30) {
        intervals[1].count++
      } else if (totalMinutes >= 8 * 60 + 30 && totalMinutes < 9 * 60) {
        intervals[2].count++
      } else if (totalMinutes >= 9 * 60 && totalMinutes < 10 * 60) {
        intervals[3].count++
      } else if (totalMinutes >= 10 * 60) {
        intervals[4].count++
      }
    })

    return intervals
  }

  // Obtenir le nom d'un site
  const getSiteName = (siteId: number): string => {
    const site = sites.value.find(s => s.id === siteId)
    return site ? site.name : 'Site inconnu'
  }

  // Ajouter un employé
  const addEmployee = (employee: Employee) => {
    employees.value.push(employee)
    // Générer l'historique pour le nouvel employé
    generateMonthlyAttendance()
    calculateMonthlyPunctuality()
  }

  // Supprimer un employé
  const removeEmployee = (employeeId: number) => {
    const index = employees.value.findIndex(emp => emp.id === employeeId)
    if (index !== -1) {
      employees.value.splice(index, 1)
      // Nettoyer l'historique
      attendanceHistory.value = attendanceHistory.value.filter(r => r.employeeId !== employeeId)
    }
  }

  // Ajouter un site
  const addSite = (site: Site) => {
    sites.value.push(site)
  }

  // Récupérer les sites depuis une API (à implémenter plus tard)
  const fetchSitesFromAPI = async () => {
    try {
      // const response = await fetch('/api/sites')
      // const data = await response.json()
      // sites.value = data
      console.log('API call to fetch sites - To be implemented')
    } catch (error) {
      console.error('Error fetching sites:', error)
    }
  }

  // Initialiser toutes les données
  const initialize = () => {
    if (!isInitialized.value) {
      initializeSites()
      initializeEmployees()
      generateMonthlyAttendance()
      calculateMonthlyPunctuality()
      isInitialized.value = true
    }
  }

  return {
    // État
    employees: computed(() => employees.value),
    attendanceHistory: computed(() => attendanceHistory.value),
    sites: computed(() => sites.value),

    // Méthodes
    initialize,
    getEmployeeDailyStatus,
    getDailyStats,
    getArrivalIntervals,
    getSiteName,
    addEmployee,
    removeEmployee,
    addSite,
    fetchSitesFromAPI
  }
}