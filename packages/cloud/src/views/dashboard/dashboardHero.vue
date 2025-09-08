<template>
  <section class="dashboard-hero">
    <div class="hero-header">
      <div>
        <h1 class="hero-title">Tableau de bord</h1>
        <div class="date-info">
          <div class="current-date">{{ currentDate }}</div>
          <div class="last-update">Dernière mise à jour: {{ lastUpdate }}</div>
        </div>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card stat-present">
        <div class="stat-icon">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.present.value }}/35</div>
          <div class="stat-label">Employés présents</div>
          <div class="stat-percentage">{{ stats.present.percentage }}%</div>
        </div>
      </div>
      <div class="stat-card stat-warning has-issues">
        <div class="stat-icon">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.late.value }}</div>
          <div class="stat-label">Retards</div>
          <div class="stat-detail">Moyenne: 25min</div>
        </div>
      </div>
      <div class="stat-card stat-error has-issues">
        <div class="stat-icon">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.absent.value }}</div>
          <div class="stat-label">Absents</div>
          <div class="stat-detail">Non justifiés: 3</div>
        </div>
      </div>
      <div class="stat-card stat-info">
        <div class="stat-icon">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.activity.value }}</div>
          <div class="stat-label">Dernière activité</div>
          <div class="stat-detail">Paul Mbarga</div>
        </div>
      </div>
    </div>
    <div class="quick-actions">
      <h3 class="actions-title">Actions rapides</h3>
      <div class="actions-grid">
        <a href="#" class="action-btn action-absent">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <span>Gérer les absents ({{ stats.absent.value }})</span>
        </a>
        <a href="#" class="action-btn action-late">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Traiter les retards ({{ stats.late.value }})</span>
        </a>
        <a href="#" class="action-btn">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <span>Exporter le jour</span>
        </a>
      </div>
    </div>
    <div class="presence-progress">
      <div class="progress-header">
        <span class="progress-label">Taux de présence du jour</span>
        <span class="progress-value">{{ presenceRate }}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: presenceRate + '%' }"></div>
      </div>
      <div class="progress-benchmark">
        <span class="benchmark-text">Objectif: 95%</span>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'
import "../../assets/css/toke-dHero-03.css"

interface StatData {
  value: number
  label: string
  percentage?: number
}

interface Stats {
  present: StatData
  late: StatData
  absent: StatData
  activity: StatData
}

const stats = ref<Stats>({
  present: {
    value: 28,
    label: 'présents',
    percentage: 80
  },
  late: {
    value: 3,
    label: 'Retards'
  },
  absent: {
    value: 4,
    label: 'Absents'
  },
  activity: {
    value: 15,
    label: 'Dernière activité'
  }
})

const currentDate = computed(() => {
  const date = new Date()
  return `Vendredi ${date.getDate()} septembre`
})

const presenceRate = computed(() => {
  const total = stats.value.present.value + stats.value.late.value + stats.value.absent.value
  return Math.round((stats.value.present.value / total) * 100)
})
</script>

<style>

</style>