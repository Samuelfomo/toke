<template>
  <aside v-if="!online || recovering" class="connectivity" :class="{ 'connectivity--recovering': recovering }"
         role="status" aria-live="polite">
    <div class="connectivity__inner">
      <span class="connectivity__icon">{{ online ? '↻' : '!' }}</span>
      <div>
        <strong>{{ online ? 'Reprise en cours' : 'Connexion interrompue' }}</strong>
        <p v-if="online">Nous vérifions l’état actuel de votre souscription avant de poursuivre.</p>
        <p v-else>Vos informations restent enregistrées. Aucune nouvelle souscription ni demande de paiement ne sera
          envoyée automatiquement.</p>
      </div>
      <button v-if="online && !recovering" type="button" @click="$emit('retry')">Vérifier maintenant</button>
    </div>
  </aside>
</template>

<script setup lang="ts">
defineProps<{ online: boolean; recovering: boolean }>()
defineEmits<{ (e: 'retry'): void }>()
</script>

<style scoped>
.connectivity {
  border-bottom: 1px solid #efd39c;
  background: #fff8e8;
  color: #714408;
}

.connectivity--recovering {
  border-bottom-color: #b9cbe1;
  background: #f2f7ff;
  color: #003478;
}

.connectivity__inner {
  max-width: 1200px;
  min-height: 58px;
  margin: 0 auto;
  padding: 10px 32px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.connectivity__icon {
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(0, 74, 173, .08);
  font-weight: 900;
}

.connectivity strong {
  display: block;
  font-size: 13px;
}

.connectivity p {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.45;
  opacity: .86;
}

.connectivity button {
  margin-left: auto;
  min-height: 36px;
  padding: 0 13px;
  border: 1px solid #9fb8d8;
  border-radius: 9px;
  background: #fff;
  color: #004aad;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

@media (max-width: 720px) {
  .connectivity__inner {
    padding: 11px 18px;
    align-items: flex-start;
  }

  .connectivity button {
    display: none;
  }
}
</style>
