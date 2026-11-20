<template>
  <section class="payment-card">
    <div class="payment-card__head">
      <div>
        <span class="eyebrow">Paiement Mobile Money</span>
        <h2>Réglez votre première licence</h2>
        <p>La demande de paiement sera envoyée au numéro que vous confirmez ci-dessous. Aucun code secret ou PIN ne vous
          sera demandé dans Toké.</p>
      </div>
      <div class="amount-box">
        <span>Montant à régler</span>
        <strong>{{ formatMoney(payment.amountToPayLocal ?? payment.invoiceAmountLocal, payment.currencyCode) }}</strong>
      </div>
    </div>

    <div v-if="payment.periodStart || payment.periodEnd" class="period-row">
      <div><span>Période</span><strong>{{ formatPeriod(payment.periodStart, payment.periodEnd) }}</strong></div>
      <div v-if="payment.paymentDueDate"><span>Échéance</span><strong>{{ formatDate(payment.paymentDueDate) }}</strong>
      </div>
    </div>

    <div v-if="store.loadingPaymentAttempts" class="info-state">Vérification de vos tentatives de paiement…</div>

    <template v-else-if="currentAttempt">
      <div class="attempt-state" :class="attemptTone">
        <div class="attempt-state__icon" aria-hidden="true">{{ attemptIcon }}</div>
        <div>
          <strong>{{ attemptTitle }}</strong>
          <p>{{ attemptMessage }}</p>
          <small v-if="currentAttempt.phoneMasked">Numéro : {{ currentAttempt.phoneMasked }}</small>
        </div>
      </div>

      <div v-if="canStartNewAttempt" class="retry-zone">
        <button class="btn btn-secondary" type="button" @click="prepareNewAttempt">Essayer à nouveau</button>
      </div>

      <div v-else-if="needsManualRefresh" class="refresh-zone">
        <button class="btn btn-secondary" type="button" :disabled="store.refreshingPaymentAttempt" @click="refreshNow">
          {{ store.refreshingPaymentAttempt ? 'Vérification…' : 'Vérifier maintenant' }}
        </button>
      </div>
    </template>

    <div v-if="!isOnline" class="message message--warning">Connexion interrompue. Votre paiement n’est pas relancé. Le
      suivi reprendra automatiquement dès que la connexion sera disponible.
    </div>

    <form v-if="showPaymentForm" class="payment-form" @submit.prevent="openPaymentConfirmation">
      <label for="payment-phone">Numéro Mobile Money du payeur</label>
      <div class="phone-control">
        <span>+237</span>
        <input
            id="payment-phone"
            v-model="phoneLocal"
            inputmode="numeric"
            autocomplete="tel"
            placeholder="6XX XX XX XX"
            maxlength="12"
            @input="sanitizePhone"
        />
      </div>
      <p class="field-help">Le numéro peut appartenir à la personne qui règle la licence pour l’organisation.</p>

      <label class="confirmation-check">
        <input v-model="phoneConfirmed" type="checkbox"/>
        <span>Je confirme que ce numéro est correct et autorisé à recevoir la demande de paiement.</span>
      </label>

      <div class="payment-summary-line">
        <span>Numéro confirmé</span>
        <strong>{{ normalizedPhoneDisplay }}</strong>
      </div>

      <button class="btn btn-primary btn-large" type="submit" :disabled="!canInitiate || store.initiatingPayment">
        {{ store.initiatingPayment ? 'Envoi de la demande…' : actionKey ? 'Vérifier et réessayer' : 'Continuer' }}
      </button>
      <p class="security-note">Après l’envoi, validez la demande directement sur votre téléphone. Ne fermez pas la page
        tant que l’état du paiement n’est pas clarifié.</p>
    </form>

    <PaymentConfirmationDialog
        v-if="confirmingPayment"
        :amount="payment.amountToPayLocal ?? payment.invoiceAmountLocal"
        :currency="payment.currencyCode"
        :phone="normalizedPhoneDisplay"
        :submitting="store.initiatingPayment"
        @cancel="confirmingPayment = false"
        @confirm="confirmAndSubmitPayment"
    />

    <p v-if="customerMessage" class="message message--warning" role="status" aria-live="polite">{{
        customerMessage
      }}</p>
  </section>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useTenantOnboardingStore} from '@/stores/tenantOnboardingStore'
import type {OnboardingPaymentAttemptView, OnboardingPaymentView} from '@/service/TenantOnboardingService'
import PaymentConfirmationDialog from './PaymentConfirmationDialog.vue'

const props = defineProps<{ payment: OnboardingPaymentView }>()
const store = useTenantOnboardingStore()
const phoneLocal = ref('')
const phoneConfirmed = ref(false)
const actionKey = ref<string | null>(null)
const actionPhone = ref<string | null>(null)
const customerMessage = ref('')
const confirmingPayment = ref(false)
const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
const recovering = ref(false)
let pollTimer: number | null = null

const currentAttempt = computed<OnboardingPaymentAttemptView | null>(() => store.paymentAttempts[0] ?? null)
const attemptStatus = computed(() => String(currentAttempt.value?.status || '').toUpperCase())
const terminalFailure = computed(() => ['FAILED', 'CANCELLED'].includes(attemptStatus.value))
const providerCompleted = computed(() => attemptStatus.value === 'COMPLETED')
const blockingAttempt = computed(() => Boolean(currentAttempt.value && !terminalFailure.value))
const showPaymentForm = computed(() => !store.loadingPaymentAttempts && !blockingAttempt.value)
const canStartNewAttempt = computed(() => terminalFailure.value)
const needsManualRefresh = computed(() => ['CREATED', 'UNKNOWN', 'PENDING', 'PROCESSING'].includes(attemptStatus.value))

const normalizedPhone = computed(() => {
  const digits = phoneLocal.value.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('237')) return digits
  return `237${digits}`
})
const normalizedPhoneDisplay = computed(() => {
  const phone = normalizedPhone.value
  if (!phone) return '—'
  return `+${phone}`
})
const validPhone = computed(() => /^2376\d{8}$/.test(normalizedPhone.value))
const canInitiate = computed(() => Boolean(validPhone.value && phoneConfirmed.value && props.payment.paymentTransactionGuid))

const attemptTitle = computed(() => {
  if (attemptStatus.value === 'PENDING') return 'Demande envoyée'
  if (attemptStatus.value === 'PROCESSING' || attemptStatus.value === 'CREATED') return 'Paiement en cours de traitement'
  if (attemptStatus.value === 'UNKNOWN') return 'Paiement en cours de vérification'
  if (attemptStatus.value === 'COMPLETED') return 'Paiement reçu par le prestataire'
  if (attemptStatus.value === 'FAILED') return 'Paiement non abouti'
  if (attemptStatus.value === 'CANCELLED') return 'Paiement annulé'
  return 'Suivi du paiement'
})
const attemptMessage = computed(() => {
  if (attemptStatus.value === 'PENDING') return 'Validez la demande sur le téléphone du payeur. Nous suivons ensuite son traitement.'
  if (attemptStatus.value === 'PROCESSING' || attemptStatus.value === 'CREATED') return 'Votre demande est en cours de traitement. N’envoyez pas une seconde demande.'
  if (attemptStatus.value === 'UNKNOWN') return 'Le résultat n’est pas encore confirmé. Pour éviter un double débit, aucune nouvelle demande ne sera envoyée.'
  if (attemptStatus.value === 'COMPLETED') return 'Le prestataire indique un succès. Toké vérifie maintenant le règlement de votre facture.'
  if (attemptStatus.value === 'FAILED') return 'Aucun règlement n’a été confirmé pour cette tentative. Vous pouvez essayer à nouveau.'
  if (attemptStatus.value === 'CANCELLED') return 'Cette tentative a été annulée. Vous pouvez lancer une nouvelle demande.'
  return 'Nous vérifions l’état de votre paiement.'
})
const attemptTone = computed(() => ({
  'attempt-state--success': providerCompleted.value,
  'attempt-state--danger': terminalFailure.value,
  'attempt-state--waiting': !providerCompleted.value && !terminalFailure.value,
}))
const attemptIcon = computed(() => providerCompleted.value ? '✓' : terminalFailure.value ? '!' : '…')

function audit(event: string, details: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug(`[Toké KPay] ${event}`, details)
}

function sanitizePhone() {
  phoneConfirmed.value = false
  const digits = phoneLocal.value.replace(/\D/g, '')
  phoneLocal.value = digits.startsWith('237') ? digits.slice(3, 12) : digits.slice(0, 9)
  if (actionPhone.value && normalizedPhone.value !== actionPhone.value) actionKey.value = null
}

function newActionKey() {
  const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`
  return `PAY_${uuid}`.replace(/[^A-Za-z0-9_:-]/g, '_').slice(0, 128)
}

function formatMoney(value: string | number | null | undefined, currency?: string | null) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return `${value}${currency ? ` ${currency}` : ''}`
  try {
    if (currency && /^[A-Z]{3}$/.test(currency)) return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(n)
  } catch {
  }
  return `${new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 2}).format(n)}${currency ? ` ${currency}` : ''}`
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('fr-FR', {dateStyle: 'medium'}).format(d)
}

function formatPeriod(start: string | null, end: string | null) {
  return `${formatDate(start)} — ${formatDate(end)}`
}

async function loadAttempts() {
  if (!props.payment.paymentTransactionGuid) return
  await store.loadPaymentAttempts(props.payment.paymentTransactionGuid)
  audit('attempts:loaded', {
    paymentTransactionGuid: props.payment.paymentTransactionGuid,
    count: store.paymentAttempts.length,
    latestStatus: currentAttempt.value?.status
  })
  schedulePolling()
}

function openPaymentConfirmation() {
  customerMessage.value = ''
  if (!canInitiate.value) return
  confirmingPayment.value = true
}

async function confirmAndSubmitPayment() {
  if (!canInitiate.value || store.initiatingPayment) return
  confirmingPayment.value = false
  await submitPayment()
}

async function submitPayment() {
  customerMessage.value = ''
  if (!canInitiate.value || !props.payment.paymentTransactionGuid) return
  if (!actionKey.value) {
    actionKey.value = newActionKey()
    actionPhone.value = normalizedPhone.value
  }
  audit('payment:initiate', {
    paymentTransactionGuid: props.payment.paymentTransactionGuid,
    phoneSuffix: normalizedPhone.value.slice(-3)
  })
  const attempt = await store.initiatePayment({
    payment_transaction_guid: props.payment.paymentTransactionGuid,
    phone_number: normalizedPhone.value,
    idempotency_key: actionKey.value,
  })
  if (!attempt) {
    const status = store.lastPaymentErrorStatus
    if (status === 400) {
      customerMessage.value = 'La demande de paiement n’a pas pu être envoyée avec les informations saisies. Vérifiez le numéro puis réessayez.'
    } else if (status === 409) {
      customerMessage.value = 'Ce paiement ne peut pas être lancé pour le moment. Nous vérifions l’état de votre facture avant toute nouvelle demande.'
    } else if (status === 429) {
      customerMessage.value = 'Une vérification est déjà en cours. Patientez quelques instants avant de réessayer.'
    } else {
      customerMessage.value = 'Nous ne pouvons pas encore confirmer le résultat de cette demande. Nous vérifions son état avant toute nouvelle tentative.'
    }
    audit('payment:initiate-error', {status, code: store.lastPaymentErrorCode})
    await loadAttempts()
    return
  }
  customerMessage.value = ''
  schedulePolling()
}

async function refreshNow() {
  if (!currentAttempt.value?.guid) return
  await store.refreshPaymentAttempt(currentAttempt.value.guid)
  if (String(store.paymentAttempts[0]?.status || '').toUpperCase() === 'COMPLETED') await store.loadStatus()
  schedulePolling()
}

function prepareNewAttempt() {
  confirmingPayment.value = false
  actionKey.value = null
  actionPhone.value = null
  phoneConfirmed.value = false
  customerMessage.value = ''
  store.clearPaymentAttempts()
}

function stopPolling() {
  if (pollTimer) window.clearTimeout(pollTimer);
  pollTimer = null
}

function schedulePolling() {
  stopPolling()
  const attempt = currentAttempt.value
  if (!attempt || !isOnline.value) return
  const status = String(attempt.status || '').toUpperCase()
  if (['FAILED', 'CANCELLED'].includes(status)) return
  const delay = status === 'COMPLETED' ? 15000 : 5000
  pollTimer = window.setTimeout(async () => {
    if (!isOnline.value) return
    if (status === 'COMPLETED') await store.loadStatus()
    else if (attempt.guid) await store.refreshPaymentAttempt(attempt.guid)
    schedulePolling()
  }, delay)
}

async function recoverPaymentState() {
  if (!isOnline.value || recovering.value || !props.payment.paymentTransactionGuid) return
  recovering.value = true
  try {
    // Reprendre l'état existant : jamais réémettre payment-initiate automatiquement.
    await store.loadPaymentAttempts(props.payment.paymentTransactionGuid)
    const attempt = currentAttempt.value
    const status = String(attempt?.status || '').toUpperCase()
    if (attempt?.guid && ['CREATED', 'UNKNOWN', 'PENDING', 'PROCESSING'].includes(status)) {
      await store.refreshPaymentAttempt(attempt.guid)
    }
    if (String(currentAttempt.value?.status || '').toUpperCase() === 'COMPLETED') await store.loadStatus()
    audit('connection:payment-recovered', {latestStatus: currentAttempt.value?.status})
  } finally {
    recovering.value = false
    schedulePolling()
  }
}

function handleOnline() {
  isOnline.value = true;
  void recoverPaymentState()
}

function handleOffline() {
  isOnline.value = false;
  confirmingPayment.value = false;
  stopPolling();
  audit('connection:offline')
}

watch(() => props.payment.paymentTransactionGuid, async () => {
  store.clearPaymentAttempts();
  actionKey.value = null;
  await loadAttempts()
})
watch(() => currentAttempt.value?.status, schedulePolling)
onMounted(async () => {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  await loadAttempts()
})
onBeforeUnmount(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  stopPolling()
})
</script>

<style scoped>
.payment-card {
  padding: 26px;
  border: 1px solid #dfe6ee;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(27, 55, 90, .06);
}

.payment-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 28px;
}

.payment-card h2 {
  margin: 5px 0 8px;
  color: #17202a;
  font-size: 22px;
}

.payment-card p {
  color: #687789;
  line-height: 1.55;
}

.eyebrow {
  color: #004aad;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.amount-box {
  min-width: 190px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #003478;
  color: #fff;
  text-align: right;
}

.amount-box span {
  display: block;
  color: rgba(255, 255, 255, .72);
  font-size: 11px;
}

.amount-box strong {
  display: block;
  margin-top: 4px;
  font-size: 21px;
}

.period-row {
  margin-top: 18px;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  border: 1px solid #e4e9ef;
  border-radius: 13px;
  background: #f8fafc;
}

.period-row span {
  display: block;
  color: #7c8794;
  font-size: 11px;
}

.period-row strong {
  display: block;
  margin-top: 3px;
  color: #344152;
  font-size: 13px;
}

.info-state {
  margin-top: 20px;
  padding: 18px;
  border-radius: 13px;
  background: #f5f7fa;
  color: #687789;
}

.attempt-state {
  margin-top: 20px;
  padding: 18px;
  display: flex;
  gap: 14px;
  border: 1px solid;
  border-radius: 15px;
}

.attempt-state__icon {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-weight: 900;
}

.attempt-state strong {
  display: block;
  color: #263548;
  font-size: 14px;
}

.attempt-state p {
  margin-top: 5px;
  font-size: 12px;
}

.attempt-state small {
  display: block;
  margin-top: 6px;
  color: #7a8797;
  font-size: 11px;
}

.attempt-state--waiting {
  border-color: #f0d49c;
  background: #fffaf0;
}

.attempt-state--waiting .attempt-state__icon {
  background: #ffedc8;
  color: #996000;
}

.attempt-state--success {
  border-color: #b8dfc0;
  background: #f3fbf5;
}

.attempt-state--success .attempt-state__icon {
  background: #daf1df;
  color: #17642a;
}

.attempt-state--danger {
  border-color: #efc1c6;
  background: #fff6f7;
}

.attempt-state--danger .attempt-state__icon {
  background: #f7dfe2;
  color: #a61f2d;
}

.retry-zone, .refresh-zone {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.payment-form {
  margin-top: 22px;
  padding-top: 22px;
  border-top: 1px solid #edf0f4;
}

.payment-form > label:first-child {
  display: block;
  color: #344152;
  font-size: 13px;
  font-weight: 800;
}

.phone-control {
  margin-top: 9px;
  display: flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid #cdd6e0;
  border-radius: 12px;
}

.phone-control > span {
  align-self: stretch;
  padding: 0 14px;
  display: grid;
  place-items: center;
  background: #f4f7fa;
  color: #344152;
  font-weight: 800;
  border-right: 1px solid #dce3eb;
}

.phone-control input {
  min-height: 50px;
  flex: 1;
  padding: 0 14px;
  border: 0;
  outline: 0;
  font: inherit;
  font-size: 16px;
}

.field-help {
  margin-top: 7px;
  font-size: 11px;
}

.confirmation-check {
  margin-top: 18px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: #48576a;
  font-size: 12px;
  line-height: 1.5;
  cursor: pointer;
}

.confirmation-check input {
  margin-top: 3px;
  accent-color: #004aad;
}

.payment-summary-line {
  margin: 15px 0;
  padding: 13px 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  border-radius: 11px;
  background: #f5f9ff;
}

.payment-summary-line span {
  color: #6a7788;
  font-size: 11px;
}

.payment-summary-line strong {
  color: #003478;
  font-size: 14px;
}

.security-note {
  margin-top: 10px;
  font-size: 11px;
}

.btn {
  min-height: 42px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1px solid transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.btn:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.btn-primary {
  background: #004aad;
  color: #fff;
}

.btn-secondary {
  background: #fff;
  color: #004aad;
  border-color: #b9cbe1;
}

.btn-large {
  width: 100%;
  min-height: 50px;
}

.message {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 11px;
  font-size: 12px;
  line-height: 1.5;
}

.message--warning {
  border: 1px solid #efd39c;
  background: #fffaf0;
  color: #8a500d;
}

@media (max-width: 720px) {
  .payment-card {
    padding: 20px;
  }

  .payment-card__head {
    display: grid;
  }

  .amount-box {
    width: 100%;
    text-align: left;
  }

  .period-row {
    display: grid;
  }
}
</style>
