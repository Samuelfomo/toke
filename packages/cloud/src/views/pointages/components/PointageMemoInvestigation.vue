<template>
  <section v-if="memoGuid" class="rounded-xl border border-slate-200 bg-white p-4 space-y-3" aria-label="Justification associée">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h4 class="text-sm font-semibold text-slate-800">Justification et incidents</h4>
        <p class="text-xs text-slate-500 mt-1">{{ title || 'Mémo associé au pointage' }}</p>
      </div>
      <span v-if="memo" :class="statusClass" class="rounded-full px-2.5 py-1 text-xs font-medium shrink-0">{{ statusLabel }}</span>
    </div>
    <div v-if="loading" class="text-sm text-slate-500" role="status">Chargement du mémo…</div>
    <div v-else-if="error" class="space-y-2">
      <p class="text-sm text-slate-600">Le détail de cette justification est momentanément indisponible.</p>
      <button type="button" @click="load" class="text-sm font-semibold text-[#004AAD] hover:underline">Réessayer</button>
    </div>
    <template v-else-if="memo">
      <div v-if="issues.length" class="space-y-2">
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Situations signalées</p>
        <ul class="space-y-2">
          <li v-for="issue in issues" :key="issue.code" class="flex items-start gap-2 text-sm text-slate-700">
            <span class="text-amber-600" aria-hidden="true">•</span><span>{{ issue.label }}</span>
          </li>
        </ul>
      </div>
      <p v-else class="text-sm text-slate-600">Consultez le mémo pour retrouver les échanges et le contexte de cette situation.</p>
      <p v-if="memo.auto_generated" class="text-xs text-slate-500">Signalement créé automatiquement.</p>
      <p v-if="relatedCount > 1" class="text-xs text-slate-600">Cette justification concerne {{ relatedCount }} pointages. Vous pouvez les retrouver depuis le mémo.</p>
      <p v-if="memo.memo_status === 'pending'" class="text-xs text-amber-800">Ce mémo est en attente de traitement. Consultez les échanges avant de prendre une décision.</p>
      <button type="button" @click="openMemo" class="w-full rounded-lg bg-[#004AAD] hover:bg-blue-800 text-white px-4 py-2.5 text-sm font-semibold transition-colors">Consulter le mémo et les échanges</button>
    </template>
    <button v-else type="button" @click="openMemo" class="w-full rounded-lg border border-blue-200 text-[#004AAD] px-4 py-2 text-sm font-semibold">Consulter le mémo</button>
  </section>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import MemoService from '@/service/MemoService'

const props = defineProps<{ memoGuid: string | null; title?: string | null; entryGuid: string }>()
const router = useRouter()
type MemoDetail = { guid: string; memo_status?: string; memo_type?: string; auto_generated?: boolean; memo_content?: Array<{ message?: Array<{type?: string; content?: string}> }>; affected_entries?: string[] }
const memo = ref<MemoDetail | null>(null)
const loading = ref(false)
const error = ref(false)
let requestId = 0
const descriptions: Record<string, string> = {
  late_arrival: 'Arrivée après l’horaire prévu', early_departure: 'Départ avant l’horaire prévu',
  expired_qr_code: 'Code QR expiré', session_already_open: 'Une session précédente était encore ouverte',
  session_too_long: 'Durée de session anormalement longue', duration_abnormal: 'Durée de travail inhabituelle',
  geofence_violation: 'Pointage effectué hors de la zone autorisée', work_on_rest_day: 'Pointage effectué un jour de repos',
}
const issues = computed(() => {
  const codes = new Set<string>()
  for (const exchange of memo.value?.memo_content ?? []) for (const item of exchange.message ?? []) {
    if (item.type === 'text' && item.content && descriptions[item.content]) codes.add(item.content)
  }
  return Array.from(codes).map(code => ({ code, label: descriptions[code] }))
})
const relatedCount = computed(() => new Set((memo.value?.affected_entries ?? []).filter((item): item is string => typeof item === 'string')).size)
const statusLabel = computed(() => ({ pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté', revoked: 'Révoqué' } as Record<string, string>)[memo.value?.memo_status ?? ''] ?? 'À consulter')
const statusClass = computed(() => ({ pending: 'bg-amber-100 text-amber-800', approved: 'bg-emerald-100 text-emerald-800', rejected: 'bg-red-100 text-red-800', revoked: 'bg-slate-100 text-slate-700' } as Record<string, string>)[memo.value?.memo_status ?? ''] ?? 'bg-slate-100 text-slate-700')
async function load() {
  const id = ++requestId
  memo.value = null
  error.value = false
  if (!props.memoGuid) return
  loading.value = true
  try {
    const response: any = await MemoService.getMemoByGuid(props.memoGuid)
    if (id !== requestId) return
    const candidate = response?.data?.memo ?? response?.data?.data?.memo ?? response?.data?.data ?? response?.data ?? response
    if (!candidate || typeof candidate !== 'object' || candidate.guid !== props.memoGuid) throw new Error('Mémo indisponible')
    memo.value = candidate as MemoDetail
  } catch (cause) {
    if (id !== requestId) return
    console.warn('[Pointages] Consultation du mémo indisponible', cause)
    error.value = true
  } finally {
    if (id === requestId) loading.value = false
  }
}
watch(() => props.memoGuid, load, { immediate: true })
function openMemo() {
  if (!props.memoGuid) return
  void router.push({ name: 'memoList', query: { memoGuid: props.memoGuid, entryGuid: props.entryGuid } })
}
</script>
