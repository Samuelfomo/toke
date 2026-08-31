<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="flex items-center gap-2">
          <IconUserMinus :size="17" class="text-amber-600" />
          <h3 class="text-sm font-bold text-slate-900">
            Exclusions temporaires
          </h3>
        </div>
        <p class="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
          Retirez ponctuellement un collaborateur de cette génération. Son profil
          permanent et son planning existant ne sont pas modifiés.
        </p>
      </div>

      <span class="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
        {{ selectedCount }} exclu(s)
      </span>
    </div>

    <div class="mt-4 relative">
      <IconSearch
        :size="16"
        class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        v-model="search"
        type="search"
        class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
        placeholder="Rechercher un collaborateur…"
        :disabled="disabled"
      />
    </div>

    <div class="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
      <label
        v-for="employee in filteredEmployees"
        :key="employee.guid"
        class="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition"
        :class="isExcluded(employee.guid)
          ? 'border-amber-200 bg-amber-50/70'
          : 'border-slate-200 bg-white hover:bg-slate-50'"
      >
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
          :checked="isExcluded(employee.guid)"
          :disabled="disabled"
          @change="toggle(employee.guid)"
        />

        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
          {{ initials(employee.name) }}
        </div>

        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-bold text-slate-800">
            {{ employee.name }}
          </p>
          <p class="mt-0.5 truncate text-xs text-slate-400">
            {{ employee.employeeCode || 'Matricule non renseigné' }}
          </p>
        </div>

        <span
          v-if="isExcluded(employee.guid)"
          class="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700"
        >
          Exclu
        </span>
      </label>

      <div
        v-if="filteredEmployees.length === 0"
        class="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center text-xs text-slate-500"
      >
        Aucun collaborateur disponible pour cette recherche.
      </div>
    </div>

    <div class="mt-4 flex flex-col gap-2 rounded-xl bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-xs text-slate-600">
        <strong class="text-slate-800">{{ includedCount }}</strong> collaborateur(s)
        resteront disponibles pour la génération.
      </p>
      <button
        v-if="selectedCount > 0"
        type="button"
        class="text-xs font-bold text-blue-700 hover:underline disabled:opacity-50"
        :disabled="disabled"
        @click="clear"
      >
        Réinclure tout le monde
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { IconSearch, IconUserMinus } from '@tabler/icons-vue'
import type { EmployeePlanningProfile } from '../planningSuggestion.type'

type ExclusionEmployee = {
  guid: string
  name: string
  employeeCode?: string | null
}

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    employees: ExclusionEmployee[]
    profiles: EmployeePlanningProfile[]
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const search = ref('')

const structuralExcludedGuids = computed(
  () =>
    new Set(
      props.profiles
        .filter(
          (profile) =>
            profile.active &&
            profile.planning_mode === 'EXCLUDED' &&
            profile.user?.guid,
        )
        .map((profile) => profile.user!.guid),
    ),
)

const candidates = computed(() =>
  props.employees.filter(
    (employee) => !structuralExcludedGuids.value.has(employee.guid),
  ),
)

const filteredEmployees = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('fr')
  if (!query) return candidates.value

  return candidates.value.filter((employee) =>
    [employee.name, employee.employeeCode]
      .filter(Boolean)
      .some((value) =>
        String(value).toLocaleLowerCase('fr').includes(query),
      ),
  )
})

const selectedSet = computed(() => new Set(props.modelValue))
const selectedCount = computed(
  () => candidates.value.filter((employee) => selectedSet.value.has(employee.guid)).length,
)
const includedCount = computed(() => Math.max(0, candidates.value.length - selectedCount.value))

function isExcluded(guid: string): boolean {
  return selectedSet.value.has(guid)
}

function toggle(guid: string): void {
  const next = new Set(props.modelValue)
  if (next.has(guid)) next.delete(guid)
  else next.add(guid)
  emit('update:modelValue', [...next])
}

function clear(): void {
  emit('update:modelValue', [])
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => value[0])
    .join('')
    .toUpperCase()
}
</script>
