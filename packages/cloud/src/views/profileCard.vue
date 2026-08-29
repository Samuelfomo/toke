<template>
  <div class="flex min-h-screen flex-col bg-gradient-to-r from-[#d0e8f7] via-[#f0e4f5] to-[#d0e8f7] text-slate-900">
    <Header />

    <main class="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <button
        type="button"
        class="mb-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/70 bg-white/80 px-3.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AAD]/40"
        @click="goBack"
      >
        <IconArrowLeft :size="17" />
        Retour à l’équipe
      </button>

      <div v-if="isLoading" class="space-y-5" aria-busy="true">
        <section class="animate-pulse rounded-2xl border border-white/70 bg-white/80 p-6 shadow-sm">
          <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div class="h-24 w-24 rounded-2xl bg-slate-200"></div>
            <div class="flex-1 space-y-3">
              <div class="h-7 w-60 max-w-full rounded-lg bg-slate-200"></div>
              <div class="h-4 w-40 rounded bg-slate-200"></div>
              <div class="h-6 w-24 rounded-full bg-slate-200"></div>
            </div>
          </div>
        </section>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="index in 6" :key="index" class="h-32 animate-pulse rounded-2xl border border-white/70 bg-white/80"></div>
        </div>
      </div>

      <section v-else-if="error || !employee" class="rounded-2xl border border-rose-200 bg-white/90 px-5 py-14 text-center shadow-sm">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <IconAlertTriangle :size="27" />
        </div>
        <h1 class="mt-4 text-lg font-bold text-slate-900">Collaborateur introuvable</h1>
        <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{{ error || 'Impossible de charger cette fiche.' }}</p>
        <button
          type="button"
          class="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#004AAD] px-4 text-sm font-bold text-white hover:bg-[#003a8c]"
          @click="loadEmployeeData"
        >
          <IconRefresh :size="16" />
          Réessayer
        </button>
      </section>

      <template v-else>
        <section class="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
          <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <img
                v-if="employee.avatar"
                :src="employee.avatar"
                :alt="employee.name"
                class="h-24 w-24 shrink-0 rounded-2xl border-4 border-white object-cover shadow-sm"
              />
              <div v-else class="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-[#004AAD] text-2xl font-bold text-white shadow-sm">
                {{ employee.initials }}
              </div>

              <div class="min-w-0">
                <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#004AAD]">Espace collaborateur</p>
                <h1 class="mt-1 break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{{ employee.name }}</h1>
                <p class="mt-1 text-sm font-semibold text-slate-600">{{ employee.position }}</p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <span class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                    <span class="h-1.5 w-1.5 rounded-full" :class="employee.isActive ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                    {{ employee.isActive ? 'Compte actif' : 'Compte inactif' }}
                  </span>
                  <span v-if="employee.isManager" class="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700">
                    <IconUsersGroup :size="14" />
                    Manager
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#004AAD] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#003a8c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AAD]/40 sm:w-auto"
              @click="manageProfile"
            >
              Ouvrir la fiche complète
              <IconArrowRight :size="16" />
            </button>
          </div>
        </section>

        <section class="mt-5">
          <div class="mb-4">
            <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Accès rapides</p>
            <h2 class="mt-1 text-lg font-bold text-slate-950">Que souhaitez-vous consulter ?</h2>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button
              v-for="action in actions"
              :key="action.id"
              type="button"
              class="group flex min-h-32 items-start gap-4 rounded-2xl border border-white/70 bg-white/80 p-4 text-left shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AAD]/30"
              @click="action.run"
            >
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" :class="action.iconClass">
                <component :is="action.icon" :size="20" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-bold text-slate-900">{{ action.title }}</span>
                <span class="mt-1 block text-xs leading-5 text-slate-500">{{ action.description }}</span>
              </span>
              <IconChevronRight :size="17" class="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
            </button>
          </div>
        </section>

        <section class="mt-5 grid gap-4 lg:grid-cols-2">
          <article class="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
            <div class="flex items-center gap-2.5">
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <IconMail :size="18" />
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Contact</p>
                <h2 class="text-sm font-bold text-slate-900">Coordonnées rapides</h2>
              </div>
            </div>

            <div class="mt-4 space-y-2">
              <a v-if="employee.email" :href="`mailto:${employee.email}`" class="group flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 hover:border-sky-200 hover:bg-sky-50/40">
                <span class="min-w-0 truncate text-sm font-semibold text-slate-700">{{ employee.email }}</span>
                <IconChevronRight :size="15" class="shrink-0 text-slate-300" />
              </a>
              <a v-if="employee.phone" :href="`tel:${employee.phone}`" class="group flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 hover:border-emerald-200 hover:bg-emerald-50/40">
                <span class="min-w-0 truncate text-sm font-semibold text-slate-700">{{ employee.phone }}</span>
                <IconChevronRight :size="15" class="shrink-0 text-slate-300" />
              </a>
              <p v-if="!employee.email && !employee.phone" class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                Aucune coordonnée disponible.
              </p>
            </div>
          </article>

          <article class="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
            <div class="flex items-center gap-2.5">
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <IconBriefcase :size="18" />
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Informations</p>
                <h2 class="text-sm font-bold text-slate-900">Repères professionnels</h2>
              </div>
            </div>

            <dl class="mt-4 divide-y divide-slate-100">
              <div class="flex items-start justify-between gap-4 py-2.5 first:pt-0">
                <dt class="text-xs text-slate-500">Département</dt>
                <dd class="max-w-[65%] text-right text-xs font-bold text-slate-800">{{ employee.department || 'Non renseigné' }}</dd>
              </div>
              <div class="flex items-start justify-between gap-4 py-2.5">
                <dt class="text-xs text-slate-500">Matricule</dt>
                <dd class="max-w-[65%] break-all text-right text-xs font-bold text-slate-800">{{ employee.employeeCode || 'Non renseigné' }}</dd>
              </div>
              <div class="flex items-start justify-between gap-4 py-2.5 last:pb-0">
                <dt class="text-xs text-slate-500">Rôle principal</dt>
                <dd class="max-w-[65%] text-right text-xs font-bold text-slate-800">{{ employee.isManager ? 'Manager' : 'Employé' }}</dd>
              </div>
            </dl>
          </article>
        </section>
      </template>
    </main>

    <Footer />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowRight,
  IconBriefcase,
  IconCalendarTime,
  IconChevronRight,
  IconClock,
  IconEdit,
  IconFileDescription,
  IconMail,
  IconMessage,
  IconRefresh,
  IconUsersGroup,
} from '@tabler/icons-vue'

import Header from '@/views/components/header.vue'
import Footer from '@/views/components/footer.vue'
import HeadBuilder from '@/utils/HeadBuilder'
import { useTeamStore } from '@/stores/teamStore'
import { useUserStore } from '@/stores/userStore'

interface EmployeeCardViewModel {
  guid: string
  name: string
  isManager: boolean
  isActive: boolean
  position: string
  department: string
  employeeCode: string
  email: string
  phone: string
  avatar: string | null
  initials: string
}

const route = useRoute()
const router = useRouter()
const teamStore = useTeamStore()
const userStore = useUserStore()

const isLoading = ref(true)
const error = ref('')
const employee = ref<EmployeeCardViewModel | null>(null)

const employeeGuid = computed(() => String(route.params.id ?? ''))
const managerGuid = computed(() => userStore.user?.guid ?? '')

function makeInitials(firstName: string, lastName: string, name: string): string {
  if (firstName || lastName) return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?'
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((item) => item[0]).join('').toUpperCase() || '?'
}

function mapEmployee(source: any): EmployeeCardViewModel {
  const firstName = source.firstName ?? source.first_name ?? ''
  const lastName = source.lastName ?? source.last_name ?? ''
  const name = source.name ?? (`${firstName} ${lastName}`.trim() || 'Collaborateur')
  const roles = Array.isArray(source.roles) ? source.roles : []
  const isManager = Boolean(source.isManager ?? roles.some((role: any) => {
    const label = String(role?.code ?? role?.name ?? role?.role ?? '').toLowerCase()
    return label.includes('manager') || label.includes('responsable')
  }))

  return {
    guid: source.guid,
    name,
    isManager,
    isActive: source.isActive ?? source.active ?? true,
    position: source.position ?? source.jobTitle ?? source.job_title ?? 'Poste non renseigné',
    department: source.department ?? '',
    employeeCode: source.employeeCode ?? source.employee_code ?? '',
    email: source.email ?? '',
    phone: source.phoneNumber ?? source.phone_number ?? source.phone ?? '',
    avatar: source.avatar ?? source.avatar_url ?? null,
    initials: source.initials ?? makeInitials(firstName, lastName, name),
  }
}

async function loadEmployeeData(): Promise<void> {
  isLoading.value = true
  error.value = ''

  try {
    if (!employeeGuid.value) throw new Error('Identifiant du collaborateur manquant.')

    let found = teamStore.getEmployeeById(employeeGuid.value)
    if (!found && managerGuid.value) {
      await teamStore.loadTeam(managerGuid.value, true)
      found = teamStore.getEmployeeById(employeeGuid.value)
    }

    if (!found) throw new Error('Ce collaborateur n’est pas disponible dans votre équipe.')

    employee.value = mapEmployee(found)
    HeadBuilder.apply({
      title: `${employee.value.name} — Toké`,
      meta: { viewport: 'width=device-width, initial-scale=1.0' },
    })
  } catch (reason: any) {
    employee.value = null
    error.value = reason?.message ?? 'Impossible de charger cette fiche.'
  } finally {
    isLoading.value = false
  }
}

function manageProfile(): void {
  if (!employee.value) return
  router.push({ name: 'employeeDetails', params: { id: employee.value.guid } })
}

function manageSchedule(): void {
  if (!employee.value) return
  router.push({ name: 'employeeSchedulesView', params: { id: employee.value.guid } })
}

function managePunches(): void {
  if (!employee.value) return
  router.push({ name: 'employeeAttendanceView', params: { id: employee.value.guid } })
}

function manageMemos(): void {
  if (!employee.value) return
  router.push({ name: 'employeeMemosView', params: { id: employee.value.guid } })
}

function sendMemo(): void {
  if (!employee.value) return
  router.push({
    name: 'memoList',
    query: {
      action: 'create',
      employeeGuid: employee.value.guid,
      employeeName: employee.value.name,
    },
  })
}

function editEmployee(): void {
  if (!employee.value) return
  router.push({ name: 'employeeEdit', params: { id: employee.value.guid } })
}

function viewTeam(): void {
  router.push({ name: 'equipe' })
}

const actions = computed(() => {
  if (!employee.value) return []

  const items = [
    {
      id: 'details',
      title: 'Fiche collaborateur',
      description: 'Informations, présence, planning et activité récente.',
      icon: IconFileDescription,
      iconClass: 'bg-indigo-50 text-indigo-600',
      run: manageProfile,
    },
    {
      id: 'schedule',
      title: 'Planning',
      description: 'Consulter ou organiser les horaires du collaborateur.',
      icon: IconCalendarTime,
      iconClass: 'bg-violet-50 text-violet-600',
      run: manageSchedule,
    },
    {
      id: 'punches',
      title: 'Pointages',
      description: 'Ouvrir l’historique et les journées de pointage.',
      icon: IconClock,
      iconClass: 'bg-amber-50 text-amber-600',
      run: managePunches,
    },
    {
      id: 'memos',
      title: 'Mémos',
      description: 'Consulter les échanges et éléments liés au collaborateur.',
      icon: IconMessage,
      iconClass: 'bg-sky-50 text-sky-600',
      run: manageMemos,
    },
    {
      id: 'send-memo',
      title: 'Nouveau mémo',
      description: 'Démarrer directement un nouvel échange avec ce collaborateur.',
      icon: IconMail,
      iconClass: 'bg-emerald-50 text-emerald-600',
      run: sendMemo,
    },
    {
      id: 'edit',
      title: 'Modifier',
      description: 'Mettre à jour les informations professionnelles du compte.',
      icon: IconEdit,
      iconClass: 'bg-slate-100 text-slate-600',
      run: editEmployee,
    },
  ]

  if (employee.value.isManager) {
    items.push({
      id: 'team',
      title: 'Équipe',
      description: 'Revenir à la gestion des équipes et collaborateurs.',
      icon: IconUsersGroup,
      iconClass: 'bg-orange-50 text-orange-600',
      run: viewTeam,
    })
  }

  return items
})

function goBack(): void {
  router.push({ name: 'equipe' })
}

onMounted(loadEmployeeData)
</script>
