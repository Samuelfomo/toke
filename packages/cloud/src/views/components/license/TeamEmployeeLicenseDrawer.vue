<template>
  <Teleport to="body">
    <div v-if="employee" class="fixed inset-0 z-[10000] flex justify-end" @click.self="emit('close')">
      <div class="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]" @click="emit('close')"></div>

      <aside class="relative z-10 h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
        <div class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur">
          <div class="min-w-0">
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-blue-800">Licence collaborateur</p>
            <h2 class="mt-1 truncate text-xl font-bold text-slate-900">{{ employee.name }}</h2>
            <p class="mt-1 truncate text-sm text-slate-500">{{ employee.email || employee.employeeCode || employee.guid }}</p>
          </div>
          <button
              type="button"
              class="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              aria-label="Fermer"
              @click="emit('close')"
          >
            <span class="text-2xl leading-none">×</span>
          </button>
        </div>

        <div class="p-6">
          <div v-if="loading" class="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div class="h-9 w-9 animate-spin rounded-full border-4 border-blue-800/20 border-t-blue-800"></div>
            <p class="text-sm font-medium text-slate-500">Chargement de la licence…</p>
          </div>

          <div v-else-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p class="text-sm font-bold text-rose-800">Impossible de charger la licence</p>
            <p class="mt-1 text-sm text-rose-700">{{ error }}</p>
            <button
                type="button"
                class="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm ring-1 ring-rose-200 hover:bg-rose-50"
                @click="reload"
            >
              Réessayer
            </button>
          </div>

          <div v-else-if="!license" class="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p class="text-sm font-bold text-amber-900">Aucune licence individuelle trouvée</p>
            <p class="mt-1 text-sm leading-6 text-amber-800">
              Ce collaborateur appartient à l’équipe, mais l’API ne retourne actuellement aucune licence individuelle associée.
            </p>
          </div>

          <template v-else>
            <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">État contractuel</p>
                  <p class="mt-1 text-lg font-bold text-slate-900">{{ label(license.contractual_status) }}</p>
                </div>
                <span
                    class="rounded-full px-3 py-1 text-xs font-bold"
                    :class="statusClass(license.contractual_status)"
                >
                  {{ label(license.computed_billing_status || license.contractual_status) }}
                </span>
              </div>
            </div>

            <dl class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="rounded-xl border border-slate-100 p-4">
                <dt class="text-xs font-semibold uppercase tracking-wider text-slate-400">Code employé</dt>
                <dd class="mt-1 text-sm font-bold text-slate-800">{{ license.employee_code || '—' }}</dd>
              </div>
              <div class="rounded-xl border border-slate-100 p-4">
                <dt class="text-xs font-semibold uppercase tracking-wider text-slate-400">Activation</dt>
                <dd class="mt-1 text-sm font-bold text-slate-800">{{ formatDate(license.activation_date) }}</dd>
              </div>
              <div class="rounded-xl border border-slate-100 p-4">
                <dt class="text-xs font-semibold uppercase tracking-wider text-slate-400">Dernière activité</dt>
                <dd class="mt-1 text-sm font-bold text-slate-800">{{ formatDate(license.last_activity_date) }}</dd>
              </div>
              <div class="rounded-xl border border-slate-100 p-4">
                <dt class="text-xs font-semibold uppercase tracking-wider text-slate-400">Désactivation</dt>
                <dd class="mt-1 text-sm font-bold text-slate-800">{{ formatDate(license.deactivation_date) }}</dd>
              </div>
            </dl>

            <div v-if="license.grace_period_start || license.grace_period_end" class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p class="text-xs font-bold uppercase tracking-wider text-amber-700">Période de grâce</p>
              <p class="mt-1 text-sm text-amber-900">
                {{ formatDate(license.grace_period_start) }} → {{ formatDate(license.grace_period_end) }}
              </p>
            </div>

            <div class="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <p class="text-sm font-bold text-blue-900">Décision d’accès non exposée</p>
              <p class="mt-1 text-sm leading-6 text-blue-800">
                Cette vue n’interprète pas le statut contractuel comme une autorisation d’accès. Le contrat individuel actuel ne retourne pas encore <code>access.allowed</code>, <code>access.basis</code> et <code>access_until</code>.
              </p>
            </div>
          </template>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'

import { useLicenseStore } from '@/stores/licenseStore'

interface TeamLicenseEmployee {
  guid: string
  name: string
  email?: string
  employeeCode?: string
}

const props = defineProps<{
  employee: TeamLicenseEmployee | null
}>()

const emit = defineEmits<{
  close: []
}>()

const licenseStore = useLicenseStore()

const key = computed(() => props.employee?.guid ?? '')
const license = computed(() => key.value ? licenseStore.teamLicenses[key.value] ?? null : null)
const loading = computed(() => key.value ? licenseStore.teamLicenseLoading[key.value] === true : false)
const error = computed(() => key.value ? licenseStore.teamLicenseErrors[key.value] ?? null : null)

const load = async (force = false) => {
  if (!props.employee?.guid) return
  try {
    await licenseStore.loadTeamEmployeeLicense(props.employee.guid, force)
  } catch {
    // L'état d'erreur est déjà conservé dans le store.
  }
}

const reload = () => load(true)

watch(
    () => props.employee?.guid,
    (guid) => {
      if (guid) void load(false)
    },
    { immediate: true },
)

const label = (value?: string | null) => value ? value.replaceAll('_', ' ') : 'Non renseigné'

const statusClass = (value?: string | null) => {
  const normalized = String(value ?? '').toUpperCase()
  if (normalized.includes('ACTIVE') || normalized.includes('PAID')) return 'bg-emerald-100 text-emerald-700'
  if (normalized.includes('PENDING') || normalized.includes('GRACE')) return 'bg-amber-100 text-amber-700'
  if (normalized.includes('EXPIRED') || normalized.includes('SUSPEND') || normalized.includes('INACTIVE')) return 'bg-rose-100 text-rose-700'
  return 'bg-slate-100 text-slate-600'
}

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
</script>