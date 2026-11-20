<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="flex items-center gap-2">
          <IconUsers :size="17" class="text-blue-700" />
          <h3 class="text-sm font-bold text-slate-900">Collaborateurs concernés</h3>
        </div>
        <p class="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
          Choisissez les collaborateurs à inclure dans cette suggestion. La recherche sert uniquement à filtrer la liste et ne change jamais votre sélection.
        </p>
      </div>

      <span class="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
        {{ includedCount }} inclus sur {{ candidates.length }}
      </span>
    </div>

    <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative min-w-0 flex-1">
          <IconSearch :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            v-model="search"
            type="search"
            class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
            placeholder="Rechercher un collaborateur…"
            :disabled="disabled"
          />
        </div>

        <div class="flex shrink-0 items-center gap-3 text-xs font-bold">
          <button type="button" class="text-blue-700 hover:underline disabled:opacity-50" :disabled="disabled || includedCount === candidates.length" @click="includeAll">
            Tout inclure
          </button>
          <span class="h-4 w-px bg-slate-200" />
          <button type="button" class="text-slate-600 hover:underline disabled:opacity-50" :disabled="disabled || includedCount === 0" @click="excludeAll">
            Tout retirer
          </button>
        </div>
      </div>
      <p v-if="search" class="mt-2 text-[11px] text-slate-500">
        {{ filteredEmployees.length }} résultat(s) affiché(s) · {{ includedCount }} collaborateur(s) restent inclus au total.
      </p>
    </div>

    <div class="mt-3 grid max-h-80 gap-2 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-2">
      <label
        v-for="employee in filteredEmployees"
        :key="employee.guid"
        class="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition"
        :class="isIncluded(employee.guid) ? 'border-blue-200 bg-blue-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'"
      >
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
          :checked="isIncluded(employee.guid)"
          :disabled="disabled"
          @change="toggleIncluded(employee.guid)"
        />

        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
          {{ initials(employee.name) }}
        </div>

        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-bold text-slate-800">{{ employee.name }}</p>
          <p class="mt-0.5 truncate text-xs text-slate-400">{{ employee.employeeCode || 'Matricule non renseigné' }}</p>
        </div>

        <span v-if="isIncluded(employee.guid)" class="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">Inclus</span>
      </label>

      <div v-if="filteredEmployees.length === 0" class="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center text-xs text-slate-500 sm:col-span-2">
        Aucun collaborateur ne correspond à cette recherche.
      </div>
    </div>

    <div class="mt-4 rounded-xl px-3 py-3 text-xs" :class="includedCount > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'">
      <strong>{{ includedCount }}</strong> collaborateur(s) seront pris en compte pour cette suggestion.
      <span v-if="excludedCount > 0"> {{ excludedCount }} ne seront pas inclus pour cette génération uniquement.</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { IconSearch, IconUsers } from '@tabler/icons-vue'
import type { EmployeePlanningProfile } from '../planningSuggestion.type'

type ExclusionEmployee = { guid: string; name: string; employeeCode?: string | null }

const props = withDefaults(defineProps<{
  modelValue: string[]
  employees: ExclusionEmployee[]
  profiles: EmployeePlanningProfile[]
  disabled?: boolean
}>(), { disabled: false })

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()
const search = ref('')

const structuralExcludedGuids = computed(() => new Set(
  props.profiles
    .filter((profile) => profile.active && profile.planning_mode === 'EXCLUDED' && profile.user?.guid)
    .map((profile) => profile.user!.guid),
))

const candidates = computed(() => props.employees.filter((employee) => !structuralExcludedGuids.value.has(employee.guid)))
const selectedSet = computed(() => new Set(props.modelValue))
const excludedCount = computed(() => candidates.value.filter((employee) => selectedSet.value.has(employee.guid)).length)
const includedCount = computed(() => Math.max(0, candidates.value.length - excludedCount.value))

const filteredEmployees = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('fr')
  if (!query) return candidates.value
  return candidates.value.filter((employee) =>
    [employee.name, employee.employeeCode]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase('fr').includes(query)),
  )
})

function isIncluded(guid: string): boolean {
  return !selectedSet.value.has(guid)
}

function toggleIncluded(guid: string): void {
  const next = new Set(props.modelValue)
  if (next.has(guid)) next.delete(guid)
  else next.add(guid)
  emit('update:modelValue', [...next])
}

function includeAll(): void {
  const candidateGuids = new Set(candidates.value.map((employee) => employee.guid))
  emit('update:modelValue', props.modelValue.filter((guid) => !candidateGuids.has(guid)))
}

function excludeAll(): void {
  const next = new Set(props.modelValue)
  candidates.value.forEach((employee) => next.add(employee.guid))
  emit('update:modelValue', [...next])
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((value) => value[0]).join('').toUpperCase()
}
</script>
