<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
          aria-hidden="true"
          class="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]"
      />

      <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-day-adjustment-title"
          class="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <header class="flex items-start justify-between gap-5 border-b border-slate-100 px-6 py-5">
          <div class="min-w-0">
            <p class="text-base font-semibold uppercase tracking-[0.12em] text-[#004aad]">Modification ponctuelle</p>
            <h2 id="schedule-day-adjustment-title" class="mt-1 text-xl font-bold tracking-tight text-black">
              Ajuster le service
            </h2>
            <p class="mt-1 truncate text-sm font-medium text-slate-500">
              {{ employee.name }} · {{ formattedDate }}
            </p>
          </div>

          <button
              type="button"
              class="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              @click="emit('close')"
          >
            <IconX :size="20"/>
          </button>
        </header>

        <div class="overflow-y-auto px-6 py-5">
          <div class="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <IconAlertTriangle :size="19" class="mt-0.5 flex-none text-amber-600"/>
            <div>
              <p class="text-sm font-bold text-amber-950">Modification manuelle</p>
              <p class="mt-0.5 text-xs leading-relaxed text-amber-800">
                Cette action modifie uniquement le service démarrant à cette date.
                Une garde peut se poursuivre automatiquement au lendemain.
                Aucun Session Template existant n'est modifié.
              </p>
            </div>
          </div>

          <div class="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p class="text-[11px] font-black uppercase tracking-wide text-slate-400">Situation actuelle</p>
            <p class="mt-1 text-sm font-bold text-slate-800">{{ currentServiceLabel }}</p>
            <p v-if="hasCarryIn" class="mt-1 text-xs text-slate-500">
              Continuité de garde présente de 00h00 au matin.
            </p>
          </div>

          <div v-if="servicesLoading" class="flex min-h-48 items-center justify-center gap-2 text-sm font-semibold text-slate-500">
            <IconLoader2 :size="18" class="animate-spin"/>
            Chargement des services...
          </div>

          <template v-else>
            <p class="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Choisir le nouveau service</p>

            <div v-if="services.length" class="space-y-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                  v-for="service in services"
                  :key="service.key"
                  type="button"
                  class="flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition"
                  :class="selectedKey === service.key
                    ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100'
                    : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'"
                  @click="selectedKey = service.key"
              >
                <div
                    class="flex h-10 w-10 flex-none items-center justify-center rounded-xl"
                    :class="serviceIconClass(service)"
                >
                  <IconBed v-if="service.kind === 'rest'" :size="18"/>
                  <IconMoon v-else-if="service.kind === 'guard'" :size="18"/>
                  <IconClock v-else :size="18"/>
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-sm font-bold text-slate-800">{{ service.label }}</p>
                    <span
                        v-if="service.kind === 'guard'"
                        class="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700"
                    >
                      2 jours
                    </span>
                  </div>
                  <p class="mt-0.5 text-xs text-slate-500">
                    {{ serviceDescription(service) }}
                  </p>
                  <p
                      v-if="service.source_name && service.source_name !== service.label"
                      class="mt-0.5 text-[10px] text-slate-400"
                  >
                    {{ service.source_name }}
                  </p>
                </div>

                <div
                    class="flex h-5 w-5 flex-none items-center justify-center rounded-full border"
                    :class="selectedKey === service.key
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-slate-300 bg-white text-transparent'"
                >
                  <IconCheck :size="12"/>
                </div>
              </button>
            </div>

            <div v-else class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
              Aucun service disponible pour cette date.
            </div>

            <div v-if="warnings.length" class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div class="flex items-center gap-2">
                <IconAlertTriangle :size="17" class="text-amber-600"/>
                <p class="text-sm font-bold text-amber-900">
                  {{ warnings.length }} alerte{{ warnings.length > 1 ? 's' : '' }}
                </p>
              </div>
              <ul class="mt-2 space-y-1.5 pl-5 text-xs leading-relaxed text-amber-800">
                <li v-for="warning in warnings" :key="warning" class="list-disc">
                  {{ warning }}
                </li>
              </ul>
<!--              <p class="mt-2 text-[11px] font-semibold text-amber-700">-->
<!--                Ces alertes sont informatives : le manager peut toujours appliquer la modification.-->
<!--              </p>-->
            </div>

            <div class="mt-5">
              <label for="schedule-adjustment-reason" class="text-xs font-bold text-slate-600">
                Motif <span class="font-medium text-slate-400">(optionnel)</span>
              </label>
              <textarea
                  id="schedule-adjustment-reason"
                  v-model="reason"
                  rows="2"
                  maxlength="250"
                  placeholder="Ex. remplacement, demande du collaborateur..."
                  class="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <p v-if="errorMessage" class="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {{ errorMessage }}
            </p>
          </template>
        </div>

        <footer class="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <button
              type="button"
              class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              :disabled="saving"
              @click="emit('close')"
          >
            Annuler
          </button>

          <button
              type="button"
              class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!selectedKey || servicesLoading || saving"
              @click="save"
          >
            <IconLoader2 v-if="saving" :size="15" class="animate-spin"/>
            <IconCheck v-else :size="15"/>
            {{ warnings.length ? 'Appliquer malgré les alertes' : 'Appliquer la modification' }}
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {
  IconAlertTriangle,
  IconBed,
  IconCheck,
  IconClock,
  IconLoader2,
  IconMoon,
  IconX,
} from '@tabler/icons-vue'

import ScheduleAssignmentService, {
  type IAdjustmentServiceOption,
} from '@/service/ScheduleAssignment'
import type {SchedulePlanningMember} from './views/schedulePlanningView.types'

const props = defineProps<{
  employee: SchedulePlanningMember
  date: string
  managerGuid: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const services = ref<IAdjustmentServiceOption[]>([])
const selectedKey = ref('')
const reason = ref('')
const servicesLoading = ref(false)
const saving = ref(false)
const errorMessage = ref('')

function addDays(iso: string, amount: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

function normalizeTime(value: string): string {
  const match = value.match(/^(\d{1,2}):(\d{2})/)
  return match ? `${match[1]!.padStart(2, '0')}:${match[2]}` : value
}

function minutes(value: string): number {
  const [h = 0, m = 0] = normalizeTime(value).split(':').map(Number)
  return h * 60 + m
}

const formattedDate = computed(() =>
    new Date(`${props.date}T00:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
)

const daySlots = computed(() => props.employee.scheduleByDate[props.date] ?? [])
const nextDaySlots = computed(() => props.employee.scheduleByDate[addDays(props.date, 1)] ?? [])

const carryInSlots = computed(() =>
    daySlots.value.filter((slot) => normalizeTime(slot.work[0]) === '00:00'),
)

const serviceStartingSlots = computed(() =>
    daySlots.value.filter((slot) => normalizeTime(slot.work[0]) !== '00:00'),
)

const hasCarryIn = computed(() => carryInSlots.value.length > 0)

const currentServiceLabel = computed(() => {
  if (props.employee.restByDate?.[props.date] === true && serviceStartingSlots.value.length === 0) {
    return 'Repos'
  }

  if (!serviceStartingSlots.value.length) {
    return hasCarryIn.value
        ? 'Aucun nouveau service · continuité de garde uniquement'
        : 'Aucun service planifié'
  }

  const starts = serviceStartingSlots.value
      .map((slot) => normalizeTime(slot.work[0]))
      .sort()
  const ends = serviceStartingSlots.value
      .map((slot) => normalizeTime(slot.work[1]))
      .sort()

  const first = starts[0]!
  const last = ends[ends.length - 1]!

  if (first === '16:00' && minutes(last) >= 23 * 60 + 50) {
    return 'Garde · 16h00–08h00'
  }

  return `${first.replace(':', 'h')}–${last.replace(':', 'h')}`
})

const selectedService = computed(() =>
    services.value.find((service) => service.key === selectedKey.value) ?? null,
)

const warnings = computed<string[]>(() => {
  const service = selectedService.value
  if (!service) return []

  const result: string[] = []

  if (hasCarryIn.value && service.kind !== 'rest') {
    result.push(
        `Cette journée contient déjà une continuité de garde (${formatSlots(carryInSlots.value)}). Le nouveau service commencera après cette continuité.`,
    )
  }

  if (service.kind === 'guard') {
    const nextDayNewServices = nextDaySlots.value.filter(
        (slot) => normalizeTime(slot.work[0]) !== '00:00',
    )

    if (nextDayNewServices.length) {
      result.push(
          `Un autre service est déjà prévu le lendemain (${formatSlots(nextDayNewServices)}). La garde se terminera à ${service.end_time?.replace(':', 'h') ?? '08h00'} avant ce service.`,
      )
    }

    if (hasCarryIn.value) {
      result.push('Cette sélection peut créer deux gardes consécutives pour le collaborateur.')
    }
  }

  if (
      service.kind === 'template'
      && service.start_time
      && hasCarryIn.value
      && minutes(service.start_time) < 10 * 60
  ) {
    result.push('Le repos entre la fin de garde et la nouvelle prise de service sera très court.')
  }

  return Array.from(new Set(result))
})

function formatSlots(slots: SchedulePlanningMember['scheduleByDate'][string]): string {
  return slots
      .map((slot) => `${normalizeTime(slot.work[0]).replace(':', 'h')}–${normalizeTime(slot.work[1]).replace(':', 'h')}`)
      .join(', ')
}

function serviceDescription(service: IAdjustmentServiceOption): string {
  if (service.kind === 'rest') {
    return 'Aucun nouveau service ne démarre à cette date.'
  }

  if (!service.start_time || !service.end_time) return ''

  const start = service.start_time.replace(':', 'h')
  const end = service.end_time.replace(':', 'h')
  return service.spans_next_day
      ? `${start}–${end} · se poursuit automatiquement le lendemain`
      : `${start}–${end}`
}

function serviceIconClass(service: IAdjustmentServiceOption): string {
  if (service.kind === 'rest') return 'bg-slate-100 text-slate-500'
  if (service.kind === 'guard') return 'bg-rose-50 text-rose-600'
  return 'bg-blue-50 text-blue-600'
}

async function loadServices(): Promise<void> {
  servicesLoading.value = true
  errorMessage.value = ''

  try {
    const response = await ScheduleAssignmentService.getAdjustmentServices(props.date)
    const apiResponse = response as any

    if (!apiResponse?.success) {
      errorMessage.value =
          apiResponse?.error?.message
          ?? apiResponse?.message
          ?? 'Impossible de charger les services disponibles.'
      return
    }

    services.value = apiResponse.data?.services ?? []
  } catch (error: any) {
    errorMessage.value = error?.message ?? 'Impossible de charger les services disponibles.'
  } finally {
    servicesLoading.value = false
  }
}

async function save(): Promise<void> {
  if (!selectedKey.value || saving.value) return

  saving.value = true
  errorMessage.value = ''

  try {
    const response = await ScheduleAssignmentService.applyDayAdjustment({
      manager: props.managerGuid,
      employee: props.employee.guid,
      date: props.date,
      service_key: selectedKey.value,
      reason: reason.value.trim() || null,
    })
    const apiResponse = response as any

    if (!apiResponse?.success) {
      errorMessage.value =
          apiResponse?.error?.message
          ?? apiResponse?.message
          ?? 'La modification n’a pas pu être enregistrée.'
      return
    }

    emit('saved')
  } catch (error: any) {
    errorMessage.value = error?.message ?? 'La modification n’a pas pu être enregistrée.'
  } finally {
    saving.value = false
  }
}

onMounted(loadServices)
</script>