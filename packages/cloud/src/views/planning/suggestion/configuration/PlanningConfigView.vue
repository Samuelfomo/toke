<template>
    <div class="space-y-6">
        <PlanningPageHeader
            eyebrow="Étape 3"
            title="Règles du moteur de planification"
            description="Ces paramètres définissent les contraintes obligatoires et les préférences utilisées pour produire un planning acceptable."
        >
            <template #actions>
                <button
                    type="button"
                    class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    :disabled="loading"
                    @click="load"
                >
                    <IconRefresh :size="16" :class="{ 'animate-spin': loading }" />
                    Actualiser
                </button>
                <button
                    v-if="config"
                    type="button"
                    class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                    @click="showForm = true"
                >
                    <IconPencil :size="16" />
                    Modifier les règles
                </button>
            </template>
        </PlanningPageHeader>

        <PlanningInfoPanel
            title="Impact des modifications"
            description="Toute nouvelle suggestion utilise la configuration active au moment de sa génération."
            important="Les suggestions déjà générées et les plannings publiés ne sont jamais modifiés rétroactivement."
        />

        <PlanningInfoPanel
            v-if="errorMessage"
            tone="warning"
            title="Chargement impossible"
            :description="errorMessage"
        />

        <div v-if="loading" class="grid gap-4 lg:grid-cols-2">
            <div
                v-for="index in 6"
                :key="index"
                class="h-40 animate-pulse rounded-2xl bg-slate-100"
            />
        </div>

        <div
            v-else-if="!config"
            class="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 px-6 py-14 text-center"
        >
            <IconSettingsOff :size="26" class="mx-auto text-amber-600" />
            <h2 class="mt-4 text-base font-bold text-slate-900">
                Aucune configuration active
            </h2>
            <p class="mx-auto mt-2 max-w-xl text-xs leading-5 text-slate-600">
                La génération reste bloquée tant que les règles de repos, de garde,
                de charge et de résolution ne sont pas définies.
            </p>
            <button
                type="button"
                class="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
                @click="showForm = true"
            >
                <IconPlus :size="16" />
                Créer une configuration
            </button>
        </div>

        <template v-else>
            <section class="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
                <div class="flex flex-col gap-4 bg-emerald-50/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex gap-3">
                        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                            <IconCircleCheck :size="21" />
                        </div>
                        <div>
                            <div class="flex flex-wrap items-center gap-2">
                                <h2 class="text-sm font-bold text-emerald-950">
                                    {{ config.name }}
                                </h2>
                                <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700">
                                    Active
                                </span>
                            </div>
                            <p class="mt-1 text-xs text-emerald-800/70">
                                Version {{ config.version }} · moteur {{ config.solver.type }}
                            </p>
                        </div>
                    </div>

                    <div class="rounded-xl border border-emerald-200 bg-white/70 px-4 py-3">
                        <p class="text-[9px] font-bold uppercase text-emerald-500">
                            Solveur
                        </p>
                        <p class="mt-1 text-sm font-bold text-slate-900">
                            {{ config.solver.type }}
                        </p>
                        <p class="text-[10px] text-slate-500">
                            Timeout {{ config.solver.timeout_seconds }} s
                        </p>
                    </div>
                </div>
            </section>

            <div class="grid gap-4 lg:grid-cols-2">
                <PlanningRuleCard
                    title="Repos minimum par semaine"
                    :value="`${config.rules.min_rest_days_per_week} jour(s)`"
                    description="Journées complètes sans activité sur une semaine complète."
                    example="À 1, un collaborateur peut travailler au maximum 6 jours."
                    :icon="IconBeach"
                    accent="emerald"
                />
                <PlanningRuleCard
                    title="Jours consécutifs maximum"
                    :value="`${config.rules.max_consecutive_work_days} jour(s)`"
                    description="Empêche une séquence de travail trop longue."
                    example="À 6, toute fenêtre de 7 jours contient un repos."
                    :icon="IconCalendarStats"
                />
                <PlanningRuleCard
                    title="Récupération après garde"
                    :value="config.rules.rest_after_guard_required
                        ? `${config.rules.post_guard_rest_days} jour(s)`
                        : 'Désactivée'"
                    description="Bloque les journées complètes après la fin de garde."
                    example="Garde lundi, fin mardi, repos mercredi avec une valeur de 1."
                    :icon="IconMoonStars"
                    accent="violet"
                />
                <PlanningRuleCard
                    title="Gardes consécutives maximum"
                    :value="String(config.rules.max_consecutive_guards)"
                    description="Limite les débuts de garde successifs."
                    example="À 1, deux gardes commencées deux jours consécutifs sont interdites."
                    :icon="IconShieldStar"
                    accent="amber"
                />
                <PlanningRuleCard
                    title="Repos entre deux services"
                    :value="formatMinutes(config.rules.min_rest_minutes_between_shifts)"
                    description="Temps minimum entre la fin d’un service et le prochain."
                    example="660 minutes correspondent à 11 heures."
                    :icon="IconClockPause"
                />
                <PlanningRuleCard
                    title="Limite hebdomadaire générale"
                    :value="formatMinutes(config.rules.max_weekly_minutes)"
                    description="Plafond utilisé lorsqu’un profil n’a pas sa propre limite."
                    example="Une limite individuelle reste prioritaire."
                    :icon="IconClockHour4"
                    accent="emerald"
                />
            </div>
        </template>

        <PlanningConfigForm
            :open="showForm"
            :config="config"
            @close="showForm = false"
            @saved="onConfigSaved"
        />
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
    IconBeach,
    IconCalendarStats,
    IconCircleCheck,
    IconClockHour4,
    IconClockPause,
    IconMoonStars,
    IconPencil,
    IconPlus,
    IconRefresh,
    IconSettingsOff,
    IconShieldStar,
} from '@tabler/icons-vue'

import PlanningSuggestionConfigService from '@/service/PlanningSuggestionConfigService'
import PlanningInfoPanel from '../components/PlanningInfoPanel.vue'
import PlanningPageHeader from '../components/PlanningPageHeader.vue'
import PlanningRuleCard from '../components/PlanningRuleCard.vue'
import PlanningConfigForm from './PlanningConfigForm.vue'
import {
    formatMinutes,
    responseData,
    responseError,
} from '../planningSuggestion.helpers'
import type { PlanningSuggestionConfig } from '../planningSuggestion.type'

const loading = ref(false)
const errorMessage = ref('')
const config = ref<PlanningSuggestionConfig | null>(null)
const showForm = ref(false)

async function load(): Promise<void> {
    loading.value = true
    errorMessage.value = ''

    try {
        const response = await PlanningSuggestionConfigService.active()
        config.value = responseData(response).planning_suggestion_config ?? null
    } catch (error: any) {
        errorMessage.value = responseError(
            error,
            'Impossible de charger la configuration.',
        )
    } finally {
        loading.value = false
    }
}

function onConfigSaved(value: PlanningSuggestionConfig): void {
    config.value = value
    showForm.value = false
}

onMounted(load)
</script>
