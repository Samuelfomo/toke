
import type { EmployeePlanningProfile } from '../planningSuggestion.type'

import type {
  EmployeePlanningProfileRow,
  ProfileReadiness,
} from './employeePlanningProfile.type'

import type { TeamEmployee } from '@/stores/teamStore'

export function buildEmployeeProfileRows(
  employees: TeamEmployee[],
  profiles: EmployeePlanningProfile[],
): EmployeePlanningProfileRow[] {
  const profileByUser = new Map(
    profiles
      .filter((profile) => profile.user?.guid)
      .map((profile) => [profile.user!.guid, profile]),
  )

  const rows: EmployeePlanningProfileRow[] = employees.map((employee) => ({
    key: employee.guid,
    person: {
      guid: employee.guid,
      name: employee.name,
      employeeCode: employee.employeeCode ?? null,
    },
    profile: profileByUser.get(employee.guid) ?? null,
    inCurrentTeam: true,
  }))

  const employeeGuids = new Set(employees.map((employee) => employee.guid))

  profiles.forEach((profile) => {
    const user = profile.user
    if (!user || employeeGuids.has(user.guid)) return

    rows.push({
      key: `outside-team:${profile.guid}`,
      person: {
        guid: user.guid,
        name: user.name,
        employeeCode: user.employee_code ?? null,
      },
      profile,
      inCurrentTeam: false,
    })
  })

  return rows.sort((left, right) =>
    left.person.name.localeCompare(right.person.name, 'fr', {
      sensitivity: 'base',
    }),
  )
}

export function duplicateRotationOrders(
  profiles: EmployeePlanningProfile[],
): Set<number> {
  const counts = new Map<number, number>()

  profiles.forEach((profile) => {
    if (
      !profile.active ||
      profile.planning_mode === 'EXCLUDED' ||
      profile.rotation_order === null
    ) {
      return
    }

    counts.set(
      profile.rotation_order,
      (counts.get(profile.rotation_order) ?? 0) + 1,
    )
  })

  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([order]) => order),
  )
}

export function profileReadiness(
  row: EmployeePlanningProfileRow,
  options: {
    teamRotationEnabled: boolean
    duplicateOrders: Set<number>
  },
): ProfileReadiness {
  if (!row.inCurrentTeam) {
    return {
      status: 'OUTSIDE_TEAM',
      label: 'Hors équipe actuelle',
      issues: [
        'Ce profil appartient à un collaborateur qui ne figure plus dans l’équipe actuelle du manager.',
      ],
    }
  }

  const profile = row.profile

  if (!profile) {
    return {
      status: 'UNCONFIGURED',
      label: 'À configurer',
      issues: [
        'Aucun profil de planification actif n’est encore associé à ce collaborateur.',
      ],
    }
  }

  if (!profile.active) {
    return {
      status: 'INACTIVE',
      label: 'Désactivé',
      issues: [
        'Le profil existe, mais il ne peut pas être utilisé par le moteur tant qu’il reste désactivé.',
      ],
    }
  }

  const issues: string[] = []

  if (
    profile.planning_mode === 'FIXED' &&
    !profile.fixed_session_template
  ) {
    issues.push('Le mode fixe exige un horaire type.')
  }

  if (
    options.teamRotationEnabled &&
    profile.planning_mode !== 'EXCLUDED' &&
    profile.rotation_order === null
  ) {
    issues.push('L’ordre de congé est obligatoire avec la rotation d’équipe.')
  }

  if (
    profile.rotation_order !== null &&
    options.duplicateOrders.has(profile.rotation_order)
  ) {
    issues.push(`L’ordre ${profile.rotation_order} est utilisé plusieurs fois.`)
  }

  if (issues.length) {
    return {
      status: 'INCOMPLETE',
      label: 'À corriger',
      issues,
    }
  }

  return {
    status: 'READY',
    label:
      profile.planning_mode === 'EXCLUDED'
        ? 'Exclu correctement'
        : 'Prêt pour la génération',
    issues: [],
  }
}

export function profileStatusClass(status: ProfileReadiness['status']): string {
  return {
    READY: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    INCOMPLETE: 'bg-amber-50 text-amber-700 ring-amber-600/10',
    INACTIVE: 'bg-slate-100 text-slate-600 ring-slate-500/10',
    UNCONFIGURED: 'bg-blue-50 text-blue-700 ring-blue-600/10',
    OUTSIDE_TEAM: 'bg-rose-50 text-rose-700 ring-rose-600/10',
  }[status]
}
