<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h2>{{ isEditMode ? 'Modifier le modèle d\'horaire' : 'Créer un modèle d\'horaire' }}</h2>
        <button class="btn-close" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <!-- Informations générales -->
        <div class="form-section">
          <h3 class="section-title">Informations générales</h3>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nom du modèle *</label>
              <input
                type="text"
                class="form-input"
                v-model="localTemplate.name"
                placeholder="Ex: Bureau Standard, Équipe Matin, Équipe Soir..."
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Valide du *</label>
              <input
                type="date"
                class="form-input"
                v-model="localTemplate.valid_from"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Valide jusqu'au *</label>
              <input
                type="date"
                class="form-input"
                v-model="localTemplate.valid_to"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Tolérance de retard par défaut</label>
              <select class="form-select" v-model="defaultTolerance">
                <option :value="0">Aucune tolérance</option>
                <option :value="5">5 minutes</option>
                <option :value="10">10 minutes</option>
                <option :value="15">15 minutes</option>
                <option :value="20">20 minutes</option>
                <option :value="30">30 minutes</option>
              </select>
              <p class="form-hint">Cette tolérance s'appliquera à toutes les périodes sauf si personnalisée</p>
            </div>
          </div>
        </div>

        <!-- Configuration par jour -->
        <div class="form-section">
          <h3 class="section-title">Configuration hebdomadaire</h3>
          <p class="form-hint">Définissez les périodes de travail pour chaque jour. Vous pouvez ajouter plusieurs périodes par jour (ex: matin et après-midi).</p>

          <div
            v-for="day in daysOfWeek"
            :key="day.value"
            class="day-config"
          >
            <div class="day-header">
              <label class="checkbox-wrapper">
                <input
                  type="checkbox"
                  v-model="activeDays[day.value]"
                  @change="toggleDay(day.value)"
                />
                <span class="checkbox-label">{{ day.label }}</span>
              </label>
              <button
                v-if="activeDays[day.value]"
                class="btn-add-period"
                @click="addPeriod(day.value)"
              >
                + Ajouter une période
              </button>
            </div>

            <div v-if="activeDays[day.value]" class="day-details">
              <div
                v-for="(period, index) in localTemplate.definition[day.value]"
                :key="index"
                class="period-item"
              >
                <div class="period-header">
                  <span class="period-label">Période {{ index + 1 }}</span>
                  <button
                    v-if="localTemplate.definition[day.value].length > 1"
                    class="btn-remove"
                    @click="removePeriod(day.value, index)"
                    title="Supprimer cette période"
                  >
                    ×
                  </button>
                </div>

                <!-- Horaires de travail -->
                <div class="time-group">
                  <div class="form-group">
                    <label class="form-label-sm">Début travail *</label>
                    <input
                      type="time"
                      class="form-input-sm"
                      v-model="period.work[0]"
                      @blur="validateWorkTimes(day.value, index)"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label-sm">Fin travail *</label>
                    <input
                      type="time"
                      class="form-input-sm"
                      v-model="period.work[1]"
                      @blur="validateWorkTimes(day.value, index)"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label-sm">Tolérance</label>
                    <select
                      class="form-select-sm"
                      v-model="period.tolerance"
                    >
                      <option :value="null">Par défaut ({{ defaultTolerance }}min)</option>
                      <option :value="0">Aucune</option>
                      <option :value="5">5 min</option>
                      <option :value="10">10 min</option>
                      <option :value="15">15 min</option>
                      <option :value="20">20 min</option>
                      <option :value="30">30 min</option>
                    </select>
                  </div>
                </div>

                <!-- Pause -->
                <div class="pause-section">
                  <label class="checkbox-wrapper-inline">
                    <input
                      type="checkbox"
                      :checked="period.pause !== null"
                      @change="togglePause(day.value, index)"
                    />
                    <span class="checkbox-label">Cette période inclut une pause</span>
                  </label>

                  <div v-if="period.pause !== null" class="pause-times">
                    <div class="form-group">
                      <label class="form-label-sm">Début pause</label>
                      <input
                        type="time"
                        class="form-input-sm"
                        v-model="period.pause[0]"
                        @blur="validatePauseTimes(day.value, index)"
                      />
                    </div>
                    <div class="form-group">
                      <label class="form-label-sm">Fin pause</label>
                      <input
                        type="time"
                        class="form-input-sm"
                        v-model="period.pause[1]"
                        @blur="validatePauseTimes(day.value, index)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="day-off-notice">
              Jour de repos
            </div>
          </div>
        </div>

        <!-- Prévisualisation JSON -->
        <div class="form-section">
          <details>
            <summary class="section-title">Prévisualisation JSON (pour développeurs)</summary>
            <pre class="json-preview">{{ JSON.stringify(buildApiPayload(), null, 2) }}</pre>
          </details>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">
          Annuler
        </button>
        <button class="btn btn-primary" @click="handleSave">
          {{ isEditMode ? 'Enregistrer' : 'Créer' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue';
import "../../assets/css/toke-schedule-21.css"

interface Period {
  work: [string, string];
  pause: [string, string] | null;
  tolerance: number | null;
}

interface Definition {
  Mon: Period[];
  Tue: Period[];
  Wed: Period[];
  Thu: Period[];
  Fri: Period[];
  Sat: Period[];
  Sun: Period[];
}

interface SessionTemplate {
  guid?: string;
  name: string;
  valid_from: string;
  valid_to: string;
  definition: Definition;
}

interface DayOfWeek {
  label: string;
  short: string;
  value: keyof Definition;
}

const props = defineProps<{
  template?: SessionTemplate | null;
  isEditMode: boolean;
}>();

const emit = defineEmits<{
  save: [payload: any];
  close: [];
}>();

const daysOfWeek: DayOfWeek[] = [
  { label: 'Lundi', short: 'Lun', value: 'Mon' },
  { label: 'Mardi', short: 'Mar', value: 'Tue' },
  { label: 'Mercredi', short: 'Mer', value: 'Wed' },
  { label: 'Jeudi', short: 'Jeu', value: 'Thu' },
  { label: 'Vendredi', short: 'Ven', value: 'Fri' },
  { label: 'Samedi', short: 'Sam', value: 'Sat' },
  { label: 'Dimanche', short: 'Dim', value: 'Sun' }
];

const defaultTolerance = ref<number>(15);

// Initialisation du modèle local
const createEmptyDefinition = (): Definition => ({
  Mon: [],
  Tue: [],
  Wed: [],
  Thu: [],
  Fri: [],
  Sat: [],
  Sun: []
});

const createDefaultPeriod = (): Period => ({
  work: ['08:00', '12:00'],
  pause: null,
  tolerance: null
});

const localTemplate = ref<SessionTemplate>(
  props.template
    ? {
      ...JSON.parse(JSON.stringify(props.template)),
      definition: normalizeDefinition(props.template.definition)
    }
    : {
      name: '',
      valid_from: new Date().toISOString().split('T')[0],
      valid_to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      definition: createEmptyDefinition()
    }
);

// Tracking des jours actifs
const activeDays = reactive<Record<keyof Definition, boolean>>({
  Mon: localTemplate.value.definition.Mon.length > 0,
  Tue: localTemplate.value.definition.Tue.length > 0,
  Wed: localTemplate.value.definition.Wed.length > 0,
  Thu: localTemplate.value.definition.Thu.length > 0,
  Fri: localTemplate.value.definition.Fri.length > 0,
  Sat: localTemplate.value.definition.Sat.length > 0,
  Sun: localTemplate.value.definition.Sun.length > 0
});

watch(() => props.template, (newTemplate) => {
  if (newTemplate) {
    localTemplate.value = JSON.parse(JSON.stringify(newTemplate));
    // Update active days
    daysOfWeek.forEach(day => {
      activeDays[day.value] = localTemplate.value.definition[day.value].length > 0;
    });
  }
}, { deep: true });

function toggleDay(day: keyof Definition) {
  if (activeDays[day]) {
    // Ajouter une période par défaut si le jour devient actif
    if (localTemplate.value.definition[day].length === 0) {
      localTemplate.value.definition[day].push(createDefaultPeriod());
    }
  } else {
    // Vider les périodes si le jour devient inactif
    localTemplate.value.definition[day] = [];
  }
}

function addPeriod(day: keyof Definition) {
  const lastPeriod = localTemplate.value.definition[day][localTemplate.value.definition[day].length - 1];
  const newPeriod = createDefaultPeriod();

  // Si une période existe, proposer des horaires après-midi par défaut
  if (lastPeriod && lastPeriod.work[1]) {
    const endTime = lastPeriod.work[1];
    const [hours, minutes] = endTime.split(':').map(Number);
    const newStart = `${String(hours + 2).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const newEnd = `${String(hours + 6).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    newPeriod.work = [newStart, newEnd];
  }

  localTemplate.value.definition[day].push(newPeriod);
}

function removePeriod(day: keyof Definition, index: number) {
  localTemplate.value.definition[day].splice(index, 1);

  // Si plus de périodes, désactiver le jour
  if (localTemplate.value.definition[day].length === 0) {
    activeDays[day] = false;
  }
}

function togglePause(day: keyof Definition, periodIndex: number) {
  const period = localTemplate.value.definition[day][periodIndex];

  if (period.pause === null) {
    // Activer la pause avec des valeurs par défaut
    const [startHours, startMinutes] = period.work[0].split(':').map(Number);
    const [endHours, endMinutes] = period.work[1].split(':').map(Number);

    // Calculer le milieu de la période de travail
    const totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    const middleMinutes = startHours * 60 + startMinutes + totalMinutes / 2;

    const pauseStartHours = Math.floor(middleMinutes / 60);
    const pauseStartMinutes = Math.floor(middleMinutes % 60);
    const pauseEndHours = Math.floor((middleMinutes + 30) / 60);
    const pauseEndMinutes = Math.floor((middleMinutes + 30) % 60);

    period.pause = [
      `${String(pauseStartHours).padStart(2, '0')}:${String(pauseStartMinutes).padStart(2, '0')}`,
      `${String(pauseEndHours).padStart(2, '0')}:${String(pauseEndMinutes).padStart(2, '0')}`
    ];
  } else {
    // Désactiver la pause
    period.pause = null;
  }
}

function validateWorkTimes(day: keyof Definition, periodIndex: number) {
  const period = localTemplate.value.definition[day][periodIndex];

  if (period.work[0] >= period.work[1]) {
    alert('L\'heure de fin doit être après l\'heure de début');
  }
}

function validatePauseTimes(day: keyof Definition, periodIndex: number) {
  const period = localTemplate.value.definition[day][periodIndex];

  if (period.pause) {
    if (period.pause[0] >= period.pause[1]) {
      alert('L\'heure de fin de pause doit être après l\'heure de début');
    }

    if (period.pause[0] < period.work[0] || period.pause[1] > period.work[1]) {
      alert('La pause doit être comprise dans les horaires de travail');
    }
  }
}

function buildApiPayload() {
  // Nettoyer la définition : remplacer les tolérances null par la valeur par défaut
  const cleanedDefinition: Definition = {} as Definition;

  daysOfWeek.forEach(day => {
    cleanedDefinition[day.value] = localTemplate.value.definition[day.value].map(period => ({
      work: period.work,
      pause: period.pause,
      tolerance: period.tolerance !== null ? period.tolerance : defaultTolerance.value
    }));
  });

  return {
    name: localTemplate.value.name,
    definition: cleanedDefinition,
    valid_from: localTemplate.value.valid_from,
    valid_to: localTemplate.value.valid_to
  };
}

function handleSave() {
  // Validation
  if (!localTemplate.value.name.trim()) {
    alert('Veuillez saisir un nom pour le modèle d\'horaire');
    return;
  }

  if (!localTemplate.value.valid_from || !localTemplate.value.valid_to) {
    alert('Veuillez saisir les dates de validité');
    return;
  }

  if (localTemplate.value.valid_from > localTemplate.value.valid_to) {
    alert('La date de début doit être antérieure à la date de fin');
    return;
  }

  // Vérifier qu'au moins un jour est actif
  const hasActiveDays = daysOfWeek.some(day => localTemplate.value.definition[day.value].length > 0);
  if (!hasActiveDays) {
    alert('Veuillez activer au moins un jour de la semaine');
    return;
  }

  // Valider chaque période
  for (const day of daysOfWeek) {
    const periods = localTemplate.value.definition[day.value];
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];

      if (!period.work[0] || !period.work[1]) {
        alert(`${day.label} - Période ${i + 1}: Veuillez saisir les horaires de travail`);
        return;
      }

      if (period.work[0] >= period.work[1]) {
        alert(`${day.label} - Période ${i + 1}: L'heure de fin doit être après l'heure de début`);
        return;
      }

      if (period.pause) {
        if (!period.pause[0] || !period.pause[1]) {
          alert(`${day.label} - Période ${i + 1}: Veuillez saisir les horaires de pause complets ou désactiver la pause`);
          return;
        }

        if (period.pause[0] >= period.pause[1]) {
          alert(`${day.label} - Période ${i + 1}: L'heure de fin de pause doit être après l'heure de début`);
          return;
        }

        if (period.pause[0] < period.work[0] || period.pause[1] > period.work[1]) {
          alert(`${day.label} - Période ${i + 1}: La pause doit être comprise dans les horaires de travail`);
          return;
        }
      }
    }
  }

  const payload = buildApiPayload();
  emit('save', payload);
}

function normalizeDefinition(def?: Partial<Definition>): Definition {
  return {
    Mon: def?.Mon ?? [],
    Tue: def?.Tue ?? [],
    Wed: def?.Wed ?? [],
    Thu: def?.Thu ?? [],
    Fri: def?.Fri ?? [],
    Sat: def?.Sat ?? [],
    Sun: def?.Sun ?? []
  };
}
</script>

<style scoped>
.period-item {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.period-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.period-label {
  font-weight: 600;
  color: #495057;
  font-size: 0.9rem;
}

.btn-add-period {
  background: #4caf50;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-add-period:hover {
  background: #45a049;
}

.pause-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #dee2e6;
}

.pause-times {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.json-preview {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 12px;
  overflow-x: auto;
  font-size: 0.85rem;
  max-height: 300px;
  overflow-y: auto;
}

details summary {
  cursor: pointer;
  user-select: none;
}

details summary:hover {
  color: #2196F3;
}

.checkbox-wrapper-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>