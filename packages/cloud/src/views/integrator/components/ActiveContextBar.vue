<template>
  <div v-if="visible"
       class="fixed bottom-5 right-5 z-[9999] flex max-w-[calc(100vw-40px)] items-center gap-3 rounded-2xl border border-[#38577b] bg-[#12243d] px-4 py-3 text-white shadow-2xl shadow-slate-950/30">
    <div class="hidden text-left sm:block"><p class="text-xs font-semibold">Accès intégrateur actif</p>
      <p class="max-w-[200px] truncate text-[11px] text-slate-300">{{ tenantName }}</p></div>
    <button @click="returnToConsole" :disabled="busy"
            class="rounded-lg bg-[#2d6ac9] px-3 py-2 text-xs font-bold text-white hover:bg-[#3d7ee0] disabled:opacity-50">
      {{ busy ? 'Retour…' : 'Retour à la console' }}
    </button>
  </div>
</template>
<script setup lang="ts">import {computed, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {useIntegratorStore} from '@/stores/integratorStore';
import {useUserStore} from '@/stores/userStore';
import {integratorStorage, integratorError} from '@/service/IntegratorService';

const router = useRouter(), route = useRoute(), store = useIntegratorStore(), userStore = useUserStore(),
    busy = ref(false);
const visible = computed(() => !route.path.startsWith('/integrateur') && Boolean(store.activeContext || integratorStorage.context()));
const tenantName = computed(() => userStore.tenant?.name || 'Espace de travail');

async function returnToConsole() {
  busy.value = true;
  try {
    await store.releaseContext();
    await router.replace('/integrateur/tenants')
  } catch (e) {
    alert(integratorError(e))
  } finally {
    busy.value = false
  }
}</script>
