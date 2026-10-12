<template>
  <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div class="border-b border-slate-100 px-5 py-5 sm:px-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Renouvellement</p>
          <h3 class="mt-1 text-lg font-bold text-slate-950">Renouveler la licence prépayée</h3>
          <p class="mt-1 text-sm leading-6 text-slate-500">
            L'aperçu et les montants proviennent du serveur. Préparer un renouvellement ne confirme pas le paiement et n'accorde aucun droit supplémentaire.
          </p>
        </div>
        <span class="inline-flex self-start rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
          PREPAID
        </span>
      </div>
    </div>

    <div class="space-y-5 p-5 sm:p-6">
      <div v-if="previewLoading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="i in 4" :key="i" class="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
      </div>

      <div v-else-if="error" class="flex flex-col gap-4 rounded-xl border border-rose-200 bg-rose-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-bold text-rose-950">Aperçu indisponible</p>
          <p class="mt-1 text-sm text-rose-800">{{ error }}</p>
        </div>
        <button type="button" class="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-700" @click="$emit('refresh')">
          Réessayer
        </button>
      </div>

      <template v-else-if="preview">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Période actuelle</p>
            <p class="mt-1.5 text-sm font-bold text-slate-900">{{ formatDate(preview.current_period_end) }}</p>
            <p class="mt-1 text-xs text-slate-500">Fin de la période en cours</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Prochaine période</p>
            <p class="mt-1.5 text-sm font-bold text-slate-900">{{ formatDate(preview.next_period_start) }}</p>
            <p class="mt-1 text-xs text-slate-500">au {{ formatDate(preview.next_period_end) }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Quantité</p>
            <p class="mt-1.5 text-sm font-bold text-slate-900">{{ preview.seat_count ?? preview.quantity ?? 'Non disponible' }}</p>
            <p class="mt-1 text-xs text-slate-500">Calcul serveur</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Montant à payer</p>
            <p class="mt-1.5 text-sm font-bold text-slate-900">{{ formatMoney(preview.amount_to_pay_local ?? preview.total_amount_local, preview.currency_code) }}</p>
            <p class="mt-1 text-xs text-slate-500">Aucune estimation locale</p>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label class="block">
            <span class="text-sm font-bold text-slate-800">Moyen de paiement</span>
            <select v-model="selectedPaymentMethod" class="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="">Sélectionner</option>
              <option v-for="method in compatiblePaymentMethods" :key="String(method.guid)" :value="String(method.guid)">
                {{ method.name || method.code || `Moyen ${method.guid}` }}
              </option>
            </select>
            <p class="mt-1 text-xs text-slate-500">Seuls les moyens actifs compatibles avec la devise du tenant sont proposés lorsque cette information est disponible.</p>
          </label>

          <button
            type="button"
            class="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!selectedPaymentMethod || prepareLoading || preview.can_prepare === false"
            @click="prepare"
          >
            {{ prepareLoading ? 'Préparation…' : 'Préparer le renouvellement' }}
          </button>
        </div>

        <p v-if="prepareError" class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{{ prepareError }}</p>
        <p v-else-if="prepared" class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Renouvellement préparé. Relisez l'état retourné par le serveur avant toute étape de paiement ; aucun droit n'est considéré comme acquis à ce stade.
        </p>

        <div class="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm leading-6 text-amber-900">
          La durée du renouvellement n'est pas modifiable ici : le contrat actuel ne fournit aucun champ de nouvelle durée. Les options 3/6/12 mois restent désactivées tant qu'un contrat backend explicite n'est pas livré.
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PaymentMethodData, RenewalPreviewData } from '@/service/LicenseService'

const props = defineProps<{
  preview: RenewalPreviewData | null
  paymentMethods: PaymentMethodData[]
  tenantCurrency?: string | null
  previewLoading?: boolean
  prepareLoading?: boolean
  error?: string | null
  prepareError?: string | null
  prepared?: boolean
}>()

const emit = defineEmits<{
  refresh: []
  prepare: [paymentMethodGuid: string]
}>()

const selectedPaymentMethod = ref('')

const compatiblePaymentMethods = computed(() => {
  const currency = String(props.tenantCurrency || '').trim().toUpperCase()
  if (!currency) return props.paymentMethods

  return props.paymentMethods.filter((method) => {
    const supported = method.supported_currencies
    if (!supported) return true
    const currencies = Array.isArray(supported) ? supported : [supported]
    return currencies.some((item) => String(item).toUpperCase() === currency)
  })
})

function prepare() {
  if (selectedPaymentMethod.value) emit('prepare', selectedPaymentMethod.value)
}

function formatDate(value?: string | null): string {
  if (!value) return 'Non disponible'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Non disponible'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date)
}

function formatMoney(value: unknown, currency?: string | null): string {
  if (value === null || value === undefined || value === '') return 'Non disponible'
  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value)
  const code = String(currency || '').trim().toUpperCase()
  if (!code) return amount.toLocaleString('fr-FR')
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: code }).format(amount)
  } catch {
    return `${amount.toLocaleString('fr-FR')} ${code}`
  }
}
</script>
