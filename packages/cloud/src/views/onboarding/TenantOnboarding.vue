<template>
  <main class="onboarding-page">
    <header class="public-header">
      <div class="header-inner">
        <a class="brand" href="/" aria-label="Toké">
          <span class="brand-mark">T</span>
          <span class="brand-copy"><strong>Toké</strong><small>Gestion intelligente du temps de travail</small></span>
        </a>
        <div class="secure-pill">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 10V7a5 5 0 0 1 10 0v3M6 10h12v10H6z"/>
          </svg>
          Parcours sécurisé
        </div>
      </div>
    </header>

    <ConnectivityBanner :online="isOnline" :recovering="recovering" @retry="recoverAfterConnection"/>

    <section v-if="initialLoading" class="state-page" aria-live="polite">
      <div class="spinner"></div>
      <h1>Vérification de votre invitation</h1>
      <p>Nous préparons les informations de votre organisation.</p>
    </section>

    <section v-else-if="showResend" class="state-page state-page--card">
      <span class="eyebrow">Lien indisponible</span>
      <h1>Recevoir un nouveau lien</h1>
      <p>Utilisez l’adresse email communiquée lors de la création de votre organisation.</p>
      <form class="resend-form" @submit.prevent="submitResend">
        <label for="resend-email">Adresse email</label>
        <input id="resend-email" v-model.trim="resendEmail" type="email" autocomplete="email" required/>
        <button class="btn btn-primary" type="submit" :disabled="store.resending || !resendEmail">
          {{ store.resending ? 'Envoi en cours…' : 'Recevoir un nouveau lien' }}
        </button>
      </form>
      <p v-if="store.resendSuccess" class="message message--success">Si cette adresse correspond à une organisation
        éligible, un lien sera envoyé.</p>
      <p v-if="store.error" class="message message--error">{{ customerErrorMessage }}</p>
    </section>

    <template v-else>
      <section class="hero-band">
        <div class="hero-inner">
          <div><span class="eyebrow eyebrow--light">Première licence Toké</span>
            <h1>Activez {{ tenantTitle }}</h1>
            <p>Vérifiez votre offre, choisissez votre capacité et consultez le montant estimé avant de confirmer votre
              première licence.</p></div>
          <div class="organization-card"><span>Organisation</span><strong>{{ tenantTitle }}</strong></div>
        </div>
      </section>

      <nav class="steps">
        <div class="steps-inner">
          <div class="step" :class="{ 'step--active': currentStep === 1, 'step--done': currentStep > 1 }"><span>1</span>
            <div><strong>Licence</strong><small>Choisir la capacité</small></div>
          </div>
          <div class="step-line"></div>
          <div class="step" :class="{ 'step--active': currentStep === 2, 'step--done': currentStep > 2 }"><span>2</span>
            <div><strong>Paiement</strong><small>Régler la facture</small></div>
          </div>
          <div class="step-line"></div>
          <div class="step" :class="{ 'step--active': currentStep === 3 }"><span>3</span>
            <div><strong>Activation</strong><small>Préparation de l’espace</small></div>
          </div>
        </div>
      </nav>

      <section class="content-shell">
        <div class="main-column">
          <section class="status-banner" :class="statusBannerClass">
            <div class="status-dot"></div>
            <div><span>État actuel</span><strong>{{ displayState }}</strong><small>{{ statusExplanation }}</small></div>
            <button class="btn btn-ghost" type="button" :disabled="store.loadingStatus" @click="refreshStatus">
              {{ store.loadingStatus ? 'Actualisation…' : 'Actualiser' }}
            </button>
          </section>

          <ActivationAccessPanel
              v-if="store.status && ['ACTIVATION_PENDING', 'READY', 'RESTRICTED'].includes(phase)"
              :status="store.status"
              @refresh="refreshStatus"
          />

          <MobileMoneyPaymentPanel
              v-else-if="phase === 'PAYMENT_PENDING' && activePayment"
              :payment="activePayment"
          />

          <section v-else-if="phase === 'PAYMENT_PENDING' && !activePayment" class="section-card contract-warning">
            <strong>Nous ne pouvons pas ouvrir le paiement pour le moment.</strong>
            <p>Votre facture existe, mais les informations nécessaires pour reprendre le règlement ne sont pas encore
              disponibles. Actualisez la page ou réessayez plus tard.</p>
          </section>

          <section v-else-if="phase === 'SUBSCRIPTION_REQUIRED'" class="section-card subscription-card">
            <div class="section-heading section-heading--split">
              <div><span class="eyebrow">Votre offre</span>
                <h2>{{ licenseDisplayName }}</h2>
                <p>Ces conditions sont celles actuellement proposées à votre organisation.</p></div>
              <span class="offer-badge">{{ billingModeLabel }}</span></div>

            <div class="facts-grid">
              <div class="fact"><span>Facturation</span><strong>{{ billingLabel }}</strong><small>{{
                  billingModeDetail
                }}</small></div>
              <div class="fact"><span>Minimum</span><strong>{{
                  minimumSeats == null ? 'Indisponible' : `${minimumSeats} collaborateurs`
                }}</strong><small>Capacité minimale de la première licence.</small></div>
              <div class="fact fact--highlight"><span>Tarif de référence</span><strong>{{
                  unitPriceLabel
                }}</strong><small>Prix unitaire hors taxes.</small></div>
              <div class="fact"><span>Devise de règlement</span><strong>{{
                  store.status?.billingCurrencyCode || 'Indisponible'
                }}</strong><small>Le montant final de la facture est établi dans cette devise.</small></div>
            </div>

            <div v-if="store.status?.periodNotice" class="period-notice">
              <svg viewBox="0 0 24 24">
                <path d="M12 8v4m0 4h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"/>
              </svg>
              <div><strong>À savoir sur votre période</strong>
                <p>{{ store.status.periodNotice }}</p></div>
            </div>

            <div v-if="!commercialTermsComplete" class="contract-warning"><strong>Souscription temporairement
              indisponible.</strong>
              <p>Certaines informations nécessaires ne sont pas disponibles pour le moment.</p></div>

            <form class="subscription-form" @submit.prevent="submitSubscription">
              <fieldset>
                <legend>Combien de collaborateurs souhaitez-vous couvrir ?</legend>
                <p class="field-help">Chaque place correspond à une licence employé rattachée à la licence globale de
                  {{ tenantTitle }}.</p>
                <div class="seat-control">
                  <button type="button" :disabled="!canDecrease" @click="decreaseSeats">−</button>
                  <div><input v-model.number="requestedSeats" type="number" :min="minimumSeats ?? undefined"
                              :max="maximumSeats ?? undefined" step="1"
                              @blur="enforceSeats"/><span>collaborateurs</span></div>
                  <button type="button" :disabled="!canIncrease" @click="increaseSeats">+</button>
                </div>
                <div class="minimum-rule"><span v-if="minimumSeats != null">Minimum requis : <strong>{{
                    minimumSeats
                  }}</strong> collaborateurs.</span></div>
              </fieldset>

              <fieldset>
                <legend>Choisissez votre moyen de paiement</legend>
                <div v-if="store.loadingPaymentMethods" class="payment-loading">Chargement…</div>
                <div v-else-if="store.paymentMethods.length" class="payment-grid">
                  <label v-for="method in store.paymentMethods" :key="String(method.guid)" class="payment-option"
                         :class="{ 'payment-option--selected': selectedPaymentMethod === String(method.guid) }">
                    <input v-model="selectedPaymentMethod" type="radio" name="payment-method"
                           :value="String(method.guid)"/>
                    <span class="payment-radio"></span><span class="payment-copy"><strong>{{
                      method.name
                    }}</strong><small>{{ paymentMethodDetail(method) }}</small></span>
                  </label>
                </div>
                <p v-else class="message message--warning">Aucun moyen de paiement n’est disponible pour cette
                  souscription.</p>
              </fieldset>

              <section class="section-card" v-if="canEstimate || store.estimating || store.estimate">
                <div class="section-heading">
                  <div><span class="eyebrow">Estimation</span>
                    <h2>Votre récapitulatif avant validation</h2>
                    <p>Cette estimation n’est pas encore une facture. La facture enregistrée après souscription devient
                      la référence.</p></div>
                </div>
                <div v-if="store.estimating" class="payment-loading">Mise à jour de l’estimation…</div>
                <div v-else-if="store.estimate" class="facts-grid">
                  <div class="fact">
                    <span>Collaborateurs</span><strong>{{ store.estimate.requestedSeats ?? requestedSeats }}</strong>
                  </div>
                  <div class="fact"><span>Montant HT</span><strong>{{
                      formatMoney(store.estimate.subtotalLocal, store.estimate.billingCurrencyCode)
                    }}</strong></div>
                  <div class="fact"><span>Taxes</span><strong>{{
                      formatMoney(store.estimate.taxAmountLocal, store.estimate.billingCurrencyCode)
                    }}</strong></div>
                </div>
                <div v-if="store.estimate?.notice" class="period-notice">
                  <div><strong>Information</strong>
                    <p>{{ store.estimate.notice }}</p></div>
                </div>
              </section>

              <div class="form-actions-mobile">
                <button class="btn btn-primary btn-large" type="submit"
                        :disabled="!canSubmitSubscription || store.subscribing">
                  {{ store.subscribing ? 'Enregistrement…' : 'Confirmer ma première licence' }}
                </button>
              </div>
            </form>
          </section>

          <section v-else class="section-card contract-warning">
            <strong>Nous vérifions l’état de votre espace.</strong>
            <p>Les informations actuelles ne permettent pas encore d’afficher l’étape suivante. Actualisez dans quelques
              instants.</p>
            <button class="btn btn-ghost" type="button" :disabled="store.loadingStatus" @click="refreshStatus">
              {{ store.loadingStatus ? 'Actualisation…' : 'Actualiser' }}
            </button>
          </section>
          <p v-if="store.error" class="message message--error">{{ customerErrorMessage }}</p>
        </div>

        <aside class="summary-column">
          <div class="summary-card">
            <div class="summary-header"><span class="eyebrow">Résumé</span>
              <h2>Votre souscription</h2></div>
            <dl class="summary-list">
              <div>
                <dt>Organisation</dt>
                <dd>{{ tenantTitle }}</dd>
              </div>
              <div>
                <dt>Licence</dt>
                <dd>{{ licenseDisplayName }}</dd>
              </div>
              <div>
                <dt>Cycle</dt>
                <dd>{{ billingLabel }}</dd>
              </div>
              <div>
                <dt>Capacité</dt>
                <dd>{{ requestedSeats == null ? 'À définir' : `${requestedSeats} collaborateurs` }}</dd>
              </div>
              <div>
                <dt>Tarif unitaire</dt>
                <dd>{{ unitPriceLabel }}</dd>
              </div>
              <template v-if="store.estimate">
                <div>
                  <dt>HT estimé</dt>
                  <dd>{{ formatMoney(store.estimate.subtotalLocal, store.estimate.billingCurrencyCode) }}</dd>
                </div>
                <div>
                  <dt>Taxes estimées</dt>
                  <dd>{{ formatMoney(store.estimate.taxAmountLocal, store.estimate.billingCurrencyCode) }}</dd>
                </div>
              </template>
            </dl>
            <div class="total-box" :class="{ 'total-box--pending': !store.estimate }">
              <span>Total TTC à régler</span><strong>{{
                store.estimate ? formatMoney(store.estimate.totalAmountLocal, store.estimate.billingCurrencyCode) : 'À calculer'
              }}</strong><small>{{
                store.estimate ? 'Montant fourni par Toké pour cette estimation.' : 'Choisissez une capacité et un moyen de paiement.'
              }}</small></div>
            <button v-if="!subscriptionAlreadyCreated" class="btn btn-primary btn-large summary-submit" type="button"
                    :disabled="!canSubmitSubscription || store.subscribing" @click="submitSubscription">Confirmer ma
              première licence
            </button>
          </div>
        </aside>
      </section>
      <footer class="public-footer"><p>Ce portail permet de finaliser votre première licence et de suivre l’activation
        de votre espace Toké.</p><span>Toké · Imediatis</span></footer>
    </template>
  </main>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useTenantOnboardingStore} from '@/stores/tenantOnboardingStore'
import type {OnboardingPaymentMethod, OnboardingPaymentView} from '@/service/TenantOnboardingService'
import ActivationAccessPanel from '@/views/onboarding/components/ActivationAccessPanel.vue'
import MobileMoneyPaymentPanel from '@/views/onboarding/components/MobileMoneyPaymentPanel.vue'
import ConnectivityBanner from '@/views/onboarding/components/ConnectivityBanner.vue'

const store = useTenantOnboardingStore()
const requestedSeats = ref<number | null>(null)
const selectedPaymentMethod = ref('')
const resendEmail = ref('')
const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
const recovering = ref(false)
let estimateTimer: number | null = null
let statusTimer: number | null = null

const initialLoading = computed(() => store.loadingStatus && !store.status)
const showResend = computed(() => store.tokenInvalidOrExpired || (!store.hasToken && !store.loadingStatus))
const tenantTitle = computed(() => store.status?.tenantName || 'Votre organisation')
const minimumSeats = computed(() => store.status?.minimumSeats ?? null)
const maximumSeats = computed(() => store.status?.maximumSeats ?? null)
const phase = computed(() => String(store.status?.phase || '').toUpperCase())
const activePayment = computed<OnboardingPaymentView | null>(() => {
  const payments = store.status?.payments ?? []
  if (payments.length === 1) return payments[0]
  const outstanding = payments.filter((payment) => {
    const due = Number(payment.amountToPayLocal)
    const status = String(payment.transactionStatus || '').toUpperCase()
    return status !== 'COMPLETED' && (!Number.isFinite(due) || due > 0)
  })
  if (outstanding.length === 1) return outstanding[0]
  if (import.meta.env.DEV && phase.value === 'PAYMENT_PENDING') {
    console.debug('[Toké onboarding] payment:ambiguous', {
      licenseGuid: store.status?.licenseGuid,
      payments: payments.map((payment) => ({
        paymentTransactionGuid: payment.paymentTransactionGuid,
        transactionStatus: payment.transactionStatus,
        amountToPayLocal: payment.amountToPayLocal,
      })),
    })
  }
  return null
})
const subscriptionAlreadyCreated = computed(() => ['PAYMENT_PENDING', 'ACTIVATION_PENDING', 'READY', 'RESTRICTED'].includes(phase.value))
const currentStep = computed(() => phase.value === 'SUBSCRIPTION_REQUIRED' ? 1 : phase.value === 'PAYMENT_PENDING' ? 2 : 3)
const displayState = computed(() => ({
  SUBSCRIPTION_REQUIRED: 'Première licence à souscrire',
  PAYMENT_PENDING: 'Paiement en attente',
  ACTIVATION_PENDING: 'Paiement confirmé',
  READY: 'Espace prêt',
  RESTRICTED: 'Accès restreint'
}[phase.value] || 'Suivi en cours'))
const statusExplanation = computed(() => ({
  SUBSCRIPTION_REQUIRED: 'Choisissez votre capacité et consultez l’estimation avant de confirmer.',
  PAYMENT_PENDING: 'Votre facture existe. Le paiement reste à finaliser.',
  ACTIVATION_PENDING: 'Votre paiement est confirmé. Votre espace est en cours de préparation.',
  READY: 'Votre espace Toké est prêt.',
  RESTRICTED: 'Votre espace nécessite une vérification avant de poursuivre.'
}[phase.value] || 'Suivez ici l’avancement de votre demande.'))
const statusBannerClass = computed(() => ({
  'status-banner--success': phase.value === 'READY',
  'status-banner--waiting': phase.value !== 'SUBSCRIPTION_REQUIRED' && phase.value !== 'READY'
}))
const licenseDisplayName = computed(() => store.status?.licenseLabel || store.status?.licenseType || 'Information indisponible')
const billingModeLabel = computed(() => store.status?.billingMode === 'PREPAID' ? 'Prépayée' : store.status?.billingMode || 'Indisponible')
const billingModeDetail = computed(() => store.status?.billingMode === 'PREPAID' ? 'La première période est réglée avant utilisation.' : 'Conditions de facturation communiquées par Toké.')
const billingLabel = computed(() => store.status?.billingCycleMonths === 1 ? 'Mensuelle' : store.status?.billingCycleMonths ? `${store.status.billingCycleMonths} mois` : 'Indisponible')
const unitPriceLabel = computed(() => store.status?.unitPriceUsd && store.status?.pricingCurrencyCode ? `${formatMoney(store.status.unitPriceUsd, store.status.pricingCurrencyCode)} / collaborateur / mois HT` : 'Indisponible')
const commercialTermsComplete = computed(() => Boolean(store.status?.licenseType && store.status?.billingCycleMonths && minimumSeats.value && maximumSeats.value && store.status?.unitPriceUsd && store.status?.pricingCurrencyCode && store.status?.billingCurrencyCode && store.status?.periodNotice && store.status?.canSubscribe))
const canEstimate = computed(() => Boolean(commercialTermsComplete.value && validSeats.value && selectedPaymentMethod.value))
const validSeats = computed(() => requestedSeats.value != null && minimumSeats.value != null && Number.isInteger(requestedSeats.value) && requestedSeats.value >= minimumSeats.value && (maximumSeats.value == null || requestedSeats.value <= maximumSeats.value))
const canSubmitSubscription = computed(() => Boolean(canEstimate.value && store.estimate && !store.estimating && !subscriptionAlreadyCreated.value))
const canDecrease = computed(() => requestedSeats.value != null && minimumSeats.value != null && requestedSeats.value > minimumSeats.value)
const canIncrease = computed(() => requestedSeats.value != null && (maximumSeats.value == null || requestedSeats.value < maximumSeats.value))
const customerErrorMessage = computed(() => showResend.value ? 'Nous ne pouvons pas utiliser ce lien. Vous pouvez demander un nouveau lien.' : 'Une erreur est survenue. Veuillez réessayer dans quelques instants.')

function audit(event: string, details: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug(`[Toké onboarding] ${event}`, details)
}

function paymentMethodGuid() {
  return store.paymentMethods.find(m => String(m.guid) === selectedPaymentMethod.value)?.guid ?? selectedPaymentMethod.value
}

function enforceSeats() {
  if (minimumSeats.value == null) return;
  let n = Math.floor(Number(requestedSeats.value));
  if (!Number.isFinite(n)) n = minimumSeats.value;
  n = Math.max(minimumSeats.value, n);
  if (maximumSeats.value != null) n = Math.min(maximumSeats.value, n);
  requestedSeats.value = n
}

function increaseSeats() {
  if (requestedSeats.value == null || minimumSeats.value == null) requestedSeats.value = minimumSeats.value; else if (canIncrease.value) requestedSeats.value++
}

function decreaseSeats() {
  if (canDecrease.value && requestedSeats.value != null) requestedSeats.value--
}

function paymentMethodDetail(method: OnboardingPaymentMethod) {
  return method.supportedCurrencies.length ? `Règlement en ${method.supportedCurrencies.join(', ')}` : method.methodType === 'MOBILE_MONEY' ? 'Paiement Mobile Money' : ''
}

function formatMoney(value: string | number | null | undefined, currency?: string | null) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return `${value}${currency ? ` ${currency}` : ''}`;
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

function scheduleEstimate() {
  store.invalidateEstimate();
  if (estimateTimer) window.clearTimeout(estimateTimer);
  if (!canEstimate.value) return;
  estimateTimer = window.setTimeout(async () => {
    audit('estimate:request', {requestedSeats: requestedSeats.value, paymentMethodGuid: paymentMethodGuid()});
    await store.loadEstimate(requestedSeats.value!, paymentMethodGuid())
  }, 350)
}

watch([requestedSeats, selectedPaymentMethod], scheduleEstimate)

async function refreshStatus() {
  await store.loadStatus();
  if (store.status?.phase === 'SUBSCRIPTION_REQUIRED') await store.loadPaymentMethods()
}

async function submitSubscription() {
  enforceSeats();
  if (!canSubmitSubscription.value) return;
  const ok = await store.subscribe(requestedSeats.value!, paymentMethodGuid());
  audit('subscription:result', {ok, phase: store.status?.phase});
  if (ok) startStatusPolling()
}

async function submitResend() {
  if (resendEmail.value) await store.resend(resendEmail.value)
}

function startStatusPolling() {
  if (statusTimer) window.clearInterval(statusTimer)
  if (!isOnline.value) return
  if (['PAYMENT_PENDING', 'ACTIVATION_PENDING'].includes(phase.value)) {
    statusTimer = window.setInterval(() => {
      if (isOnline.value) void store.loadStatus()
    }, 20000)
  }
}

async function recoverAfterConnection() {
  if (!store.hasToken || !isOnline.value || recovering.value) return
  recovering.value = true
  try {
    await store.loadStatus()
    if (store.status?.phase === 'SUBSCRIPTION_REQUIRED') await store.loadPaymentMethods()
    audit('connection:recovered', {phase: store.status?.phase})
  } finally {
    recovering.value = false
    startStatusPolling()
  }
}

function handleOnline() {
  isOnline.value = true;
  void recoverAfterConnection()
}

function handleOffline() {
  isOnline.value = false;
  if (statusTimer) window.clearInterval(statusTimer);
  statusTimer = null;
  audit('connection:offline')
}

onMounted(async () => {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  store.bootstrapTokenFromFragment();
  if (!store.hasToken) return;
  await store.loadStatus();
  if (store.status?.phase === 'SUBSCRIPTION_REQUIRED') {
    requestedSeats.value = store.status.minimumSeats;
    await store.loadPaymentMethods()
  }
  startStatusPolling()
})
onBeforeUnmount(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  if (estimateTimer) window.clearTimeout(estimateTimer);
  if (statusTimer) window.clearInterval(statusTimer)
})
watch(phase, startStatusPolling)
</script>
<style scoped>
.onboarding-page {
  min-height: 100vh;
  background: #f5f7fb;
  color: var(--text-primary, #212529);
  font-family: var(--font-primary, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
}

.public-header {
  background: #fff;
  border-bottom: 1px solid #e9ecef;
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  min-height: 76px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #004aad;
  color: #fff;
  font-size: 22px;
  font-weight: 800;
  box-shadow: 0 8px 20px rgba(0, 74, 173, .2);
}

.brand-copy {
  display: grid;
  gap: 1px;
}

.brand-copy strong {
  color: #003478;
  font-size: 20px;
}

.brand-copy small {
  color: #6c757d;
  font-size: 12px;
}

.secure-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #dbe7f7;
  border-radius: 999px;
  color: #004aad;
  background: #f5f9ff;
  font-size: 12px;
  font-weight: 700;
}

.secure-pill svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
}

.hero-band {
  background: linear-gradient(135deg, #003478 0%, #004aad 58%, #0864d8 100%);
  color: #fff;
}

.hero-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 42px 32px;
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(260px, .5fr);
  gap: 48px;
  align-items: center;
}

.hero-inner h1 {
  margin: 8px 0 12px;
  font-size: clamp(30px, 4vw, 46px);
  line-height: 1.08;
  letter-spacing: -.02em;
}

.hero-inner p {
  max-width: 720px;
  color: rgba(255, 255, 255, .86);
  font-size: 16px;
  line-height: 1.7;
}

.eyebrow {
  color: #004aad;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .11em;
  text-transform: uppercase;
}

.eyebrow--light {
  color: #ffde59;
}

.organization-card {
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, .22);
  border-radius: 16px;
  background: rgba(255, 255, 255, .1);
  backdrop-filter: blur(8px);
}

.organization-card span, .organization-card small {
  display: block;
  color: rgba(255, 255, 255, .72);
  font-size: 12px;
}

.organization-card strong {
  display: block;
  margin: 5px 0 6px;
  font-size: 20px;
}

.steps {
  background: #fff;
  border-bottom: 1px solid #e9ecef;
}

.steps-inner {
  max-width: 880px;
  margin: 0 auto;
  padding: 20px 32px;
  display: flex;
  align-items: center;
}

.step {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #8a94a3;
  min-width: 160px;
}

.step > span {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 2px solid #d8dee7;
  background: #fff;
  font-weight: 800;
}

.step div {
  display: grid;
}

.step strong {
  font-size: 13px;
}

.step small {
  font-size: 11px;
}

.step--active {
  color: #004aad;
}

.step--active > span {
  border-color: #004aad;
  background: #004aad;
  color: #fff;
}

.step--done {
  color: #166534;
}

.step--done > span {
  border-color: #28a745;
  background: #28a745;
  color: #fff;
}

.step-line {
  height: 1px;
  flex: 1;
  background: #dfe3e8;
  margin: 0 14px;
}

.content-shell {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 28px;
  align-items: start;
}

.main-column {
  display: grid;
  gap: 20px;
  min-width: 0;
}

.summary-column {
  position: sticky;
  top: 24px;
  display: grid;
  gap: 14px;
}

.section-card, .summary-card {
  background: #fff;
  border: 1px solid #e4e9ef;
  border-radius: 18px;
  box-shadow: 0 6px 24px rgba(25, 43, 70, .06);
}

.section-card {
  padding: 26px;
}

.summary-card {
  padding: 24px;
}

.status-banner {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 15px 18px;
  border: 1px solid #bcd2ee;
  border-radius: 14px;
  background: #f5f9ff;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #004aad;
  box-shadow: 0 0 0 5px rgba(0, 74, 173, .09);
}

.status-banner div {
  display: grid;
  gap: 1px;
}

.status-banner span {
  color: #6c757d;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .06em;
  font-weight: 700;
}

.status-banner strong {
  color: #003478;
  font-size: 15px;
}

.status-banner small {
  color: #6c757d;
  font-size: 12px;
}

.status-banner--waiting {
  background: #fffaf0;
  border-color: #f5d899;
}

.status-banner--waiting .status-dot {
  background: #f67214;
  box-shadow: 0 0 0 5px rgba(246, 114, 20, .1);
}

.status-banner--success {
  background: #f3fbf5;
  border-color: #b9e2c3;
}

.status-banner--success .status-dot {
  background: #28a745;
  box-shadow: 0 0 0 5px rgba(40, 167, 69, .1);
}

.section-heading {
  margin-bottom: 22px;
}

.section-heading--split {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.section-heading h2, .summary-header h2, .success-card h2, .waiting-card h2 {
  margin: 6px 0 0;
  color: #17202a;
  font-size: 22px;
  line-height: 1.25;
}

.section-heading p {
  margin-top: 8px;
  max-width: 690px;
  color: #6c757d;
  font-size: 14px;
  line-height: 1.6;
}

.offer-badge {
  flex: 0 0 auto;
  padding: 8px 11px;
  border-radius: 999px;
  background: #eaf3ff;
  color: #004aad;
  font-size: 12px;
  font-weight: 800;
}

.explain-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.explain-grid article {
  padding: 18px;
  border: 1px solid #e8edf3;
  border-radius: 14px;
  background: #fbfcfe;
}

.explain-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  margin-bottom: 14px;
  border-radius: 12px;
  background: #eaf3ff;
  color: #004aad;
}

.explain-icon svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
}

.explain-grid h3 {
  color: #243447;
  font-size: 15px;
}

.explain-grid p {
  margin-top: 7px;
  color: #6c757d;
  font-size: 13px;
  line-height: 1.55;
}

.facts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.fact {
  min-height: 104px;
  padding: 17px;
  border: 1px solid #e4e9ef;
  border-radius: 14px;
  background: #fbfcfe;
}

.fact span, .period-panel span {
  display: block;
  color: #6c757d;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .055em;
  font-weight: 700;
}

.fact strong {
  display: block;
  margin: 6px 0 4px;
  color: #16253a;
  font-size: 17px;
}

.fact small {
  color: #7c8796;
  font-size: 12px;
  line-height: 1.4;
}

.fact--highlight {
  border-color: #b9d3f4;
  background: #f5f9ff;
}

.fact--highlight strong {
  color: #004aad;
}

.fact--missing {
  border-color: #efd39c;
  background: #fffaf0;
}

.fact--missing strong {
  color: #8a500d;
}

.contract-warning {
  margin-top: 18px;
  padding: 15px 17px;
  border: 1px solid #efd39c;
  border-radius: 13px;
  background: #fffaf0;
  color: #7a5115;
}

.contract-warning strong {
  display: block;
  font-size: 13px;
}

.contract-warning p {
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.5;
}

.contract-warning ul {
  margin: 8px 0 0 18px;
  padding: 0;
  font-size: 12px;
  line-height: 1.55;
}

.period-panel {
  margin-top: 14px;
  padding: 16px 18px;
  border: 1px dashed #cbd8e8;
  border-radius: 14px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
  background: #f9fbfd;
}

.period-panel div:last-child {
  text-align: right;
}

.period-panel strong {
  display: block;
  margin-top: 4px;
  color: #243447;
  font-size: 14px;
}

.period-arrow {
  color: #004aad;
  font-size: 20px;
}

.period-notice {
  margin-top: 14px;
  padding: 15px 17px;
  display: flex;
  gap: 11px;
  align-items: flex-start;
  border: 1px solid #bcd2ee;
  border-radius: 14px;
  background: #f5f9ff;
  color: #334e70;
}

.period-notice svg {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  fill: none;
  stroke: #004aad;
  stroke-width: 1.8;
}

.period-notice strong {
  display: block;
  color: #003478;
  font-size: 13px;
}

.period-notice p {
  margin-top: 4px;
  color: #5e6f83;
  font-size: 12px;
  line-height: 1.55;
}

.subscription-form {
  margin-top: 26px;
  display: grid;
  gap: 28px;
}

.subscription-form fieldset {
  border: 0;
  padding: 0;
  margin: 0;
}

.subscription-form legend {
  color: #17202a;
  font-size: 16px;
  font-weight: 800;
}

.field-help {
  margin-top: 5px;
  color: #6c757d;
  font-size: 13px;
  line-height: 1.5;
}

.seat-control {
  margin-top: 16px;
  display: inline-flex;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid #cad3df;
  border-radius: 14px;
  background: #fff;
}

.seat-control button {
  width: 52px;
  border: 0;
  background: #f6f8fb;
  color: #004aad;
  font-size: 24px;
  cursor: pointer;
  transition: .15s ease;
}

.seat-control button:hover:not(:disabled) {
  background: #eaf3ff;
}

.seat-control button:disabled {
  color: #b7c0cb;
  cursor: not-allowed;
}

.seat-control div {
  min-width: 150px;
  padding: 8px 14px;
  display: grid;
  place-items: center;
  border-left: 1px solid #e4e9ef;
  border-right: 1px solid #e4e9ef;
}

.seat-control input {
  width: 80px;
  border: 0;
  outline: 0;
  background: transparent;
  color: #17202a;
  text-align: center;
  font-size: 22px;
  font-weight: 800;
}

.seat-control span {
  color: #6c757d;
  font-size: 11px;
}

.minimum-rule {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 7px;
  color: #6c757d;
  font-size: 12px;
}

.minimum-rule svg {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  fill: none;
  stroke: #004aad;
  stroke-width: 1.8;
}

.payment-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.payment-option {
  position: relative;
  min-height: 72px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 11px;
  border: 1px solid #dce3eb;
  border-radius: 13px;
  background: #fff;
  cursor: pointer;
  transition: .15s ease;
}

.payment-option:hover {
  border-color: #9ebce2;
  background: #fbfdff;
}

.payment-option--selected {
  border-color: #004aad;
  background: #f5f9ff;
  box-shadow: 0 0 0 2px rgba(0, 74, 173, .08);
}

.payment-option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.payment-radio {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  border: 2px solid #b7c2cf;
  border-radius: 50%;
  background: #fff;
}

.payment-option--selected .payment-radio {
  border: 5px solid #004aad;
}

.payment-copy {
  display: grid;
  gap: 2px;
}

.payment-copy strong {
  color: #243447;
  font-size: 13px;
}

.payment-copy small {
  color: #7b8794;
  font-size: 11px;
}

.payment-loading {
  margin-top: 14px;
  padding: 16px;
  border-radius: 12px;
  background: #f7f9fb;
  color: #6c757d;
  font-size: 13px;
}

.summary-header {
  padding-bottom: 16px;
  border-bottom: 1px solid #edf0f4;
}

.summary-list {
  margin-top: 10px;
}

.summary-list > div {
  padding: 11px 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #f0f2f5;
}

.summary-list dt {
  color: #6c757d;
  font-size: 12px;
}

.summary-list dd {
  max-width: 190px;
  color: #243447;
  font-size: 12px;
  font-weight: 700;
  text-align: right;
}

.total-box {
  margin-top: 18px;
  padding: 17px;
  border-radius: 14px;
  background: #003478;
  color: #fff;
}

.total-box span {
  display: block;
  color: rgba(255, 255, 255, .7);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .06em;
}

.total-box strong {
  display: block;
  margin: 5px 0 3px;
  font-size: 23px;
}

.total-box small {
  color: rgba(255, 255, 255, .72);
  font-size: 11px;
  line-height: 1.4;
}

.total-box--pending {
  background: #f4f7fb;
  color: #243447;
  border: 1px solid #dce5ef;
}

.total-box--pending span, .total-box--pending small {
  color: #6c757d;
}

.summary-submit {
  width: 100%;
  margin-top: 16px;
}

.summary-assurance {
  margin-top: 16px;
  display: flex;
  gap: 9px;
  color: #6c757d;
  font-size: 11px;
  line-height: 1.45;
}

.summary-assurance svg {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  fill: none;
  stroke: #28a745;
  stroke-width: 1.8;
}

.learn-more {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border: 1px dashed #ccd7e4;
  border-radius: 14px;
  background: rgba(255, 255, 255, .72);
  color: #526173;
  cursor: default;
}

.learn-more span:first-child {
  display: grid;
  gap: 3px;
}

.learn-more strong {
  font-size: 12px;
}

.learn-more small {
  color: #8893a1;
  font-size: 10px;
  line-height: 1.4;
}

.success-card, .waiting-card {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}

.success-card {
  border-color: #b9e2c3;
  background: #f7fcf8;
}

.waiting-card {
  border-color: #f2d7a6;
  background: #fffaf2;
}

.success-card p, .waiting-card p {
  margin-top: 8px;
  color: #5f6c7a;
  font-size: 14px;
  line-height: 1.6;
}

.state-icon {
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 50%;
}

.state-icon svg {
  width: 23px;
  height: 23px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.state-icon--success {
  background: #e8f7ec;
  color: #1d7b32;
}

.state-icon--waiting {
  background: #fff1dc;
  color: #c25f12;
}

.state-icon--warning {
  margin: 0 auto 14px;
  background: #fff1dc;
  color: #c25f12;
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
  transition: .15s ease;
}

.btn:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.btn-primary {
  background: #004aad;
  color: #fff;
  box-shadow: 0 6px 16px rgba(0, 74, 173, .18);
}

.btn-primary:hover:not(:disabled) {
  background: #003d8f;
}

.btn-ghost {
  min-height: 36px;
  background: #fff;
  border-color: #cfd8e3;
  color: #004aad;
  box-shadow: none;
}

.btn-large {
  min-height: 50px;
  padding: 0 20px;
}

.form-actions-mobile {
  display: none;
}

.message {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 11px;
  font-size: 12px;
  line-height: 1.5;
}

.message--error {
  border: 1px solid #f0b5bb;
  background: #fff5f6;
  color: #a61f2d;
}

.message--success {
  border: 1px solid #b8dfc0;
  background: #f3fbf5;
  color: #17642a;
}

.message--warning {
  border: 1px solid #efd39c;
  background: #fffaf0;
  color: #8a500d;
}

.state-page {
  min-height: calc(100vh - 77px);
  padding: 60px 20px;
  display: grid;
  place-items: center;
  align-content: center;
  text-align: center;
  background: #f5f7fb;
}

.state-page--card {
  max-width: 560px;
  min-height: auto;
  margin: 70px auto;
  padding: 34px;
  border: 1px solid #e2e7ed;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 12px 40px rgba(31, 51, 77, .08);
}

.state-page h1 {
  margin: 7px 0 10px;
  color: #17202a;
  font-size: 28px;
}

.state-page p {
  max-width: 500px;
  color: #6c757d;
  line-height: 1.6;
}

.resend-form {
  width: 100%;
  margin-top: 22px;
  display: grid;
  gap: 9px;
  text-align: left;
}

.resend-form label {
  color: #344152;
  font-size: 12px;
  font-weight: 800;
}

.resend-form input {
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid #ccd5df;
  border-radius: 10px;
  outline: 0;
  font: inherit;
}

.resend-form input:focus {
  border-color: #004aad;
  box-shadow: 0 0 0 3px rgba(0, 74, 173, .1);
}

.spinner {
  width: 38px;
  height: 38px;
  border: 3px solid #dfe5ec;
  border-top-color: #004aad;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.public-footer {
  max-width: 1200px;
  margin: 0 auto;
  padding: 8px 32px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  color: #7d8794;
  font-size: 11px;
}

@media (max-width: 980px) {
  .hero-inner {
    grid-template-columns: 1fr;
    gap: 22px;
  }

  .organization-card {
    max-width: 360px;
  }

  .content-shell {
    grid-template-columns: 1fr;
  }

  .summary-column {
    position: static;
  }

  .summary-submit {
    display: none;
  }

  .form-actions-mobile {
    display: block;
  }

  .form-actions-mobile .btn {
    width: 100%;
  }
}

@media (max-width: 720px) {
  .header-inner, .hero-inner, .content-shell, .steps-inner, .public-footer {
    padding-left: 18px;
    padding-right: 18px;
  }

  .brand-copy small, .secure-pill {
    display: none;
  }

  .hero-inner {
    padding-top: 30px;
    padding-bottom: 30px;
  }

  .hero-inner h1 {
    font-size: 30px;
  }

  .steps-inner {
    overflow-x: auto;
  }

  .step {
    min-width: 118px;
  }

  .step small {
    display: none;
  }

  .step-line {
    min-width: 18px;
    margin: 0 8px;
  }

  .content-shell {
    padding-top: 20px;
    padding-bottom: 20px;
  }

  .section-card, .summary-card {
    padding: 20px;
    border-radius: 15px;
  }

  .explain-grid, .facts-grid, .payment-grid {
    grid-template-columns: 1fr;
  }

  .section-heading--split {
    display: grid;
  }

  .offer-badge {
    width: fit-content;
  }

  .period-panel {
    grid-template-columns: 1fr;
  }

  .period-panel div:last-child {
    text-align: left;
  }

  .period-arrow {
    transform: rotate(90deg);
  }

  .status-banner {
    grid-template-columns: auto 1fr;
  }

  .status-banner .btn {
    grid-column: 1 / -1;
    width: 100%;
  }

  .seat-control {
    width: 100%;
  }

  .seat-control div {
    flex: 1;
    min-width: 0;
  }

  .public-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
