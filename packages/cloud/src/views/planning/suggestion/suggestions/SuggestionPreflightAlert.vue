<template>
  <PlanningAlert tone="danger" title="Génération bloquée" :description="summary">
    <p v-if="main" class="mt-1 break-words text-xs">
      {{ [period(main), population(main)].filter(Boolean).join(' · ') }}
    </p>
    <dl v-if="main && (main.required !== undefined || main.capacity !== undefined || main.deficit !== undefined)"
        class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      <div v-if="main.required !== undefined"><dt>Affectations nécessaires</dt><dd class="font-bold">{{ main.required }}</dd></div>
      <div v-if="main.capacity !== undefined"><dt>Capacité disponible au plus</dt><dd class="font-bold">{{ main.capacity }}</dd></div>
      <div v-if="main.deficit !== undefined"><dt>Déficit</dt><dd class="font-bold">{{ main.deficit }}</dd></div>
    </dl>
    <p v-if="services.length" class="mt-2 break-words text-xs"><strong>Services concernés</strong> · {{ services.join(' · ') }}</p>
    <ul v-if="main?.actions.length" class="mt-2 list-disc space-y-1 pl-4 text-xs">
      <li v-for="action in main.actions" :key="action">{{ action }}</li>
    </ul>
    <p v-if="main?.actions.length" class="mt-1 text-xs">Après correction, relancez le calcul pour vérifier les réglages.</p>
    <nav aria-label="Corriger la configuration" class="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">
      <RouterLink class="underline" target="_blank" rel="noopener" :to="needsLink(main)">Vérifier les besoins</RouterLink>
      <RouterLink class="underline" target="_blank" rel="noopener" :to="{ name: 'planning-suggestion-profiles' }">Vérifier les profils</RouterLink>
      <RouterLink class="underline" target="_blank" rel="noopener" :to="rulesLink">Vérifier les règles</RouterLink>
    </nav>
    <details v-if="diagnostic.issues.length" class="mt-3 border-t border-red-200 pt-2 text-xs">
      <summary class="cursor-pointer font-semibold">Détails des blocages ({{ diagnostic.issues.length }})</summary>
      <ul class="mt-2 space-y-3">
        <li v-for="(entry, index) in diagnostic.issues" :key="index">
          <p class="font-semibold">{{ period(entry) || 'Période vérifiée' }} <span v-if="entry.code">· {{ entry.code }}</span></p>
          <p>{{ entry.message }}</p>
          <p v-if="entry.dates.length">{{ entry.dates.map(formatDate).join(' · ') }}</p>
          <ul v-if="entry.days.length" class="mt-1 space-y-1">
            <li v-for="(day, dayIndex) in entry.days" :key="dayIndex">
              {{ day.date && formatDate(day.date) }} · Capacité ordinaire {{ day.ordinary ?? '—' }},
              service plafonné {{ day.quota ?? '—' }}, alternatives {{ day.alternatives ?? '—' }}
              <span v-for="requirement in day.requirements" :key="requirement.guid" class="block break-words">
                <RouterLink class="underline" target="_blank" rel="noopener" :to="needsLink(entry, requirement.guid)">
                  {{ requirementNames.get(requirement.guid) ?? requirement.guid }}
                </RouterLink>
                · {{ requirement.maximum === undefined ? 'Sans plafond indiqué' : `Maximum ${requirement.maximum}` }}
              </span>
            </li>
          </ul>
          <ul v-if="entry !== main && entry.actions.length" class="list-disc pl-4">
            <li v-for="action in entry.actions" :key="action">{{ action }}</li>
          </ul>
        </li>
      </ul>
    </details>
    <details v-if="diagnostic.warnings.length" class="mt-2 text-xs text-amber-900">
      <summary class="cursor-pointer font-semibold">Avertissements non bloquants ({{ diagnostic.warnings.length }})</summary>
      <ul class="mt-1 list-disc space-y-1 pl-4">
        <li v-for="(warning, index) in diagnostic.warnings" :key="index">{{ warning.message }}</li>
      </ul>
    </details>
  </PlanningAlert>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PlanningAlert from '@/views/planning/components/ui/PlanningAlert.vue'
import PlanningSuggestionRequirementService from '@/service/PlanningSuggestionRequirementService'
import { formatDate } from '../planningSuggestion.helpers'
import type { PlanningRequirement } from '../planningSuggestion.type'
import type { PreflightDiagnostic, PreflightIssue } from './preflightDiagnostics'

const props = defineProps<{ diagnostic: PreflightDiagnostic; configGuid?: string; requirements?: PlanningRequirement[] }>()
const main = computed(() => props.diagnostic.issues.find(issue => issue.deficit !== undefined) ?? props.diagnostic.issues[0])
const configGuid = computed(() => main.value?.configGuid ?? props.configGuid)
const loadedRequirements = ref<PlanningRequirement[]>([])
const providedRequirements = computed(() => configGuid.value === props.configGuid ? props.requirements : undefined)
const requirementNames = computed(() => new Map((providedRequirements.value ?? loadedRequirements.value).flatMap(requirement =>
  requirement.session_template?.name ? [[requirement.guid, requirement.session_template.name]] : [],
)))
const services = computed(() => [...new Set((main.value?.requirements ?? []).flatMap(guid => requirementNames.value.get(guid) ?? []))])
const summary = computed(() => {
  if (main.value?.deficit !== undefined) return 'Les services concernés ne peuvent pas accueillir toutes les affectations obligatoires.'
  if (main.value?.code?.includes('LEAVE') || main.value?.code?.includes('REST')) return 'Les règles de repos et les capacités disponibles sont incompatibles.'
  if (main.value?.code?.includes('CAPACITY')) return 'Les effectifs disponibles ne permettent pas de couvrir les besoins configurés.'
  return 'La configuration empêche de générer un planning compatible.'
})
const rulesLink = computed(() => configGuid.value
  ? { name: 'planning-suggestion-configuration-edit', query: { config: configGuid.value } }
  : { name: 'planning-suggestion-configuration' })

watch([configGuid, providedRequirements], async ([guid, available], _previous, onCleanup) => {
  loadedRequirements.value = []
  if (!guid || available !== undefined) return
  let active = true
  onCleanup(() => { active = false })
  const response = await PlanningSuggestionRequirementService.listByConfig(guid)
  const items = response?.success ? response.data?.planning_suggestion_requirements?.items : undefined
  if (active && Array.isArray(items)) loadedRequirements.value = items
}, { immediate: true })

function needsLink(issue?: PreflightIssue, guid = issue?.requirements[0]) {
  return { name: 'planning-suggestion-requirements', query: { config: issue?.configGuid ?? configGuid.value, requirement: guid } }
}

function period(issue: PreflightIssue) {
  if (!issue.from) return ''
  return issue.to && issue.from !== issue.to ? `Du ${formatDate(issue.from)} au ${formatDate(issue.to)}` : formatDate(issue.from)
}

function population(issue: PreflightIssue) {
  if (issue.employees === undefined) return ''
  const group = issue.pool === 'NON_MEMBER' ? 'hors équipe de garde' : issue.pool === 'MEMBER' ? 'dans l’équipe de garde' : ''
  return [`${issue.employees} collaborateur(s)`, issue.model === 'ROTATING' ? 'en rotation' : '', group].filter(Boolean).join(' ')
}
</script>
