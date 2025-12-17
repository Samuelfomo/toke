<template>
  <section v-if="loading" class="dashboard-hero-skeleton">
    <div class="skeleton-header"></div>
    <div class="stats-grid">
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    </div>
  </section>

  <section v-else class="dashboard-hero">
    <div class="hero-header">
      <h1 class="hero-title">Tableau de bord</h1>
      <div class="date-info">
        <div class="current-date">{{ formattedDate }}</div>
        <div class="last-update">Dernière mise à jour: {{ lastUpdate }}</div>
      </div>
    </div>

    <div class="stats-grid">
      <!-- Employés présents -->
      <div class="stat-card stat-present">
        <div class="stat-icon">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-number">
            {{ statistics.present_to_days }}/{{ statistics.total_team_members }}
          </div>
          <div class="stat-label">Employés présents</div>
          <div class="stat-percentage">{{ presencePercentage }}%</div>
        </div>
      </div>

      <!-- Retards -->
      <div class="stat-card stat-warning" :class="{ 'has-issues': statistics.late_arrivals > 0 }">
        <div class="stat-icon">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ statistics.late_arrivals }}</div>
          <div class="stat-label">Retards</div>
          <div class="stat-detail" v-if="statistics.average_work_hours">
            Moyenne: {{ statistics.average_work_hours }}
          </div>
        </div>
      </div>

      <!-- Absents -->
      <div class="stat-card stat-error" :class="{ 'has-issues': statistics.absences > 0 }">
        <div class="stat-icon">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ statistics.absences }}</div>
          <div class="stat-label">Absents</div>
          <div class="stat-detail">
            Taux de présence: {{ statistics.attendance_rate }}
          </div>
        </div>
      </div>

      <!-- Jour de repos -->
      <div class="stat-card stat-info">
        <div class="stat-icon">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ statistics.off_day }}</div>
          <div class="stat-label">Jours de repos</div>
          <div class="stat-detail">
            Actifs: {{ statistics.currently_active }}
          </div>
        </div>
      </div>
    </div>

    <div class="quick-actions">
      <h3 class="actions-title">Actions rapides</h3>
      <div class="actions-grid">
        <a href="#" class="action-btn action-absent"
           :class="{ 'has-count': statistics.absences > 0 }">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <span>Gérer les absents ({{ statistics.absences }})</span>
        </a>

        <a href="#" class="action-btn action-late"
           :class="{ 'has-count': statistics.late_arrivals > 0 }">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Traiter les retards ({{ statistics.late_arrivals }})</span>
        </a>

        <a href="#" class="action-btn">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <span>Exporter le jour</span>
        </a>
      </div>
    </div>

    <div class="presence-progress">
      <div class="progress-header">
        <span class="progress-label">Taux de présence du jour</span>
        <span class="progress-value">{{ statistics.attendance_rate }}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressWidth }"></div>
      </div>
      <div class="progress-benchmark">
        <span class="benchmark-text">Objectif: 95% | Ponctualité: {{ statistics.punctuality_rate }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Statistics } from '@/utils/interfaces/team.interface'
import "../../assets/css/toke-dHero-03.css"

interface Props {
  statistics: Statistics
  date: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const lastUpdate = computed(() => {
  const now = new Date()
  return now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
})

const formattedDate = computed(() => {
  const dateObj = new Date(props.date)
  return dateObj.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const presencePercentage = computed(() => {
  if (props.statistics.total_team_members === 0) return 0
  return Math.round((props.statistics.present_to_days / props.statistics.total_team_members) * 100)
})

const progressWidth = computed(() => {
  const rate = props.statistics.attendance_rate
  if (rate === 'N/A') return '0%'
  return rate
})
</script>

<style scoped>
.dashboard-hero-skeleton {
  padding: 2rem;
}

.skeleton-header,
.skeleton-card {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 8px;
}

.skeleton-header {
  height: 80px;
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.skeleton-card {
  height: 140px;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.has-count {
  position: relative;
}

.has-count::after {
  content: '';
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>

<!--<template>-->
<!--  <section v-if="loading" class="dashboard-hero-skeleton">-->
<!--    <div class="skeleton-header"></div>-->
<!--    <div class="stats-grid">-->
<!--      <div class="skeleton-card"></div>-->
<!--      <div class="skeleton-card"></div>-->
<!--      <div class="skeleton-card"></div>-->
<!--      <div class="skeleton-card"></div>-->
<!--    </div>-->
<!--    <div class="skeleton-actions-title"></div>-->
<!--    <div class="skeleton-actions-grid">-->
<!--      <div class="skeleton-action-btn"></div>-->
<!--      <div class="skeleton-action-btn"></div>-->
<!--      <div class="skeleton-action-btn"></div>-->
<!--    </div>-->
<!--  </section>-->
<!--  <section class="dashboard-hero">-->
<!--    <div class="hero-header">-->
<!--      <h1 class="hero-title">Tableau de bord</h1>-->
<!--      <div class="date-info">-->
<!--        <div class="current-date">{{ currentDate }}</div>-->
<!--        <div class="last-update">Dernière mise à jour: {{ lastUpdate }}</div>-->
<!--      </div>-->
<!--    </div>-->

<!--    <div class="stats-grid">-->
<!--      <div class="stat-card stat-present">-->
<!--        <div class="stat-icon">-->
<!--          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>-->
<!--          </svg>-->
<!--        </div>-->
<!--        <div class="stat-content">-->
<!--          <div class="stat-number">{{ subordinates?.data.statistics.present_to_days }}/{{ subordinates?.data.statistics.total_team_members}}</div>-->
<!--          <div class="stat-label">Employés présents</div>-->
<!--          <div class="stat-percentage">{{ stats.present.percentage }}%</div>-->
<!--        </div>-->
<!--      </div>-->

<!--      <div class="stat-card stat-warning has-issues">-->
<!--        <div class="stat-icon">-->
<!--          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>-->
<!--          </svg>-->
<!--        </div>-->
<!--        <div class="stat-content">-->
<!--          <div class="stat-number">{{ subordinates?.data.statistics.late_arrivals }}</div>-->
<!--          <div class="stat-label">Retards</div>-->
<!--          <div class="stat-detail">Moyenne: 25min</div>-->
<!--        </div>-->
<!--      </div>-->

<!--      <div class="stat-card stat-error has-issues">-->
<!--        <div class="stat-icon">-->
<!--          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>-->
<!--          </svg>-->
<!--        </div>-->
<!--        <div class="stat-content">-->
<!--          <div class="stat-number">{{ subordinates?.data.statistics.absences }}</div>-->
<!--          <div class="stat-label">Absents</div>-->
<!--          <div class="stat-detail">Non justifiés: 3</div>-->
<!--        </div>-->
<!--      </div>-->
<!--      <div class="stat-card stat-error has-issues">-->
<!--        <div class="stat-icon">-->
<!--          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>-->
<!--          </svg>-->
<!--        </div>-->
<!--        <div class="stat-content">-->
<!--          <div class="stat-number">{{ subordinates?.data.statistics.off_day }}</div>-->
<!--          <div class="stat-label">Activite</div>-->
<!--          <div class="stat-detail"></div>-->
<!--        </div>-->
<!--      </div>-->
<!--    </div>-->

<!--    <div class="quick-actions">-->
<!--      <h3 class="actions-title">Actions rapides</h3>-->
<!--      <div class="actions-grid">-->
<!--        <a href="#" class="action-btn action-absent">-->
<!--          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"></path>-->
<!--          </svg>-->
<!--          <span>Gérer les absents ({{ stats.absent.value }})</span>-->
<!--        </a>-->
<!--        <a href="#" class="action-btn action-late">-->
<!--          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>-->
<!--          </svg>-->
<!--          <span>Traiter les retards ({{ stats.late.value }})</span>-->
<!--        </a>-->
<!--        <a href="#" class="action-btn">-->
<!--          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>-->
<!--          </svg>-->
<!--          <span>Exporter le jour</span>-->
<!--        </a>-->
<!--      </div>-->
<!--    </div>-->

<!--    <div class="presence-progress">-->
<!--&lt;!&ndash;      <div class="progress-header">&ndash;&gt;-->
<!--&lt;!&ndash;        <span class="progress-label">Taux de présence du jour</span>&ndash;&gt;-->
<!--&lt;!&ndash;        <span class="progress-value">{{ presenceRate }}%</span>&ndash;&gt;-->
<!--&lt;!&ndash;      </div>&ndash;&gt;-->
<!--&lt;!&ndash;      <div class="progress-bar">&ndash;&gt;-->
<!--&lt;!&ndash;        <div class="progress-fill" :style="{ width: presenceRate + '%' }"></div>&ndash;&gt;-->
<!--&lt;!&ndash;      </div>&ndash;&gt;-->
<!--      <div class="progress-benchmark">-->
<!--        <span class="benchmark-text">Objectif: 95%</span>-->
<!--      </div>-->
<!--    </div>-->
<!--  </section>-->
<!--</template>-->

<!--<script setup lang="ts">-->
<!--import { ref, computed, onMounted } from 'vue'-->
<!--import "../../assets/css/toke-dHero-03.css"-->
<!--import { useUserStore } from '@/composables/userStore'-->
<!--import UserService from '@/service/UserService';-->
<!--import EntriesService from '@/service/EntriesService';-->
<!--import { Data } from '@/utils/interfaces/team.interface';-->
<!--// Utilisation du store-->
<!--const userStore = useUserStore()-->

<!--interface StatData {-->
<!--  value: number-->
<!--  label: string-->
<!--  percentage?: number-->
<!--}-->

<!--interface Stats {-->
<!--  present: StatData-->
<!--  late: StatData-->
<!--  absent: StatData-->
<!--}-->

<!--const stats = ref<Stats>({-->
<!--  present: {-->
<!--    value: 3,-->
<!--    label: 'présents',-->
<!--    percentage: 80-->
<!--  },-->
<!--  late: {-->
<!--    value: 2,-->
<!--    label: 'Retards'-->
<!--  },-->
<!--  absent: {-->
<!--    value: 1,-->
<!--    label: 'Absents'-->
<!--  },-->
<!--})-->
<!--// Ajoutez la prop `loading` pour que le parent puisse contrôler l'état-->
<!--const props = defineProps({-->
<!--  loading: {-->
<!--    type: Boolean,-->
<!--    default: true-->
<!--  }-->
<!--})-->

<!--// Vous devez définir lastUpdate quelque part-->
<!--const lastUpdate = ref('09:30')-->
<!--const selectedDate = ref<Date>(new Date())-->
<!--const subordinates = ref<Data>();-->

<!--const currentDate = computed(() => formatDate(selectedDate.value))-->

<!--const formatDate = (date: Date): string => {-->
<!--  return date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })-->
<!--}-->
<!--const presenceRate = computed(() => {-->
<!--  const total = stats.value.present.value + stats.value.late.value + stats.value.absent.value-->
<!--  return Math.round((stats.value.present.value / total) * 100)-->
<!--})-->

<!--onMounted(async ()=> {-->
<!--  const subordinatesData = await UserService.listAttendance(userStore.user?.guid!);-->
<!--  subordinates.value = subordinatesData.data as Data-->

<!--  console.log('subordinates', subordinates.value.data)-->
<!--  const entriesData = await EntriesService.listEntries(userStore.user?.guid!);-->
<!--  console.log('entriesData', entriesData)-->
<!--})-->
<!--</script>-->
