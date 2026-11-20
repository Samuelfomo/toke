<template>
  <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div class="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Facturation</p>
        <h2 class="mt-1 text-xl font-bold text-slate-950">Factures et paiements connus</h2>
        <p class="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
          Cette vue reprend uniquement les cycles et paiements retournés par l’état de licence. Elle ne constitue pas encore un historique comptable exhaustif.
        </p>
      </div>
      <span class="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
        {{ billingModeLabel }}
      </span>
    </div>

    <div class="p-5 sm:p-6">
      <div v-if="!payments.length" class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
        <IconInfoCircle :size="19" class="mt-0.5 shrink-0 text-amber-700" />
        <div>
          <p class="text-sm font-bold text-amber-950">Aucun paiement exploitable retourné</p>
          <p class="mt-1 text-sm leading-6 text-amber-900">
            L’interface n’en déduit ni absence de dette ni absence d’historique. Le serveur doit fournir une vue consolidée pour l’historique complet.
          </p>
        </div>
      </div>

      <div v-else class="space-y-4">
        <div class="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
          <div class="flex items-start gap-3">
            <IconReceipt :size="19" class="mt-0.5 shrink-0 text-indigo-700" />
            <div>
              <p class="text-sm font-bold text-indigo-950">Lecture sans recalcul frontend</p>
              <p class="mt-1 text-sm leading-6 text-indigo-900">
                Les montants ci-dessous sont affichés tels que retournés par l’API. Toké Customer ne recalcule pas le prix, les taxes, le reçu ou le solde.
              </p>
            </div>
          </div>
        </div>

        <div class="overflow-hidden rounded-xl border border-slate-200">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead class="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th class="px-4 py-3">Période</th>
                  <th class="px-4 py-3">Statut</th>
                  <th class="px-4 py-3">Facture</th>
                  <th class="px-4 py-3">Reçu</th>
                  <th class="px-4 py-3">Reste à payer</th>
                  <th class="px-4 py-3">Échéance</th>
                  <th class="px-4 py-3">Référence</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                <tr v-for="(payment, index) in payments" :key="paymentKey(payment, index)" class="align-top">
                  <td class="whitespace-nowrap px-4 py-4 text-slate-700">
                    <p class="font-semibold text-slate-900">{{ formatDate(payment.period_start) }}</p>
                    <p class="mt-1 text-xs text-slate-500">au {{ formatDate(payment.period_end) }}</p>
                  </td>
                  <td class="px-4 py-4">
                    <span
                      class="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold"
                      :class="statusClasses(payment.transaction_status || payment.billing_status)"
                    >
                      {{ statusLabel(payment.transaction_status || payment.billing_status) }}
                    </span>
                    <p v-if="payment.billing_status && payment.billing_status !== payment.transaction_status" class="mt-1 text-xs text-slate-500">
                      Cycle : {{ statusLabel(payment.billing_status) }}
                    </p>
                  </td>
                  <td class="whitespace-nowrap px-4 py-4 font-semibold text-slate-900">
                    {{ formatMoney(payment.invoice_amount_local, payment.currency_code) }}
                  </td>
                  <td class="whitespace-nowrap px-4 py-4 font-semibold text-emerald-700">
                    {{ formatMoney(payment.received_local, payment.currency_code) }}
                  </td>
                  <td class="whitespace-nowrap px-4 py-4 font-semibold text-amber-700">
                    {{ formatMoney(payment.amount_to_pay_local, payment.currency_code) }}
                  </td>
                  <td class="whitespace-nowrap px-4 py-4 text-slate-700">
                    {{ formatDate(payment.payment_due_date) }}
                  </td>
                  <td class="px-4 py-4">
                    <p class="max-w-[220px] truncate font-mono text-xs text-slate-700" :title="payment.payment_reference || undefined">
                      {{ payment.payment_reference || 'Non disponible' }}
                    </p>
                    <p v-if="payment.payment_transaction_guid" class="mt-1 text-[11px] text-slate-400">
                      Transaction {{ payment.payment_transaction_guid }}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p class="text-xs leading-5 text-slate-500">
          Plusieurs transactions peuvent appartenir au même cycle. Cette vue n’additionne donc pas les lignes pour fabriquer un total global et éviter tout double comptage.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IconInfoCircle, IconReceipt } from '@tabler/icons-vue'

import type { BillingMode, LicensePaymentSummary } from '@/service/LicenseService'

const props = defineProps<{
  payments?: LicensePaymentSummary[]
  billingMode?: BillingMode | null
}>()

const payments = computed(() => props.payments ?? [])

const billingModeLabel = computed(() => {
  if (props.billingMode === 'PREPAID') return 'Prépayé'
  if (props.billingMode === 'POSTPAID') return 'Postpayé'
  return props.billingMode || 'Mode non disponible'
})

function formatDate(value?: string | null): string {
  if (!value) return 'Non disponible'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Non disponible'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date)
}

function formatMoney(value?: string | number | null, currency?: string | null): string {
  if (value === null || value === undefined || value === '') return 'Non disponible'
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount)) return String(value)

  const code = currency?.trim().toUpperCase()
  if (!code) return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(amount)

  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(amount)} ${code}`
  }
}

function statusLabel(value?: string | null): string {
  if (!value) return 'Non disponible'
  const labels: Record<string, string> = {
    PENDING: 'En attente',
    PENDING_PAYMENT: 'Paiement en attente',
    PROCESSING: 'En traitement',
    PARTIAL: 'Partiel',
    PARTIALLY_PAID: 'Partiellement payé',
    COMPLETED: 'Confirmé',
    PAID: 'Payé',
    FAILED: 'Échoué',
    CANCELLED: 'Annulé',
    OVERDUE: 'En retard',
    REFUNDED: 'Remboursé',
  }
  return labels[value] ?? value.replaceAll('_', ' ')
}

function statusClasses(value?: string | null): string {
  const normalized = value?.toUpperCase()
  if (normalized === 'COMPLETED' || normalized === 'PAID') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (normalized === 'FAILED' || normalized === 'CANCELLED' || normalized === 'OVERDUE') {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }
  if (normalized === 'PARTIAL' || normalized === 'PARTIALLY_PAID') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  return 'border-slate-200 bg-slate-50 text-slate-700'
}

function paymentKey(payment: LicensePaymentSummary, index: number): string {
  return String(
    payment.payment_transaction_guid
      ?? `${payment.billing_cycle_guid ?? 'cycle'}-${payment.payment_reference ?? index}`,
  )
}
</script>
