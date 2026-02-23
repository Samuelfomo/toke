<template>
  <section class="dashboard-hero">
    <!-- ================= HEADER ================= -->
    <div class="hero-header">
      <div class="hero-left">
        <h1 class="hero-title">
          Tableau de Bord
          <span class="employee-count">({{ employeeCount }} employés)</span>
        </h1>
        <div class="date-bar">
          <!-- Badge date : toujours visible, affiche aujourd'hui en normal, la période en analytique -->
          <span class="date-badge">
            📅 {{ displayedRange }}
          </span>
          <!-- Indicateur de mode actif -->
          <span class="mode-badge" :class="isAnalyticsMode ? 'mode-analytics' : 'mode-normal'">
            {{ isAnalyticsMode ? '📊 Analytique' : '📋 Normal' }}
          </span>
        </div>
      </div>

      <!-- ================= FILTER BAR ================= -->
      <div class="filter-bar">

        <!-- GROUPE : hint + bouton Jour + champs dates -->
        <div class="period-group">
          <!-- INDICATION PÉRIODE -->
          <div class="period-hint">
            <p class="period-hint-text">📊 Personnalisez une période pour voir son analytique</p>
            <p class="period-hint-nb">
              <strong>N.B :</strong> Pour analyser un jour précis, sélectionnez la même date en début et en fin de période.
            </p>
          </div>

          <!-- CONTRÔLES : bouton Jour + champs dates -->
          <div class="period-controls">
            <!-- BOUTON JOUR : repasse en mode normal -->
            <div class="period-switch">
              <button
                  :class="{ active: !isAnalyticsMode }"
                  @click="switchToNormal"
                  title="Revenir au mode normal (aujourd'hui)">
                📋 Jour
              </button>
            </div>

            <!-- DATE DÉBUT (toujours visible) -->
            <div class="date-range-inputs">
              <div class="date-field">
                <label class="date-field-label">Début</label>
                <input
                    type="date"
                    v-model="customStartDate"
                    :max="customEndDate || today"
                    class="date-input"
                    title="Date de début de la période analytique"
                />
              </div>

              <span class="range-arrow">→</span>

              <!-- DATE FIN : déclenche le chargement -->
              <div class="date-field">
                <label class="date-field-label">Fin</label>
                <input
                    type="date"
                    v-model="customEndDate"
                    :min="customStartDate"
                    :max="today"
                    class="date-input"
                    :disabled="!customStartDate"
                    :class="{ 'input-ready': customStartDate && !customEndDate }"
                    @change="onEndDateChange"
                    title="Sélectionnez la date de fin pour lancer l'analyse"
                />
              </div>

              <!-- Loader inline quand on attend -->
              <div v-if="isLoading" class="inline-loader">
                <span class="loader-dot"></span>
                <span class="loader-dot"></span>
                <span class="loader-dot"></span>
              </div>
            </div>
          </div><!-- fin period-controls -->
        </div><!-- fin period-group -->

        <!-- EMPLOYEE -->
<!--        <div class="employee-filter">-->
<!--          <select v-model="selectedEmployee" @change="emitFilters" class="employee-select">-->
<!--            <option value="">Tous les employés</option>-->
<!--            <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.name }}</option>-->
<!--          </select>-->
<!--        </div>-->
      </div>
    </div>


  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Summary } from '@/service/UserService'

interface Employee {
  id: number | string
  name: string
}

interface Props {
  summary: Summary
  date: string
  employees: Employee[]
  activeStartDate?: string
  activeEndDate?: string
  activeViewMode?: 'normal' | 'analytics'
}

const props = defineProps<Props>()
const emit = defineEmits(['filter-change'])

const today = new Date().toISOString().split('T')[0]

const selectedEmployee = ref('')
const customStartDate  = ref('')
const customEndDate    = ref('')
const isLoading        = ref(false)

// Mode analytique = true si le parent a confirmé une période valide
// On utilise les props du parent comme source de vérité (résiste au rechargement des données)
const isAnalyticsMode = computed(
    () => props.activeViewMode === 'analytics'
        || !!(customStartDate.value && customEndDate.value && customStartDate.value <= customEndDate.value)
)

// ─── Formatage ──────────────────────────────────────────────────────────────
const fmtDate = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    })

const displayedRange = computed(() => {
  // Priorité aux props du parent (source de vérité après rechargement des données)
  const start = props.activeStartDate || customStartDate.value
  const end   = props.activeEndDate   || customEndDate.value

  if (props.activeViewMode === 'analytics' && start && end) {
    return `${fmtDate(start)} → ${fmtDate(end)}`
  }
  // Fallback sur les refs locales (pendant la saisie, avant l'emit)
  if (customStartDate.value && customEndDate.value) {
    return `${fmtDate(customStartDate.value)} → ${fmtDate(customEndDate.value)}`
  }
  return fmtDate(today)
});

const employeeCount = computed(() => props.summary?.total_team_members ?? 0)

// ─── Emit principal ──────────────────────────────────────────────────────────
const emitFilters = () => {
  // En mode analytique : utiliser les refs locales (saisie en cours)
  // ou les props du parent comme fallback (après rechargement)
  const startDate = isAnalyticsMode.value
      ? (customStartDate.value || props.activeStartDate || today)
      : today
  const endDate = isAnalyticsMode.value
      ? (customEndDate.value || props.activeEndDate || today)
      : today

  emit('filter-change', {
    startDate,
    endDate,
    employeeId: selectedEmployee.value,
    period:     isAnalyticsMode.value ? 'custom' : 'day',
    viewMode:   isAnalyticsMode.value ? 'analytics' : 'normal',
  })
}

// ─── Déclenché UNIQUEMENT par la date de fin ─────────────────────────────────
const onEndDateChange = async () => {
  if (!customStartDate.value || !customEndDate.value) return
  if (customEndDate.value < customStartDate.value) return

  isLoading.value = true
  // Petit délai pour laisser le DOM se mettre à jour (UX)
  await new Promise(r => setTimeout(r, 120))
  emitFilters()
  isLoading.value = false
}

// ─── Retour mode normal (bouton Jour) ────────────────────────────────────────
const switchToNormal = () => {
  customStartDate.value = ''
  customEndDate.value   = ''
  isLoading.value       = false
  // Émettre directement avec today sans passer par emitFilters()
  // car isAnalyticsMode est toujours true à cet instant (computed pas encore ré-évalué)
  emit('filter-change', {
    startDate:  today,
    endDate:    today,
    employeeId: selectedEmployee.value,
    period:     'day',
    viewMode:   'normal',
  })
}

// ─── Sync des champs avec les props du parent ────────────────────────────────
// Quand le parent confirme les dates (après rechargement), on remet les valeurs
// dans les champs pour qu'elles restent affichées
watch(() => props.activeStartDate, (val) => {
  if (val && val !== customStartDate.value) {
    customStartDate.value = val
  }
})

watch(() => props.activeEndDate, (val) => {
  if (val && val !== customEndDate.value) {
    customEndDate.value = val
  }
})

// Quand on revient en mode normal, vider les champs
watch(() => props.activeViewMode, (val) => {
  if (val === 'normal') {
    customStartDate.value = ''
    customEndDate.value   = ''
  }
})
</script>

<style scoped>
.dashboard-hero {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Header ── */
.hero-header {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1.5rem;
  padding: 1.75rem 2rem;
  border-radius: 20px;
  background: linear-gradient(135deg, #ffffff, #f8fafc);
  border: 1px solid #e2e8f0;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.06);
  align-items: center;
}

.hero-title {
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 10px;
  color: #0f172a;
}
.employee-count {
  background: #eef2ff;
  padding: .2rem .6rem;
  border-radius: 999px;
  font-size: .82rem;
  font-weight: 600;
  color: #4f46e5;
}

/* ── Date bar ── */
.date-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-badge {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  padding: .45rem .9rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: .82rem;
  box-shadow: 0 4px 12px rgba(59, 130, 246, .3);
}

.mode-badge {
  padding: .35rem .8rem;
  border-radius: 999px;
  font-size: .78rem;
  font-weight: 700;
  letter-spacing: .02em;
  transition: all .3s ease;
}
.mode-normal    { background: #f1f5f9; color: #64748b; }
.mode-analytics { background: linear-gradient(135deg, #f0fdf4, #dcfce7); color: #16a34a; border: 1px solid #bbf7d0; }

/* ── Period group (hint + contrôles) ── */
.period-group {
  display: flex;
  flex-direction: column;
  gap: .45rem;
  align-items: flex-start;
}

.period-controls {
  display: flex;
  align-items: center;
  gap: .75rem;
}

/* ── Period hint ── */
.period-hint {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  padding: .5rem .85rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.period-hint-text {
  margin: 0;
  font-size: .8rem;
  font-weight: 700;
  color: #1d4ed8;
}
.period-hint-nb {
  margin: 0;
  font-size: .74rem;
  color: #475569;
}
.period-hint-nb strong {
  color: #1d4ed8;
}

/* ── Filter bar ── */
.filter-bar {
  display: flex;
  gap: .75rem;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
}

/* ── Bouton Jour ── */
.period-switch {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: .4rem;
  display: flex;
}

.period-switch button {
  cursor: pointer;
  border: none;
  background: transparent;
  padding: .45rem .9rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: .85rem;
  color: #64748b;
  transition: all .2s;
}
.period-switch button:hover { background: #f1f5f9; }
.period-switch button.active {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  box-shadow: 0 4px 10px rgba(59, 130, 246, .35);
}

/* ── Date range inputs ── */
.date-range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: .5rem .9rem;
  transition: border-color .25s, box-shadow .25s;
}

.date-range-inputs:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, .12);
}

.date-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.date-field-label {
  font-size: .68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: #94a3b8;
}

.date-input {
  border: none;
  background: transparent;
  font-weight: 600;
  font-size: .84rem;
  color: #0f172a;
  cursor: pointer;
  outline: none;
  padding: 2px 0;
}
.date-input:disabled {
  color: #cbd5e0;
  cursor: not-allowed;
}
/* Pulsation quand on attend la date de fin */
.date-input.input-ready {
  animation: pulse-input 1.4s ease-in-out infinite;
}
@keyframes pulse-input {
  0%, 100% { opacity: 1; }
  50%       { opacity: .45; }
}

.range-arrow {
  font-size: 1rem;
  color: #94a3b8;
  font-weight: 700;
  padding: 0 2px;
}

/* ── Loader inline ── */
.inline-loader {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-left: 4px;
}
.loader-dot {
  width: 5px; height: 5px;
  background: #3b82f6;
  border-radius: 50%;
  animation: bounce-dot .8s ease-in-out infinite;
}
.loader-dot:nth-child(2) { animation-delay: .15s; }
.loader-dot:nth-child(3) { animation-delay: .3s; }
@keyframes bounce-dot {
  0%, 100% { transform: translateY(0); opacity: .4; }
  50%       { transform: translateY(-4px); opacity: 1; }
}

/* ── Employee filter ── */
.employee-filter {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: .4rem .7rem;
  display: flex;
  align-items: center;
}
.employee-select {
  border: none;
  background: transparent;
  font-weight: 600;
  font-size: .84rem;
  color: #0f172a;
  cursor: pointer;
  outline: none;
}



/* ── Transitions ── */
.slide-fade-enter-active { transition: all .3s cubic-bezier(.34, 1.56, .64, 1); }
.slide-fade-leave-active { transition: all .2s ease; }
.slide-fade-enter-from  { opacity: 0; transform: translateY(-8px); }
.slide-fade-leave-to    { opacity: 0; transform: translateY(-6px); }

.fade-badge-enter-active { transition: opacity .25s ease, transform .25s ease; }
.fade-badge-leave-active { transition: opacity .2s ease, transform .2s ease; }
.fade-badge-enter-from   { opacity: 0; transform: scale(.9); }
.fade-badge-leave-to     { opacity: 0; transform: scale(.9); }

/* Badge date dans le bandeau analytique */
.date-badge-analytics {
  background: white;
  color: #166534;
  border: 1px solid #86efac;
  box-shadow: none;
  font-size: .82rem;
  font-weight: 700;
  padding: .35rem .85rem;
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .hero-header { grid-template-columns: 1fr; }
  .filter-bar  { justify-content: flex-start; }
  .date-range-inputs { flex-wrap: wrap; }
}
</style>