<template>
  <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div class="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Organisation</p>
        <h3 class="mt-1 text-lg font-bold text-slate-950">Licences des collaborateurs</h3>
        <p class="mt-1 text-sm text-slate-500">Vue organisationnelle réservée aux rôles RH/Admin autorisés.</p>
      </div>
      <button type="button" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" @click="$emit('refresh')">Actualiser</button>
    </div>

    <div v-if="loading" class="space-y-3 p-5 sm:p-6">
      <div v-for="i in 5" :key="i" class="h-14 animate-pulse rounded-xl bg-slate-100" />
    </div>

    <div v-else-if="error" class="p-5 sm:p-6">
      <div class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{{ error }}</div>
    </div>

    <div v-else-if="licenses.length === 0" class="p-5 sm:p-6">
      <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Aucune licence individuelle retournée pour cette licence globale.</div>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
          <tr><th class="px-5 py-3">Collaborateur</th><th class="px-5 py-3">Statut contractuel</th><th class="px-5 py-3">Facturation</th><th class="px-5 py-3">Activation</th><th class="px-5 py-3">Dernière activité</th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          <tr v-for="item in licenses" :key="String(item.guid)">
            <td class="px-5 py-3"><p class="font-bold text-slate-900">{{ item.employee_code || 'Sans matricule' }}</p><p class="text-xs text-slate-500">{{ item.employee }}</p></td>
            <td class="px-5 py-3 font-semibold text-slate-700">{{ item.contractual_status || 'N/D' }}</td>
            <td class="px-5 py-3 text-slate-700">{{ item.computed_billing_status || 'N/D' }}</td>
            <td class="px-5 py-3 text-slate-600">{{ formatDate(item.activation_date) }}</td>
            <td class="px-5 py-3 text-slate-600">{{ formatDate(item.last_activity_date) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:px-6">
      <span>{{ count }} licence(s) retournée(s)</span>
      <span>Les noms complets nécessitent une projection organisationnelle enrichie côté API/BFF.</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { EmployeeLicenseData } from '@/service/LicenseService'

defineProps<{ licenses: EmployeeLicenseData[]; count: number; loading: boolean; error: string | null }>()
defineEmits<{ refresh: [] }>()

function formatDate(value?: string | null) {
  if (!value) return 'Non disponible'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Non disponible'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date)
}
</script>
