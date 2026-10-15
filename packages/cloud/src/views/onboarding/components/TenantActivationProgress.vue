<template>
  <section class="activation-card" aria-live="polite">
    <div class="activation-head">
      <div>
        <span class="eyebrow">Suivi de l’activation</span>
        <h2>{{ status.isReady ? 'Votre espace Toké est prêt' : 'Votre souscription est en cours de traitement' }}</h2>
        <p>Suivez ici les principales étapes jusqu’à la disponibilité de votre espace Toké.</p>
      </div>
      <span class="state-chip" :class="{ 'state-chip--ready': status.isReady }">
        {{ customerStateLabel }}
      </span>
    </div>

    <div class="timeline">
      <article class="timeline-item" :class="{ 'timeline-item--done': subscriptionCreated }">
        <span class="timeline-number">1</span>
        <div>
          <strong>Souscription</strong>
          <small>{{
              subscriptionCreated ? 'Votre première licence a été enregistrée.' : 'Votre première licence reste à valider.'
            }}</small>
        </div>
      </article>

      <article class="timeline-item" :class="{ 'timeline-item--done': paymentConfirmed }">
        <span class="timeline-number">2</span>
        <div>
          <strong>Paiement</strong>
          <small>{{ paymentLabel }}</small>
        </div>
      </article>

      <article class="timeline-item" :class="{ 'timeline-item--done': provisioningStarted || status.isReady }">
        <span class="timeline-number">3</span>
        <div>
          <strong>Préparation de l’espace</strong>
          <small>{{ activationLabel }}</small>
        </div>
      </article>

      <article class="timeline-item" :class="{ 'timeline-item--done': status.isReady }">
        <span class="timeline-number">4</span>
        <div>
          <strong>Espace Toké</strong>
          <small>{{
              status.isReady ? 'Votre environnement Toké a été préparé.' : 'Votre espace sera disponible à la fin de l’activation.'
            }}</small>
        </div>
      </article>
    </div>

    <div class="facts">
      <div>
        <span>Organisation</span>
        <strong>{{ status.tenantName || '—' }}</strong>
      </div>
      <div>
        <span>Souscription</span>
        <strong>{{ subscriptionLabel }}</strong>
      </div>
      <div>
        <span>Paiement</span>
        <strong>{{ paymentLabel }}</strong>
      </div>
      <div>
        <span>Activation</span>
        <strong>{{ activationLabel }}</strong>
      </div>
    </div>

    <div v-if="hasFinancialSummary" class="financial-summary">
      <div v-if="status.invoiceAmount != null">
        <span>Montant facturé</span>
        <strong>{{ formatMoney(status.invoiceAmount, status.currencyCode) }}</strong>
      </div>
      <div v-if="status.amountReceived != null">
        <span>Montant reçu</span>
        <strong>{{ formatMoney(status.amountReceived, status.currencyCode) }}</strong>
      </div>
      <div v-if="status.amountDue != null">
        <span>Reste à payer</span>
        <strong>{{ formatMoney(status.amountDue, status.currencyCode) }}</strong>
      </div>
    </div>

    <div class="notice" :class="{ 'notice--ready': status.isReady }">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 5 6v5c0 4.6 2.9 8 7 10 4.1-2 7-5.4 7-10V6l-7-3Z"/>
        <path d="M12 8v5m0 3h.01"/>
      </svg>
      <p v-if="status.isReady">
        <strong>Votre espace Toké a été préparé.</strong>
        Nous finalisons les dernières étapes nécessaires avant votre première connexion. Vous serez informé dès que vous
        pourrez poursuivre.
      </p>
      <p v-else-if="paymentConfirmed">
        <strong>Votre paiement a bien été confirmé.</strong>
        Notre équipe prépare maintenant votre espace Toké. Vous pouvez revenir sur cette page pour suivre son
        avancement.
      </p>
      <p v-else>
        <strong>Votre souscription est enregistrée.</strong>
        Le paiement doit être confirmé avant le démarrage de l’activation de votre espace.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import {computed, watch} from 'vue'
import type {OnboardingStatusView} from '@/service/TenantOnboardingService'

const props = defineProps<{ status: OnboardingStatusView }>()

const signals = computed(() => [
  props.status.phase,
  props.status.state,
  props.status.paymentStatus,
  props.status.provisioningStatus,
].filter(Boolean).join(' ').toUpperCase())

const subscriptionCreated = computed(() =>
    Boolean(props.status.licenseGuid) || /PENDING_PAYMENT|SUBSCRIB|PAID|PAYMENT|PROVISION|READY/.test(signals.value),
)

const paymentConfirmed = computed(() => {
  const payment = String(props.status.paymentStatus || '').toUpperCase()
  const phase = String(props.status.phase || props.status.state || '').toUpperCase()
  const provisioning = String(props.status.provisioningStatus || '').toUpperCase()
  return ['PAID', 'COMPLETED', 'CONFIRMED', 'PAYMENT_CONFIRMED', 'PAYMENT_COMPLETED'].includes(payment)
      || ['ACTIVATION_PENDING', 'ACTIVATING', 'PROVISIONING', 'READY'].includes(phase)
      || ['IN_PROGRESS', 'PROVISIONING', 'READY'].includes(provisioning)
})

const provisioningStarted = computed(() => {
  const phase = String(props.status.phase || props.status.state || '').toUpperCase()
  const provisioning = String(props.status.provisioningStatus || '').toUpperCase()
  return ['ACTIVATION_PENDING', 'ACTIVATING', 'PROVISIONING', 'READY'].includes(phase)
      || ['IN_PROGRESS', 'PROVISIONING', 'READY'].includes(provisioning)
})

const customerStateLabel = computed(() => {
  if (props.status.isReady) return 'Espace prêt'
  if (provisioningStarted.value) return 'Activation en cours'
  if (paymentConfirmed.value) return 'Paiement confirmé'
  if (subscriptionCreated.value) return 'Paiement en attente'
  return 'Souscription en attente'
})

const subscriptionLabel = computed(() => subscriptionCreated.value ? 'Enregistrée' : 'À valider')
const paymentLabel = computed(() => paymentConfirmed.value ? 'Confirmé' : subscriptionCreated.value ? 'En attente' : 'À venir')
const activationLabel = computed(() => props.status.isReady ? 'Terminée' : provisioningStarted.value ? 'En cours' : 'À venir')

const hasFinancialSummary = computed(() =>
    props.status.invoiceAmount != null || props.status.amountReceived != null || props.status.amountDue != null,
)

function audit() {
  if (!import.meta.env.DEV) return
  console.debug('[Toké onboarding] activation-progress', {
    tenantGuid: props.status.tenantGuid,
    phase: props.status.phase,
    state: props.status.state,
    paymentStatus: props.status.paymentStatus,
    provisioningStatus: props.status.provisioningStatus,
    tenantStatus: props.status.tenantStatus,
    licenseGuid: props.status.licenseGuid,
    invoiceAmount: props.status.invoiceAmount,
    amountReceived: props.status.amountReceived,
    amountDue: props.status.amountDue,
    isReady: props.status.isReady,
  })
}

watch(() => props.status, audit, {immediate: true, deep: true})

function formatMoney(value: string | number | null, currency?: string | null) {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return `${value}${currency ? ` ${currency}` : ''}`

  if (currency && /^[A-Z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(numeric)
    } catch {
      // Fallback texte ci-dessous.
    }
  }

  return `${new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 2}).format(numeric)}${currency ? ` ${currency}` : ''}`
}
</script>

<style scoped>
.activation-card {
  padding: 26px;
  border: 1px solid #dce5ef;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 8px 28px rgba(28, 55, 90, .05);
}

.activation-head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
}

.eyebrow {
  color: #004aad;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .07em;
}

.activation-head h2 {
  margin: 6px 0 7px;
  color: #17202a;
  font-size: 22px;
  line-height: 1.25;
}

.activation-head p {
  max-width: 720px;
  color: #687587;
  font-size: 13px;
  line-height: 1.55;
}

.state-chip {
  padding: 8px 11px;
  border-radius: 999px;
  background: #fff3df;
  color: #99530d;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.state-chip--ready {
  background: #e9f8ed;
  color: #1f7132;
}

.timeline {
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.timeline-item {
  min-height: 108px;
  padding: 15px;
  display: flex;
  gap: 10px;
  border: 1px solid #e2e7ed;
  border-radius: 14px;
  background: #fafbfd;
}

.timeline-item--done {
  border-color: #b8d2f2;
  background: #f4f9ff;
}

.timeline-number {
  width: 27px;
  height: 27px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #e5eaf0;
  color: #637083;
  font-size: 12px;
  font-weight: 900;
}

.timeline-item--done .timeline-number {
  background: #004aad;
  color: #fff;
}

.timeline-item strong {
  display: block;
  color: #253448;
  font-size: 13px;
}

.timeline-item small {
  display: block;
  margin-top: 5px;
  color: #758193;
  font-size: 11px;
  line-height: 1.45;
}

.facts, .financial-summary {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.facts > div, .financial-summary > div {
  padding: 13px 14px;
  border: 1px solid #edf0f4;
  border-radius: 12px;
  background: #fbfcfe;
}

.facts span, .financial-summary span {
  display: block;
  color: #7b8796;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .055em;
}

.facts strong, .financial-summary strong {
  display: block;
  margin-top: 5px;
  color: #263548;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.financial-summary {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.financial-summary strong {
  color: #004aad;
  font-size: 15px;
}

.notice {
  margin-top: 18px;
  padding: 14px 15px;
  display: flex;
  gap: 10px;
  border: 1px solid #f1d29a;
  border-radius: 12px;
  background: #fffaf1;
  color: #72511c;
}

.notice--ready {
  border-color: #b9dfc2;
  background: #f4fbf6;
  color: #315f3b;
}

.notice svg {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
}

.notice p {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .timeline {
    grid-template-columns: repeat(2, 1fr);
  }

  .facts {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 620px) {
  .activation-card {
    padding: 19px;
  }

  .activation-head {
    display: grid;
  }

  .state-chip {
    width: fit-content;
  }

  .timeline, .facts, .financial-summary {
    grid-template-columns: 1fr;
  }
}
</style>
