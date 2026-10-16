<template>
  <section class="activation-card" :class="cardTone">
    <div class="activation-icon" aria-hidden="true">{{ icon }}</div>
    <div class="activation-content">
      <span class="eyebrow">Activation de votre espace</span>
      <h2>{{ title }}</h2>
      <p class="lead">{{ description }}</p>

      <div v-if="phase === 'ACTIVATION_PENDING'" class="activation-detail">
        <div><span>Paiement</span><strong>Confirmé</strong></div>
        <div><span>Préparation de l’espace</span><strong>{{ provisioningLabel }}</strong></div>
      </div>

      <div v-else-if="phase === 'READY'" class="activation-detail">
        <div><span>Organisation</span><strong>{{ status.tenantName || 'Votre organisation' }}</strong></div>
        <div v-if="displayHost"><span>Votre espace</span><strong>{{ displayHost }}</strong></div>
      </div>

      <div v-else-if="phase === 'RESTRICTED'" class="restriction-note">
        <strong>Aucun nouveau paiement n’est nécessaire à cette étape.</strong>
        <p>Votre situation doit être vérifiée avant l’ouverture de l’espace. Évitez de relancer un règlement pour
          contourner cette restriction.</p>
      </div>

      <div v-if="phase === 'READY' && readyUrl" class="ready-actions">
        <a class="btn btn-primary btn-large" :href="readyUrl" rel="noopener">Accéder à mon espace Toké</a>
        <p>Si vos accès utilisateur ne vous ont pas encore été communiqués, suivez les instructions transmises par Toké
          pour finaliser votre première connexion.</p>
      </div>

      <div v-else-if="phase === 'READY' && !readyUrl" class="message message--warning">
        Votre espace est prêt, mais son adresse d’accès n’est pas encore disponible. Actualisez dans quelques instants.
      </div>

      <button v-if="phase !== 'READY' || !readyUrl" class="btn btn-secondary" type="button" @click="$emit('refresh')">
        Actualiser l’état
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import type {OnboardingStatusView} from '@/service/TenantOnboardingService'

const props = defineProps<{ status: OnboardingStatusView }>()
defineEmits<{ (event: 'refresh'): void }>()

const phase = computed(() => String(props.status.phase || '').toUpperCase())
const provisioning = computed(() => String(props.status.provisioningStatus || '').toUpperCase())

const title = computed(() => {
  if (phase.value === 'ACTIVATION_PENDING') return 'Paiement confirmé, activation en cours'
  if (phase.value === 'READY') return 'Votre espace Toké est prêt'
  if (phase.value === 'RESTRICTED') return 'Votre accès nécessite une vérification'
  return 'Nous vérifions votre espace Toké'
})

const description = computed(() => {
  if (phase.value === 'ACTIVATION_PENDING') {
    if (provisioning.value === 'UNAVAILABLE') return 'Votre paiement a bien été pris en compte. Nous ne pouvons pas encore confirmer l’état de préparation de votre espace ; aucune nouvelle action de paiement n’est nécessaire.'
    return 'Votre paiement a bien été pris en compte. Notre équipe prépare maintenant votre environnement Toké.'
  }
  if (phase.value === 'READY') return 'La préparation de votre environnement est terminée. Vous pouvez ouvrir votre espace Toké.'
  if (phase.value === 'RESTRICTED') return 'Votre licence a été prise en compte, mais l’accès à votre espace ne peut pas être ouvert pour le moment.'
  return 'L’état de votre environnement est en cours de vérification.'
})

const icon = computed(() => phase.value === 'READY' ? '✓' : phase.value === 'RESTRICTED' ? '!' : '…')
const cardTone = computed(() => ({
  'activation-card--success': phase.value === 'READY',
  'activation-card--warning': phase.value === 'RESTRICTED',
  'activation-card--waiting': phase.value === 'ACTIVATION_PENDING',
}))

const provisioningLabel = computed(() => {
  if (provisioning.value === 'READY') return 'Terminée'
  if (provisioning.value === 'UNAVAILABLE') return 'Vérification en cours'
  return 'En cours'
})

const readyUrl = computed(() => buildSafeReadyUrl(props.status.subdomain))
const displayHost = computed(() => {
  if (!readyUrl.value) return null
  try {
    return new URL(readyUrl.value).hostname
  } catch {
    return null
  }
})

function buildSafeReadyUrl(value: string | null): string | null {
  if (!value) return null
  const candidate = value.trim()
  if (!candidate) return null
  try {
    const url = new URL(/^https:\/\//i.test(candidate) ? candidate : `https://${candidate}`)
    const host = url.hostname.toLowerCase()
    const trusted = host === 'toke.cm' || host.endsWith('.toke.cm')
    if (url.protocol !== 'https:' || !trusted || url.username || url.password || url.port) {
      if (import.meta.env.DEV) console.debug('[Toké onboarding] ready:unsafe-destination', {
        host,
        protocol: url.protocol
      })
      return null
    }
    return `https://${host}${url.pathname === '/' ? '' : url.pathname}${url.search}`
  } catch {
    if (import.meta.env.DEV) console.debug('[Toké onboarding] ready:invalid-subdomain', {subdomain: value})
    return null
  }
}
</script>

<style scoped>
.activation-card {
  padding: 28px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 18px;
  border: 1px solid #dfe6ee;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(27, 55, 90, .06);
}

.activation-card--waiting {
  border-color: #efd39c;
  background: #fffaf2;
}

.activation-card--success {
  border-color: #b8dfc0;
  background: #f6fcf7;
}

.activation-card--warning {
  border-color: #efc1c6;
  background: #fff7f8;
}

.activation-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #eaf3ff;
  color: #004aad;
  font-size: 21px;
  font-weight: 900;
}

.activation-card--success .activation-icon {
  background: #daf1df;
  color: #17642a;
}

.activation-card--warning .activation-icon {
  background: #f7dfe2;
  color: #a61f2d;
}

.eyebrow {
  color: #004aad;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .09em;
  text-transform: uppercase;
}

h2 {
  margin: 5px 0 8px;
  color: #17202a;
  font-size: 24px;
}

.lead {
  max-width: 720px;
  color: #5f6d7d;
  line-height: 1.65;
}

.activation-detail {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.activation-detail > div {
  padding: 15px 16px;
  border: 1px solid #dfe6ee;
  border-radius: 13px;
  background: rgba(255, 255, 255, .78);
}

.activation-detail span {
  display: block;
  color: #748194;
  font-size: 11px;
}

.activation-detail strong {
  display: block;
  margin-top: 4px;
  color: #243447;
  font-size: 14px;
}

.restriction-note {
  margin-top: 18px;
  padding: 15px 17px;
  border: 1px solid #efc1c6;
  border-radius: 13px;
  background: rgba(255, 255, 255, .72);
}

.restriction-note strong {
  color: #8f1f2b;
  font-size: 13px;
}

.restriction-note p {
  margin-top: 5px;
  color: #6f4d52;
  font-size: 12px;
  line-height: 1.55;
}

.ready-actions {
  margin-top: 22px;
}

.ready-actions p {
  margin-top: 10px;
  max-width: 680px;
  color: #667487;
  font-size: 11px;
  line-height: 1.55;
}

.btn {
  min-height: 42px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}

.btn-primary {
  background: #004aad;
  color: #fff;
}

.btn-secondary {
  margin-top: 18px;
  background: #fff;
  color: #004aad;
  border-color: #b9cbe1;
}

.btn-large {
  min-height: 50px;
  padding: 0 22px;
}

.message {
  margin-top: 18px;
  padding: 13px 15px;
  border-radius: 11px;
  font-size: 12px;
  line-height: 1.55;
}

.message--warning {
  border: 1px solid #efd39c;
  background: #fffaf0;
  color: #8a500d;
}

@media (max-width: 720px) {
  .activation-card {
    padding: 20px;
    grid-template-columns:1fr
  }

  .activation-icon {
    width: 42px;
    height: 42px
  }

  .activation-detail {
    grid-template-columns:1fr
  }

  .ready-actions .btn {
    width: 100%
  }
}
</style>
