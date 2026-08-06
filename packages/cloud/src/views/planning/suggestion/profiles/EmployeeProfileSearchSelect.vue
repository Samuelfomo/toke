<template>
  <div class="space-y-2">
    <div v-if="selectedEmployee" class="flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white">
          {{ initials(selectedEmployee.name) }}
        </div>
        <div class="min-w-0">
          <p class="truncate text-sm font-bold text-slate-900">
            {{ selectedEmployee.name }}
          </p>
          <p class="mt-0.5 text-xs text-slate-500">
            {{ selectedEmployee.employeeCode || 'Matricule non renseigné' }}
          </p>
        </div>
      </div>

      <button
        v-if="!disabled"
        type="button"
        class="rounded-lg px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-white"
        @click="clearSelection"
      >
        Changer
      </button>
    </div>

    <template v-else>
      <div class="relative">
        <IconSearch
          :size="17"
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          v-model="search"
          type="search"
          :disabled="disabled"
          class="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
          placeholder="Rechercher par nom ou matricule…"
          autocomplete="off"
        />
      </div>

      <div class="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2">
        <button
          v-for="employee in filteredEmployees"
          :key="employee.guid"
          type="button"
          class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          @click="selectEmployee(employee.guid)"
        >
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
            {{ initials(employee.name) }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-slate-800">
              {{ employee.name }}
            </p>
            <p class="mt-0.5 text-xs text-slate-400">
              {{ employee.employeeCode || 'Matricule non renseigné' }}
            </p>
          </div>
          <IconChevronRight :size="17" class="shrink-0 text-slate-300" />
        </button>

        <div v-if="filteredEmployees.length === 0" class="px-4 py-8 text-center">
          <IconUserSearch :size="26" class="mx-auto text-slate-300" />
          <p class="mt-2 text-sm font-semibold text-slate-700">
            Aucun collaborateur disponible
          </p>
          <p class="mt-1 text-xs leading-5 text-slate-500">
            Modifiez la recherche ou vérifiez que les profils existants ne couvrent pas déjà toute l’équipe.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  IconChevronRight,
  IconSearch,
  IconUserSearch,
} from '@tabler/icons-vue'
import type { EmployeeProfilePerson } from './employeePlanningProfile.type'

const props = withDefaults(
  defineProps<{
    modelValue: string
    employees: EmployeeProfilePerson[]
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const search = ref('')

const selectedEmployee = computed(() =>
  props.employees.find((employee) => employee.guid === props.modelValue) ?? null,
)

const filteredEmployees = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('fr')
  if (!query) return props.employees

  return props.employees.filter((employee) =>
    [employee.name, employee.employeeCode]
      .filter(Boolean)
      .some((value) =>
        String(value).toLocaleLowerCase('fr').includes(query),
      ),
  )
})

watch(
  () => props.modelValue,
  () => {
    search.value = ''
  },
)

function selectEmployee(guid: string): void {
  emit('update:modelValue', guid)
}

function clearSelection(): void {
  emit('update:modelValue', '')
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((value) => value[0])
    .join('')
    .toUpperCase()
}
</script>
