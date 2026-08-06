<template>
  <div>
    <div
      v-if="loading"
      class="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm"
    >
      <IconLoader2 :size="26" class="mx-auto animate-spin text-blue-600" />
      <p class="mt-3 text-sm font-semibold text-slate-700">Chargement de la configuration…</p>
    </div>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-red-200 bg-red-50 p-6"
    >
      <div class="flex items-start gap-3">
        <IconAlertTriangle :size="22" class="mt-0.5 text-red-600" />
        <div>
          <h1 class="text-base font-bold text-red-900">Configuration indisponible</h1>
          <p class="mt-2 text-sm leading-6 text-red-700">{{ loadError }}</p>
          <button
            type="button"
            class="mt-4 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
            @click="goBack"
          >
            Retour aux règles
          </button>
        </div>
      </div>
    </div>

    <PlanningConfigForm
      v-else
      :config="config"
      @cancel="goBack"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconAlertTriangle, IconLoader2 } from '@tabler/icons-vue'

import PlanningSuggestionConfigService from '@/service/PlanningSuggestionConfigService'
import PlanningConfigForm from './PlanningConfigForm.vue'
import { responseData, responseError } from '../planningSuggestion.helpers'
import type { PlanningSuggestionConfig } from '../planningSuggestion.type'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const config = ref<PlanningSuggestionConfig | null>(null)

const editMode = route.name === 'planning-suggestion-configuration-edit'

async function load(): Promise<void> {
  if (!editMode) return

  loading.value = true
  loadError.value = ''

  try {
    const response = await PlanningSuggestionConfigService.active()
    config.value = responseData(response).planning_suggestion_config ?? null

    if (!config.value) {
      loadError.value = 'Aucune configuration active ne peut être modifiée.'
    }
  } catch (error: any) {
    loadError.value = responseError(error, 'Impossible de charger la configuration active.')
  } finally {
    loading.value = false
  }
}

function goBack(): void {
  void router.push({ name: 'planning-suggestion-configuration' })
}

function onSaved(): void {
  void router.push({
    name: 'planning-suggestion-configuration',
    query: { saved: '1' },
  })
}

onMounted(load)
</script>
