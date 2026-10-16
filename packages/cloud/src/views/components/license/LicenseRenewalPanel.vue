<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div class="bg-gradient-to-r from-[#003478] to-[#004AAD] px-5 py-5 text-white sm:px-6 sm:py-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="max-w-3xl">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">Abonnement Toké</p>
          <h3 class="mt-1 text-xl font-bold sm:text-2xl">Renouveler votre licence</h3>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-blue-50/90">
            Consultez la prochaine période, le nombre de collaborateurs couverts et le montant communiqué par Toké avant
            de confirmer.
          </p>
        </div>
        <span
            class="inline-flex w-fit items-center rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-inset ring-white/20">
          {{ cycleLabel }}
        </span>
      </div>
    </div>

    <div class="space-y-6 p-5 sm:p-6">
      <div v-if="previewLoading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite">
        <div v-for="i in 4" :key="i" class="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-50"/>
      </div>

      <div v-else-if="error" class="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-bold text-rose-950">Renouvellement momentanément indisponible</p>
            <p class="mt-1 text-sm leading-6 text-rose-800">{{ error }}</p>
          </div>
          <button
              type="button"
              class="inline-flex min-h-10 items-center justify-center rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50"
              @click="$emit('refresh')"
          >
            Réessayer
          </button>
        </div>
      </div>

      <template v-else-if="preview">
        <div v-if="preview.reconciliation_required" class="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p class="text-sm font-bold text-amber-950">Une vérification est nécessaire avant le renouvellement</p>
          <p class="mt-1 text-sm leading-6 text-amber-900">
            Certaines informations de votre licence doivent être vérifiées avant qu’un nouveau paiement puisse être
            préparé. Votre licence actuelle n’est pas modifiée par cette situation.
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article class="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Période actuelle</p>
            <p class="mt-2 text-base font-bold text-slate-950">Jusqu’au {{ formatDate(currentPeriodEnd) }}</p>
            <p class="mt-1 text-xs leading-5 text-slate-500">Votre période actuellement couverte.</p>
          </article>

          <article class="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Prochaine période</p>
            <p class="mt-2 text-base font-bold text-slate-950">{{ formatDate(preview.period_start) }}</p>
            <p class="mt-1 text-xs leading-5 text-slate-500">au {{ formatDate(preview.period_end) }}</p>
          </article>

          <article class="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Collaborateurs couverts</p>
            <p class="mt-2 text-2xl font-extrabold text-[#003478]">{{ billedSeatsLabel }}</p>
            <p class="mt-1 text-xs leading-5 text-slate-500">{{ seatExplanation }}</p>
          </article>

          <article class="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Tarif de référence</p>
            <p class="mt-2 text-base font-bold text-slate-950">{{ unitPriceLabel }}</p>
            <p class="mt-1 text-xs leading-5 text-slate-500">Par collaborateur et par mois, selon les données de votre
              licence.</p>
          </article>
        </div>

        <div class="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
          <div class="space-y-5">
            <div class="rounded-2xl border border-slate-200 p-5">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h4 class="text-base font-bold text-slate-950">Détail du renouvellement</h4>
                  <p class="mt-1 text-sm leading-6 text-slate-500">Les montants ci-dessous correspondent aux
                    informations communiquées pour votre prochaine période.</p>
                </div>
                <span class="rounded-full bg-[#FFDE59]/35 px-2.5 py-1 text-[11px] font-bold text-[#684f00]">{{
                    monthsLabel
                  }}</span>
              </div>

              <dl class="mt-5 divide-y divide-slate-100">
                <div class="flex items-center justify-between gap-4 py-3 first:pt-0">
                  <dt class="text-sm text-slate-600">Collaborateurs facturables</dt>
                  <dd class="text-sm font-bold text-slate-950">{{ formatInteger(preview.billable_employees) }}</dd>
                </div>
                <div class="flex items-center justify-between gap-4 py-3">
                  <dt class="text-sm text-slate-600">Minimum contractuel</dt>
                  <dd class="text-sm font-bold text-slate-950">{{ formatInteger(preview.minimum_seats) }}</dd>
                </div>
                <div class="flex items-center justify-between gap-4 py-3">
                  <dt class="text-sm text-slate-600">Sièges retenus pour la période</dt>
                  <dd class="text-sm font-bold text-slate-950">{{ formatInteger(preview.billed_seats) }}</dd>
                </div>
                <div class="flex items-center justify-between gap-4 py-3">
                  <dt class="text-sm text-slate-600">Sous-total hors taxes</dt>
                  <dd class="text-sm font-bold text-slate-950">{{ formatMoney(preview.subtotal_usd, 'USD') }}</dd>
                </div>
                <div v-if="preview.tax_amount_local != null" class="flex items-center justify-between gap-4 py-3">
                  <dt class="text-sm text-slate-600">Taxes</dt>
                  <dd class="text-sm font-bold text-slate-950">{{
                      formatMoney(preview.tax_amount_local, billingCurrency)
                    }}
                  </dd>
                </div>
              </dl>
            </div>

            <label class="block rounded-2xl border border-slate-200 p-5">
              <span class="text-sm font-bold text-slate-900">Moyen de paiement</span>
              <span class="mt-1 block text-sm leading-6 text-slate-500">Choisissez le moyen que vous souhaitez utiliser pour ce renouvellement.</span>
              <select
                  v-model="selectedPaymentMethod"
                  class="mt-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/15 disabled:cursor-not-allowed disabled:bg-slate-100"
                  :disabled="prepareLoading || prepared"
              >
                <option value="">Sélectionner un moyen de paiement</option>
                <option v-for="method in compatiblePaymentMethods" :key="String(method.guid)"
                        :value="String(method.guid)">
                  {{ method.name || method.code || 'Moyen de paiement' }}
                </option>
              </select>
              <p v-if="!compatiblePaymentMethods.length" class="mt-3 text-sm text-amber-800">
                Aucun moyen de paiement compatible n’est disponible pour le moment.
              </p>
            </label>
          </div>

          <aside class="h-fit rounded-2xl border border-[#004AAD]/20 bg-[#004AAD]/[0.035] p-5 lg:sticky lg:top-24">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-[#004AAD]">Votre récapitulatif</p>
            <h4 class="mt-1 text-lg font-bold text-slate-950">Prochaine période</h4>

            <dl class="mt-5 space-y-4">
              <div>
                <dt class="text-xs font-semibold text-slate-500">Période</dt>
                <dd class="mt-1 text-sm font-bold text-slate-900">{{ formatDate(preview.period_start) }} —
                  {{ formatDate(preview.period_end) }}
                </dd>
              </div>
              <div>
                <dt class="text-xs font-semibold text-slate-500">Collaborateurs couverts</dt>
                <dd class="mt-1 text-sm font-bold text-slate-900">{{ billedSeatsLabel }}</dd>
              </div>
              <div>
                <dt class="text-xs font-semibold text-slate-500">Moyen de paiement</dt>
                <dd class="mt-1 text-sm font-bold text-slate-900">{{ selectedPaymentMethodName }}</dd>
              </div>
            </dl>

            <div class="my-5 border-t border-[#004AAD]/10"/>

            <div v-if="hasFinalTotal">
              <p class="text-xs font-semibold text-slate-500">Total à régler</p>
              <p class="mt-1 text-3xl font-extrabold tracking-tight text-[#003478]">{{ finalTotalLabel }}</p>
              <p class="mt-1 text-xs text-slate-500">Taxes comprises.</p>
            </div>
            <div v-else class="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p class="text-sm font-bold text-amber-950">Montant final indisponible</p>
              <p class="mt-1 text-xs leading-5 text-amber-900">Le renouvellement ne peut pas être confirmé tant que le
                total à régler n’est pas disponible.</p>
            </div>

            <button
                v-if="!prepared"
                type="button"
                class="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#004AAD] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#003f93] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!canConfirm"
                @click="confirmationOpen = true"
            >
              {{ prepareLoading ? 'Enregistrement…' : 'Confirmer le renouvellement' }}
            </button>

            <div v-else class="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p class="text-sm font-bold text-emerald-950">Renouvellement enregistré</p>
              <p class="mt-1 text-sm leading-6 text-emerald-800">Votre demande a été enregistrée. Les informations de
                paiement associées apparaîtront dans votre suivi de facturation.</p>
            </div>

            <p v-if="prepareError"
               class="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800">
              {{ prepareError }}</p>
          </aside>
        </div>
      </template>

      <div v-else class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Les informations de renouvellement ne sont pas disponibles pour le moment.
      </div>
    </div>

    <Teleport to="body">
      <div v-if="confirmationOpen"
           class="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-6"
           @click.self="confirmationOpen = false">
        <div class="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl sm:p-6" role="dialog"
             aria-modal="true" aria-labelledby="renewal-confirmation-title">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#004AAD]/10 text-[#004AAD]">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"
                 aria-hidden="true">
              <path d="M12 6v6l4 2"/>
              <circle cx="12" cy="12" r="9"/>
            </svg>
          </div>
          <h4 id="renewal-confirmation-title" class="mt-4 text-xl font-bold text-slate-950">Confirmer votre
            renouvellement</h4>
          <p class="mt-2 text-sm leading-6 text-slate-600">Vérifiez les informations avant d’enregistrer votre
            renouvellement.</p>

          <dl class="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div class="flex items-center justify-between gap-4 py-2">
              <dt class="text-sm text-slate-600">Période</dt>
              <dd class="text-right text-sm font-bold text-slate-900">{{ formatDate(preview?.period_start) }} —
                {{ formatDate(preview?.period_end) }}
              </dd>
            </div>
            <div class="flex items-center justify-between gap-4 py-2">
              <dt class="text-sm text-slate-600">Collaborateurs</dt>
              <dd class="text-sm font-bold text-slate-900">{{ billedSeatsLabel }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4 py-2">
              <dt class="text-sm text-slate-600">Moyen de paiement</dt>
              <dd class="text-right text-sm font-bold text-slate-900">{{ selectedPaymentMethodName }}</dd>
            </div>
            <div class="mt-2 flex items-end justify-between gap-4 border-t border-slate-200 pt-4">
              <dt class="text-sm font-bold text-slate-700">Total à régler</dt>
              <dd class="text-xl font-extrabold text-[#003478]">{{ finalTotalLabel }}</dd>
            </div>
          </dl>

          <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button"
                    class="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700"
                    :disabled="prepareLoading" @click="confirmationOpen = false">
              Modifier
            </button>
            <button type="button"
                    class="min-h-11 rounded-xl bg-[#004AAD] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                    :disabled="prepareLoading" @click="confirmPrepare">
              {{ prepareLoading ? 'Enregistrement…' : 'Confirmer' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import type {PaymentMethodData, RenewalPreviewData} from '@/service/LicenseService'

const props = defineProps<{
  preview: RenewalPreviewData | null
  paymentMethods: PaymentMethodData[]
  tenantCurrency?: string | null
  currentPeriodEnd?: string | null
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
const confirmationOpen = ref(false)

const billingCurrency = computed(() => String(props.preview?.billing_currency_code || props.preview?.currency_code || props.tenantCurrency || '').trim().toUpperCase())

const compatiblePaymentMethods = computed(() => {
  const currency = billingCurrency.value
  if (!currency) return props.paymentMethods
  return props.paymentMethods.filter((method) => {
    const supported = method.supported_currencies
    if (!supported) return true
    const currencies = Array.isArray(supported) ? supported : [supported]
    return currencies.some((item) => String(item).trim().toUpperCase() === currency)
  })
})

const selectedMethod = computed(() => compatiblePaymentMethods.value.find((method) => String(method.guid) === selectedPaymentMethod.value) ?? null)
const selectedPaymentMethodName = computed(() => selectedMethod.value?.name || selectedMethod.value?.code || (selectedPaymentMethod.value ? 'Moyen sélectionné' : 'À sélectionner'))

const cycleLabel = computed(() => {
  const months = Number(props.preview?.billing_cycle_months)
  if (!Number.isFinite(months) || months <= 0) return 'Renouvellement'
  return months === 1 ? 'Mensuel' : `${months} mois`
})

const monthsLabel = computed(() => {
  const months = Number(props.preview?.billing_cycle_months)
  if (!Number.isFinite(months) || months <= 0) return 'Durée non disponible'
  return months === 1 ? '1 mois' : `${months} mois`
})

const billedSeatsLabel = computed(() => formatInteger(props.preview?.billed_seats))
const unitPriceLabel = computed(() => formatMoney(props.preview?.unit_price_usd, 'USD'))
const seatExplanation = computed(() => {
  const billable = Number(props.preview?.billable_employees)
  const minimum = Number(props.preview?.minimum_seats)
  const billed = Number(props.preview?.billed_seats)
  if ([billable, minimum, billed].every(Number.isFinite) && billed === minimum && minimum > billable) {
    return `Minimum contractuel appliqué : ${formatInteger(minimum)}.`
  }
  return 'Capacité retenue pour la prochaine période.'
})

const finalTotal = computed(() => props.preview?.amount_to_pay_local ?? props.preview?.total_amount_local ?? null)
const hasFinalTotal = computed(() => finalTotal.value !== null && finalTotal.value !== undefined && finalTotal.value !== '' && Boolean(billingCurrency.value))
const finalTotalLabel = computed(() => hasFinalTotal.value ? formatMoney(finalTotal.value, billingCurrency.value) : 'Indisponible')

const canConfirm = computed(() => Boolean(
    props.preview &&
    selectedPaymentMethod.value &&
    compatiblePaymentMethods.value.length &&
    hasFinalTotal.value &&
    !props.preview.reconciliation_required &&
    props.preview.can_prepare !== false &&
    !props.prepareLoading &&
    !props.prepared,
))

watch(() => props.preview?.license_guid, () => {
  selectedPaymentMethod.value = ''
  confirmationOpen.value = false
})

watch(selectedPaymentMethod, () => {
  confirmationOpen.value = false
})

function confirmPrepare() {
  if (!canConfirm.value || !selectedPaymentMethod.value) return
  confirmationOpen.value = false
  emit('prepare', selectedPaymentMethod.value)
}

function formatDate(value?: string | null): string {
  if (!value) return 'Non disponible'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Non disponible'
  return new Intl.DateTimeFormat('fr-FR', {dateStyle: 'medium'}).format(date)
}

function formatInteger(value: unknown): string {
  const number = Number(value)
  return Number.isFinite(number) ? Math.trunc(number).toLocaleString('fr-FR') : 'Non disponible'
}

function formatMoney(value: unknown, currency?: string | null): string {
  if (value === null || value === undefined || value === '') return 'Non disponible'
  const amount = Number(value)
  if (!Number.isFinite(amount)) return 'Non disponible'
  const code = String(currency || '').trim().toUpperCase()
  if (!code) return amount.toLocaleString('fr-FR')
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: code === 'XAF' ? 0 : 2
    }).format(amount)
  } catch {
    return `${amount.toLocaleString('fr-FR')} ${code}`
  }
}
</script>
