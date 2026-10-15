<template>
  <main class="onboarding-page">
    <header class="public-header">
      <div class="header-inner">
        <a class="brand" href="/" aria-label="Toké">
          <span class="brand-mark">T</span>
          <span class="brand-copy">
            <strong>Toké</strong>
            <small>Gestion intelligente du temps de travail</small>
          </span>
        </a>
        <div class="secure-pill" title="Ce parcours utilise le lien sécurisé reçu par email">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 10V7a5 5 0 0 1 10 0v3M6 10h12v10H6z"/>
          </svg>
          Parcours sécurisé
        </div>
      </div>
    </header>

    <section v-if="initialLoading" class="state-page" aria-live="polite">
      <div class="spinner" aria-hidden="true"></div>
      <h1>Vérification de votre invitation</h1>
      <p>Toké vérifie le lien et récupère l’état de votre organisation.</p>
    </section>

    <section v-else-if="showResend" class="state-page state-page--card">
      <div class="state-icon state-icon--warning">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 9v4m0 4h.01M10.3 4.5 3.5 17a2 2 0 0 0 1.8 3h13.4a2 2 0 0 0 1.8-3L13.7 4.5a2 2 0 0 0-3.4 0Z"/>
        </svg>
      </div>
      <span class="eyebrow">Lien indisponible</span>
      <h1>Recevoir un nouveau lien d’activation</h1>
      <p>Utilisez l’adresse email communiquée lors de la création de votre organisation.</p>

      <form class="resend-form" @submit.prevent="submitResend">
        <label for="resend-email">Adresse email</label>
        <input id="resend-email" v-model.trim="resendEmail" type="email" autocomplete="email" required
               placeholder="vous@entreprise.com"/>
        <button class="btn btn-primary" type="submit" :disabled="store.resending || !resendEmail">
          {{ store.resending ? 'Envoi en cours…' : 'Recevoir un nouveau lien' }}
        </button>
      </form>

      <p v-if="store.resendSuccess" class="message message--success" role="status">La demande a été envoyée. Consultez
        votre boîte mail.</p>
      <p v-if="store.error" class="message message--error" role="alert">{{ customerErrorMessage }}</p>
    </section>

    <template v-else>
      <section class="hero-band">
        <div class="hero-inner">
          <div>
            <span class="eyebrow eyebrow--light">Première licence Toké</span>
            <h1>Activez {{ tenantTitle }}</h1>
            <p>
              Votre première souscription crée la licence globale de l’organisation. Elle détermine la capacité initiale
              de licences employés avant l’activation de votre espace Toké.
            </p>
          </div>
          <div class="organization-card">
            <span>Organisation</span>
            <strong>{{ tenantTitle }}</strong>
          </div>
        </div>
      </section>

      <nav class="steps" aria-label="Progression de l’activation">
        <div class="steps-inner">
          <div class="step" :class="{ 'step--active': currentStep === 1, 'step--done': currentStep > 1 }">
            <span>1</span>
            <div><strong>Licence</strong><small>Définir votre capacité</small></div>
          </div>
          <div class="step-line"></div>
          <div class="step" :class="{ 'step--active': currentStep === 2, 'step--done': currentStep > 2 }">
            <span>2</span>
            <div><strong>Paiement</strong><small>Régler la première période</small></div>
          </div>
          <div class="step-line"></div>
          <div class="step" :class="{ 'step--active': currentStep === 3 }">
            <span>3</span>
            <div><strong>Activation</strong><small>Préparation de votre espace</small></div>
          </div>
        </div>
      </nav>

      <section class="content-shell">
        <div class="main-column">
          <section class="status-banner" :class="statusBannerClass" aria-live="polite">
            <div class="status-dot"></div>
            <div>
              <span>État actuel</span>
              <strong>{{ displayState }}</strong>
              <small>{{ statusExplanation }}</small>
            </div>
            <button class="btn btn-ghost" type="button" :disabled="store.loadingStatus" @click="refreshStatus">
              {{ store.loadingStatus ? 'Actualisation…' : 'Actualiser' }}
            </button>
          </section>

          <section class="section-card explainer-card">
            <div class="section-heading">
              <div>
                <span class="eyebrow">Comprendre votre souscription</span>
                <h2>Ce que vous achetez avec Toké</h2>
              </div>
            </div>

            <div class="explain-grid">
              <article>
                <div class="explain-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h2m2 0h2M9 14h2m2 0h2M9 18h2m2 0h2"/>
                  </svg>
                </div>
                <h3>1 licence globale</h3>
                <p>Elle porte le contrat de votre organisation et centralise la facturation Toké.</p>
              </article>
              <article>
                <div class="explain-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <h3>Des licences employés</h3>
                <p>La capacité achetée correspond au nombre de collaborateurs que votre organisation pourra couvrir
                  selon son mode de facturation.</p>
              </article>
              <article>
                <div class="explain-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M12 7v5l3 2"/>
                  </svg>
                </div>
                <h3>Une période clairement définie</h3>
                <p>La règle de démarrage de votre période est présentée avant validation. Les dates exactes sont fixées
                  lors de la souscription.</p>
              </article>
            </div>
          </section>

          <TenantActivationProgress
              v-if="store.status && (subscriptionAlreadyCreated || store.status.isReady)"
              :status="store.status"
          />

          <section v-else class="section-card subscription-card">
            <div class="section-heading section-heading--split">
              <div>
                <span class="eyebrow">Configuration</span>
                <h2>Votre première licence globale</h2>
                <p>Vérifiez les conditions de votre première licence, puis choisissez le nombre de collaborateurs et
                  votre moyen de paiement.</p>
              </div>
              <span class="offer-badge">{{ licenseDisplayName }}</span>
            </div>

            <div class="facts-grid">
              <div class="fact" :class="{ 'fact--missing': !store.status?.licenseType }">
                <span>Offre</span>
                <strong>{{ licenseDisplayName }}</strong>
                <small>Licence globale prévue pour votre organisation.</small>
              </div>
              <div class="fact" :class="{ 'fact--missing': !store.status?.billingMode }">
                <span>Mode de facturation</span>
                <strong>{{ billingModeLabel }}</strong>
                <small>{{ billingModeDetail }}</small>
              </div>
              <div class="fact" :class="{ 'fact--missing': !store.status?.billingCycleMonths }">
                <span>Cycle</span>
                <strong>{{ billingLabel }}</strong>
                <small>{{ billingCycleDetail }}</small>
              </div>
              <div class="fact" :class="{ 'fact--missing': minimumSeats == null }">
                <span>Capacité minimale</span>
                <strong>{{
                    minimumSeats == null ? 'Information momentanément indisponible' : `${minimumSeats} collaborateurs`
                  }}</strong>
                <small>Votre première licence doit couvrir au moins ce nombre de collaborateurs.</small>
              </div>
              <div class="fact fact--highlight" :class="{ 'fact--missing': !hasUnitPrice }">
                <span>Tarif de référence</span>
                <strong>{{
                    hasUnitPrice ? `${formatMoney(store.status?.unitPrice, store.status?.unitPriceCurrency)} / collaborateur${pricingPeriodSuffix}` : 'Information momentanément indisponible'
                  }}</strong>
                <small>Tarif de référence appliqué à chaque licence employé.</small>
              </div>
              <div class="fact" :class="{ 'fact--missing': !store.status?.billingCurrencyCode }">
                <span>Devise de facturation</span>
                <strong>{{ store.status?.billingCurrencyCode || 'Information momentanément indisponible' }}</strong>
                <small>Le montant final de votre facture sera communiqué dans cette devise.</small>
              </div>
            </div>

            <div v-if="hasPeriod" class="period-panel">
              <div>
                <span>Début de période</span>
                <strong>{{ formatDate(store.status?.periodStart) }}</strong>
              </div>
              <div class="period-arrow" aria-hidden="true">→</div>
              <div>
                <span>Fin de période</span>
                <strong>{{ formatDate(store.status?.periodEnd) }}</strong>
              </div>
            </div>

            <div v-if="store.status?.periodNotice" class="period-notice">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 8v4m0 4h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"/>
              </svg>
              <div>
                <strong>À savoir sur votre période</strong>
                <p>{{ store.status.periodNotice }}</p>
              </div>
            </div>

            <div v-if="!commercialTermsComplete" class="contract-warning" role="alert">
              <strong>Souscription temporairement indisponible.</strong>
              <p>Certaines informations nécessaires à votre souscription ne sont pas disponibles pour le moment.
                Veuillez réessayer dans quelques instants.</p>
            </div>

            <form class="subscription-form" @submit.prevent="submitSubscription">
              <fieldset>
                <legend>Combien de collaborateurs souhaitez-vous couvrir au démarrage ?</legend>
                <p class="field-help">Chaque place correspond à une licence employé rattachée à la licence globale de
                  {{ tenantTitle }}.</p>

                <div class="seat-control">
                  <button type="button"
                          :disabled="minimumSeats == null || requestedSeats == null || requestedSeats <= minimumSeats"
                          aria-label="Retirer une place" @click="decreaseSeats">−
                  </button>
                  <div>
                    <input
                        v-model.number="requestedSeats"
                        type="number"
                        :min="minimumSeats ?? undefined"
                        :max="maximumSeats ?? undefined"
                        step="1"
                        inputmode="numeric"
                        :disabled="minimumSeats == null"
                        required
                        aria-label="Nombre de collaborateurs"
                        @blur="enforceMinimumSeats"
                    />
                    <span>collaborateurs</span>
                  </div>
                  <button type="button"
                          :disabled="maximumSeats != null && requestedSeats != null && requestedSeats >= maximumSeats"
                          aria-label="Ajouter une place" @click="increaseSeats">+
                  </button>
                </div>
                <div class="minimum-rule">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 8v4m0 4h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"/>
                  </svg>
                  <span v-if="minimumSeats != null">Minimum requis : <strong>{{ minimumSeats }}</strong> collaborateurs.</span>
                  <span v-else>Capacité momentanément indisponible.</span>
                </div>
              </fieldset>

              <fieldset>
                <legend>Comment souhaitez-vous régler cette première licence ?</legend>
                <p class="field-help">Choisissez le moyen de paiement que vous souhaitez utiliser pour cette
                  souscription.</p>

                <div v-if="store.loadingPaymentMethods" class="payment-loading">Chargement des moyens de paiement…</div>
                <div v-else-if="store.paymentMethods.length" class="payment-grid">
                  <label
                      v-for="method in store.paymentMethods"
                      :key="String(method.guid)"
                      class="payment-option"
                      :class="{ 'payment-option--selected': selectedPaymentMethod === String(method.guid) }"
                  >
                    <input v-model="selectedPaymentMethod" type="radio" name="payment-method"
                           :value="String(method.guid)"/>
                    <span class="payment-radio"></span>
                    <span class="payment-copy">
                      <strong>{{ method.name }}</strong>
                      <small v-if="method.currency || method.supportedCurrencies.length">
                        {{ paymentCurrencyLabel(method) }}
                      </small>
                    </span>
                  </label>
                </div>
                <p v-else class="message message--warning">Aucun moyen de paiement n’est disponible pour cette
                  souscription pour le moment.</p>
              </fieldset>

              <div class="form-actions-mobile">
                <button class="btn btn-primary btn-large" type="submit"
                        :disabled="!canSubmitSubscription || store.subscribing">
                  {{ store.subscribing ? 'Enregistrement de la souscription…' : 'Valider ma première licence' }}
                </button>
              </div>
            </form>
          </section>

          <p v-if="store.error" class="message message--error" role="alert">{{ customerErrorMessage }}</p>
        </div>

        <aside class="summary-column">
          <div class="summary-card">
            <div class="summary-header">
              <span class="eyebrow">Résumé</span>
              <h2>Votre souscription</h2>
            </div>

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
                <dt>Mode</dt>
                <dd>{{ billingModeLabel }}</dd>
              </div>
              <div>
                <dt>Cycle</dt>
                <dd>{{ billingLabel }}</dd>
              </div>
              <div>
                <dt>Capacité choisie</dt>
                <dd>{{ requestedSeats == null ? 'À définir' : `${requestedSeats} collaborateurs` }}</dd>
              </div>
              <div>
                <dt>Tarif de référence</dt>
                <dd>{{
                    hasUnitPrice ? `${formatMoney(store.status?.unitPrice, store.status?.unitPriceCurrency)} / collaborateur${pricingPeriodSuffix}` : 'À confirmer'
                  }}
                </dd>
              </div>
              <div v-if="store.status?.billingCurrencyCode">
                <dt>Devise de facturation</dt>
                <dd>{{ store.status.billingCurrencyCode }}</dd>
              </div>
              <div v-if="store.status?.taxesAmount != null">
                <dt>Taxes</dt>
                <dd>{{ formatMoney(store.status?.taxesAmount, store.status?.currencyCode) }}</dd>
              </div>
              <div v-if="store.status?.invoiceAmount != null">
                <dt>Montant facturé</dt>
                <dd>{{ formatMoney(store.status?.invoiceAmount, store.status?.currencyCode) }}</dd>
              </div>
              <div v-if="store.status?.amountReceived != null">
                <dt>Déjà reçu</dt>
                <dd>{{ formatMoney(store.status?.amountReceived, store.status?.currencyCode) }}</dd>
              </div>
            </dl>

            <div v-if="store.status?.amountDue != null" class="total-box">
              <span>Reste à payer</span>
              <strong>{{ formatMoney(store.status?.amountDue, store.status?.currencyCode) }}</strong>
              <small>Montant restant pour cette souscription</small>
            </div>
            <div v-else class="total-box total-box--pending">
              <span>Montant final</span>
              <strong>À confirmer</strong>
              <small>Le montant final apparaîtra avant toute étape de paiement.</small>
            </div>

            <button
                v-if="!subscriptionAlreadyCreated && !store.status?.isReady"
                class="btn btn-primary btn-large summary-submit"
                type="button"
                :disabled="!canSubmitSubscription || store.subscribing"
                @click="submitSubscription"
            >
              {{ store.subscribing ? 'Enregistrement…' : 'Valider ma première licence' }}
            </button>

            <div class="summary-assurance">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3 5 6v5c0 4.6 2.9 8 7 10 4.1-2 7-5.4 7-10V6l-7-3Z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
              <p><strong>Des conditions claires avant paiement.</strong><br/>Vous pouvez vérifier l’offre, le tarif de
                référence, la capacité et les règles de période avant de poursuivre.</p>
            </div>
          </div>

          <a class="learn-more" href="#" aria-disabled="true" @click.prevent>
            <span>
              <strong>Comprendre les licences Toké</strong>
              <small>Retrouvez prochainement le guide complet sur le fonctionnement des licences.</small>
            </span>
            <span aria-hidden="true">→</span>
          </a>
        </aside>
      </section>

      <footer class="public-footer">
        <p>Ce portail vous permet de finaliser la première souscription et de suivre l’activation de votre espace
          Toké.</p>
        <span>Toké · Imediatis</span>
      </footer>
    </template>
  </main>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'
import {useTenantOnboardingStore} from '@/stores/tenantOnboardingStore'
import type {OnboardingPaymentMethod} from '@/service/TenantOnboardingService'
import TenantActivationProgress from '@/views/onboarding/components/TenantActivationProgress.vue'

const store = useTenantOnboardingStore()
const requestedSeats = ref<number | null>(null)
const selectedPaymentMethod = ref('')
const resendEmail = ref('')
let pollTimer: number | null = null

const customerErrorMessage = computed(() =>
    showResend.value
        ? 'Nous ne pouvons pas utiliser ce lien pour le moment. Vous pouvez demander un nouveau lien ci-dessous.'
        : 'Une erreur est survenue. Veuillez réessayer dans quelques instants.',
)

function audit(event: string, details: Record<string, unknown> = {}) {
  if (!import.meta.env.DEV) return
  console.debug(`[Toké onboarding] ${event}`, details)
}

function auditStatus(context: string) {
  if (!store.status) return
  audit(context, {
    tenantGuid: store.status.tenantGuid,
    phase: store.status.phase,
    state: store.status.state,
    provisioningStatus: store.status.provisioningStatus,
    tenantStatus: store.status.tenantStatus,
    licenseGuid: store.status.licenseGuid,
    licenseType: store.status.licenseType,
    billingMode: store.status.billingMode,
    billingCycleMonths: store.status.billingCycleMonths,
    minimumSeats: store.status.minimumSeats,
    maximumSeats: store.status.maximumSeats,
    requestedSeats: store.status.requestedSeats,
    unitPrice: store.status.unitPrice,
    pricingCurrencyCode: store.status.unitPriceCurrency,
    billingCurrencyCode: store.status.billingCurrencyCode,
    periodPolicy: store.status.periodPolicy,
    periodNotice: store.status.periodNotice,
    paymentStatus: store.status.paymentStatus,
    invoiceAmount: store.status.invoiceAmount,
    amountReceived: store.status.amountReceived,
    amountDue: store.status.amountDue,
    isReady: store.status.isReady,
  })
}

const initialLoading = computed(() => store.loadingStatus && !store.status && !store.tokenInvalidOrExpired)
const showResend = computed(() => store.tokenInvalidOrExpired || (!store.hasToken && !store.loadingStatus))
const tenantTitle = computed(() => store.status?.tenantName || 'Votre organisation')
const minimumSeats = computed(() => {
  const value = store.status?.minimumSeats
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : null
})

const maximumSeats = computed(() => {
  const value = store.status?.maximumSeats
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : null
})

const displayState = computed(() => {
  const phase = String(store.status?.phase || store.status?.state || '').toUpperCase()
  if (store.status?.isReady || phase === 'READY') return 'Espace prêt'
  if (['PROVISIONING', 'ACTIVATION_PENDING', 'ACTIVATING'].includes(phase)) return 'Activation en cours'
  if (['PAYMENT_CONFIRMED', 'PAID'].includes(phase) || paymentConfirmed.value) return 'Paiement confirmé'
  if (['PAYMENT_REQUIRED', 'PAYMENT_PENDING', 'PENDING_PAYMENT'].includes(phase)) return 'Paiement en attente'
  if (phase === 'SUBSCRIPTION_REQUIRED') return 'Première licence à souscrire'
  return 'Souscription en cours'
})

const licenseDisplayName = computed(() => store.status?.licenseLabel || store.status?.licenseType || 'Information momentanément indisponible')

const billingModeLabel = computed(() => {
  const mode = String(store.status?.billingMode || '').toUpperCase()
  if (mode === 'PREPAID') return 'Prépayée'
  if (mode === 'POSTPAID') return 'Postpayée'
  return 'Information momentanément indisponible'
})

const billingModeDetail = computed(() => {
  const mode = String(store.status?.billingMode || '').toUpperCase()
  if (mode === 'PREPAID') return 'La capacité est souscrite avant son utilisation.'
  if (mode === 'POSTPAID') return 'La facturation intervient après la période consommée.'
  return 'Information momentanément indisponible.'
})


const billingLabel = computed(() => {
  const months = store.status?.billingCycleMonths
  if (!months) return 'Information momentanément indisponible'
  return months === 1 ? 'Mensuelle' : `${months} mois`
})

const pricingPeriodSuffix = computed(() => {
  const months = store.status?.billingCycleMonths
  if (!months) return ''
  return months === 1 ? ' / mois' : ` / ${months} mois`
})

const billingCycleDetail = computed(() => {
  const months = store.status?.billingCycleMonths
  if (!months) return 'Information momentanément indisponible.'
  return months === 1 ? 'Renouvellement par cycle d’un mois' : `Cycle de ${months} mois`
})

const normalizedSignals = computed(() => [
  store.status?.phase,
  store.status?.state,
  store.status?.paymentStatus,
  store.status?.provisioningStatus,
].filter(Boolean).join(' ').toUpperCase())

const subscriptionAlreadyCreated = computed(() => {
  if (!store.status) return false
  if (store.status.isReady) return true
  if (store.status.licenseGuid) return true
  return /PENDING_PAYMENT|PAYMENT_REQUIRED|PAYMENT_PENDING|PAID|PAYMENT_CONFIRMED|ACTIVATION|PROVISION|READY/.test(normalizedSignals.value)
})

const paymentConfirmed = computed(() => {
  const payment = String(store.status?.paymentStatus || '').toUpperCase()
  const phase = String(store.status?.phase || store.status?.state || '').toUpperCase()
  const provisioning = String(store.status?.provisioningStatus || '').toUpperCase()
  return ['PAID', 'COMPLETED', 'CONFIRMED', 'PAYMENT_CONFIRMED', 'PAYMENT_COMPLETED'].includes(payment)
      || ['ACTIVATION_PENDING', 'ACTIVATING', 'PROVISIONING', 'READY'].includes(phase)
      || ['IN_PROGRESS', 'PROVISIONING', 'READY'].includes(provisioning)
})

const currentStep = computed(() => {
  if (store.status?.isReady || /ACTIVATION|PROVISION|READY/.test(normalizedSignals.value)) return 3
  if (subscriptionAlreadyCreated.value) return 2
  return 1
})

const statusExplanation = computed(() => {
  const phase = String(store.status?.phase || '').toUpperCase()
  if (phase === 'SUBSCRIPTION_REQUIRED') return 'Votre organisation existe. La première licence doit encore être souscrite.'
  if (store.status?.isReady) return 'Votre espace Toké est prêt. Nous finalisons les dernières étapes avant votre première connexion.'
  if (paymentConfirmed.value) return 'Votre paiement a été confirmé. Votre espace Toké est maintenant en cours de préparation.'
  if (subscriptionAlreadyCreated.value) return 'Votre souscription a bien été enregistrée. Vous pouvez suivre son avancement ici.'
  return 'Suivez ici l’avancement de votre première souscription.'
})

const statusBannerClass = computed(() => ({
  'status-banner--success': store.status?.isReady,
  'status-banner--waiting': subscriptionAlreadyCreated.value && !store.status?.isReady,
}))

const hasUnitPrice = computed(() => store.status?.unitPrice !== null && store.status?.unitPrice !== undefined)

const missingCommercialTerms = computed(() => {
  const missing: string[] = []
  if (!store.status?.licenseType) missing.push('Type de licence')
  if (!store.status?.billingMode) missing.push('Mode de facturation')
  if (!store.status?.billingCycleMonths) missing.push('Cycle de facturation')
  if (minimumSeats.value == null) missing.push('Minimum de licences employés')
  if (maximumSeats.value == null) missing.push('Maximum de licences employés')
  if (!hasUnitPrice.value) missing.push('Tarif unitaire par licence employé')
  if (!store.status?.unitPriceCurrency) missing.push('Devise du tarif')
  if (!store.status?.billingCurrencyCode) missing.push('Devise de facturation')
  if (!store.status?.periodNotice) missing.push('Règle de début de période')
  if (store.status?.canSubscribe !== true) missing.push('Autorisation de souscription')
  return missing
})

const commercialTermsComplete = computed(() => missingCommercialTerms.value.length === 0)

const canSubmitSubscription = computed(() => {
  if (subscriptionAlreadyCreated.value || !commercialTermsComplete.value) return false
  if (requestedSeats.value == null || minimumSeats.value == null) return false
  if (!Number.isInteger(requestedSeats.value) || requestedSeats.value < minimumSeats.value) return false
  if (maximumSeats.value != null && requestedSeats.value > maximumSeats.value) return false
  if (!selectedPaymentMethod.value) return false
  return store.paymentMethods.length > 0
})
const hasPeriod = computed(() => Boolean(store.status?.periodStart || store.status?.periodEnd))

function paymentMethodGuid() {
  const selected = store.paymentMethods.find((method) => String(method.guid) === selectedPaymentMethod.value)
  return selected?.guid ?? selectedPaymentMethod.value
}

function increaseSeats() {
  if (minimumSeats.value == null) return
  const current = requestedSeats.value ?? minimumSeats.value
  const next = Math.max(minimumSeats.value, current) + 1
  requestedSeats.value = maximumSeats.value == null ? next : Math.min(maximumSeats.value, next)
}

function decreaseSeats() {
  if (minimumSeats.value == null) return
  const current = requestedSeats.value ?? minimumSeats.value
  requestedSeats.value = Math.max(minimumSeats.value, current - 1)
}

function enforceMinimumSeats() {
  if (minimumSeats.value == null) {
    requestedSeats.value = null
    return
  }
  const parsed = Math.floor(Number(requestedSeats.value))
  if (!Number.isFinite(parsed)) {
    requestedSeats.value = minimumSeats.value
    return
  }
  const bounded = Math.max(minimumSeats.value, parsed)
  requestedSeats.value = maximumSeats.value == null ? bounded : Math.min(maximumSeats.value, bounded)
}

function formatMoney(value: string | number | null | undefined, currency?: string | null) {
  if (value === null || value === undefined || value === '') return '—'
  const number = Number(value)
  if (!Number.isFinite(number)) return `${value}${currency ? ` ${currency}` : ''}`

  if (currency && /^[A-Z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat('fr-FR', {style: 'currency', currency, maximumFractionDigits: 2}).format(number)
    } catch {
      // Fallback ci-dessous.
    }
  }

  return `${new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 2}).format(number)}${currency ? ` ${currency}` : ''}`
}

function formatDate(value?: string | null) {
  if (!value) return 'À confirmer'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', {dateStyle: 'long', timeZone: 'Africa/Douala'}).format(date)
}

function paymentCurrencyLabel(method: OnboardingPaymentMethod) {
  if (method.supportedCurrencies.length) return `Devises : ${method.supportedCurrencies.join(', ')}`
  if (method.currency) return `Devise : ${method.currency}`
  return ''
}

async function submitSubscription() {
  enforceMinimumSeats()
  if (!canSubmitSubscription.value) return
  if (requestedSeats.value == null) return
  audit('subscription:submit', {
    requestedSeats: requestedSeats.value,
    paymentMethodGuid: paymentMethodGuid(),
    missingCommercialTerms: missingCommercialTerms.value,
  })
  const ok = await store.subscribe(requestedSeats.value, paymentMethodGuid())
  audit('subscription:result', {ok, error: store.error || null})
  if (ok) {
    auditStatus('subscription:status-after-submit')
    startPolling()
  }
}

async function submitResend() {
  if (!resendEmail.value) return
  await store.resend(resendEmail.value)
  audit('invitation:resend', {success: store.resendSuccess, error: store.error || null})
}

async function refreshStatus() {
  await store.loadStatus()
  auditStatus('status:manual-refresh')
  syncFormFromStatus()
  syncPolling()
}

function syncFormFromStatus() {
  if (minimumSeats.value == null) {
    requestedSeats.value = null
    return
  }
  const serverRequested = store.status?.requestedSeats
  const initial = serverRequested == null ? minimumSeats.value : Math.max(minimumSeats.value, serverRequested)
  requestedSeats.value = maximumSeats.value == null ? initial : Math.min(maximumSeats.value, initial)
}

function startPolling() {
  stopPolling()
  if (!store.hasToken || store.status?.isReady) return

  pollTimer = window.setInterval(async () => {
    await store.loadStatus()
    auditStatus('status:poll')
    if (store.status?.isReady || store.tokenInvalidOrExpired) stopPolling()
  }, 15000)
}

function stopPolling() {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }
}

function syncPolling() {
  if (subscriptionAlreadyCreated.value && !store.status?.isReady) startPolling()
  else stopPolling()
}

onMounted(async () => {
  store.bootstrapTokenFromFragment()
  if (!store.hasToken) return

  await store.loadStatus()
  auditStatus('status:initial')
  syncFormFromStatus()

  if (!store.tokenInvalidOrExpired && !subscriptionAlreadyCreated.value) {
    await store.loadPaymentMethods()
    audit('payment-methods:loaded', {
      count: store.paymentMethods.length,
      methods: store.paymentMethods.map((method) => ({
        guid: method.guid,
        code: method.code,
        name: method.name,
        currency: method.currency,
        supportedCurrencies: method.supportedCurrencies,
      })),
      error: store.error || null,
    })
  }

  if (missingCommercialTerms.value.length) {
    audit('commercial-terms:missing', {missing: missingCommercialTerms.value})
  }

  syncPolling()
})

onBeforeUnmount(stopPolling)
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
