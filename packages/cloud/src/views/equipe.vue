<template>
  <section class="manager-team">
    <div class="manager-header">
      <div class="manager-profile">
        <div class="manager-avatar">
          <img v-if="currentManager.avatar" :src="currentManager.avatar" :alt="currentManager.name">
          <div v-else class="avatar-placeholder">
            {{ getInitials(currentManager.name) }}
          </div>
        </div>
        <div class="manager-info">
          <h1 class="manager-name">{{ currentManager.name }}</h1>
          <p class="manager-title">{{ currentManager.title }}</p>
          <p class="manager-department">
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
            {{ currentManager.department }}
          </p>
        </div>
      </div>

      <div class="team-overview-stats">
        <div class="overview-card">
          <div class="stat-icon present">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-number">{{ presentCount }}</span>
            <span class="stat-label">Présents</span>
          </div>
        </div>

        <div class="overview-card">
          <div class="stat-icon late">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-number">{{ lateCount }}</span>
            <span class="stat-label">En retard</span>
          </div>
        </div>

        <div class="overview-card">
          <div class="stat-icon absent">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-number">{{ absentCount }}</span>
            <span class="stat-label">Absents</span>
          </div>
        </div>

        <div class="overview-card total">
          <div class="stat-icon">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-number">{{ totalEmployees }}</span>
            <span class="stat-label">Total équipe</span>
          </div>
        </div>
      </div>
    </div>

    <div class="presence-analytics">
      <div class="analytics-header">
        <h2 class="section-title">Analyse des présences - {{ currentDate }}</h2>
        <div class="date-selector">
          <button @click="changeDate(-1)" class="date-btn">
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          <span class="current-date">{{ formatDate(selectedDate) }}</span>
          <button @click="changeDate(1)" class="date-btn" :disabled="isToday">
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="charts-container">
        <div class="main-chart">
          <div class="chart-wrapper">
            <svg viewBox="0 0 200 200" class="donut-chart">
              <circle cx="100" cy="100" r="80" class="chart-bg"></circle>
              <circle
                cx="100"
                cy="100"
                r="80"
                class="chart-segment present"
                :stroke-dasharray="`${presentArc} ${circumference - presentArc}`"
                :stroke-dashoffset="0"
              ></circle>
              <circle
                cx="100"
                cy="100"
                r="80"
                class="chart-segment late"
                :stroke-dasharray="`${lateArc} ${circumference - lateArc}`"
                :stroke-dashoffset="`-${presentArc}`"
              ></circle>
              <circle
                cx="100"
                cy="100"
                r="80"
                class="chart-segment absent"
                :stroke-dasharray="`${absentArc} ${circumference - absentArc}`"
                :stroke-dashoffset="`-${presentArc + lateArc}`"
              ></circle>
            </svg>
            <div class="chart-center-info">
              <span class="center-percentage">{{ attendanceRate }}%</span>
              <span class="center-label">Taux de présence</span>
            </div>
          </div>

          <div class="chart-legend">
            <div class="legend-item">
              <div class="legend-dot present"></div>
              <span class="legend-text">Présents: {{ presentCount }} ({{ Math.round((presentCount/totalEmployees)*100) }}%)</span>
            </div>
            <div class="legend-item">
              <div class="legend-dot late"></div>
              <span class="legend-text">Retards: {{ lateCount }} ({{ Math.round((lateCount/totalEmployees)*100) }}%)</span>
            </div>
            <div class="legend-item">
              <div class="legend-dot absent"></div>
              <span class="legend-text">Absents: {{ absentCount }} ({{ Math.round((absentCount/totalEmployees)*100) }}%)</span>
            </div>
          </div>
        </div>

        <div class="timeline-chart">
          <h3 class="chart-subtitle">Arrivées par tranche horaire</h3>
          <div class="timeline-bars">
            <div v-for="slot in timeSlots" :key="slot.time" class="time-slot">
              <div class="time-bar">
                <div
                  class="bar-fill"
                  :style="{ height: `${(slot.count / maxSlotCount) * 100}%` }"
                ></div>
              </div>
              <span class="time-label">{{ slot.time }}</span>
              <span class="count-label">{{ slot.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="manager-actions">
      <h2 class="section-title">Actions rapides</h2>
      <div class="actions-grid">
        <button @click="showAddEmployee = true" class="action-card primary">
          <div class="action-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
            </svg>
          </div>
          <div class="action-content">
            <h3 class="action-title">Ajouter Employé</h3>
            <p class="action-description">Recruter un nouveau membre dans votre équipe</p>
          </div>
        </button>

        <button @click="showAddSite = true" class="action-card secondary">
          <div class="action-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <div class="action-content">
            <h3 class="action-title">Nouveau Site</h3>
            <p class="action-description">Créer un nouveau site de travail</p>
          </div>
        </button>

        <button @click="generateReport" class="action-card tertiary">
          <div class="action-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <div class="action-content">
            <h3 class="action-title">Rapport d'équipe</h3>
            <p class="action-description">Générer le rapport mensuel</p>
          </div>
        </button>

        <button @click="manageSchedules" class="action-card quaternary">
          <div class="action-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div class="action-content">
            <h3 class="action-title">Planning</h3>
            <p class="action-description">Gérer les horaires de travail</p>
          </div>
        </button>
      </div>
    </div>

<!--    <div class="advanced-filters">-->
<!--      <div class="filter-header">-->
<!--        <h2 class="section-title">Mon équipe ({{ filteredEmployees.length }})</h2>-->
<!--        <div class="filter-controls">-->
<!--          <div class="search-container">-->
<!--            <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>-->
<!--            </svg>-->
<!--            <input-->
<!--              type="text"-->
<!--              v-model="searchTerm"-->
<!--              placeholder="Rechercher par nom, poste, site..."-->
<!--              class="search-input"-->
<!--            >-->
<!--          </div>-->

<!--          <select v-model="statusFilter" class="filter-select">-->
<!--            <option value="">Tous les statuts</option>-->
<!--            <option value="present">Présents</option>-->
<!--            <option value="late">En retard</option>-->
<!--            <option value="absent">Absents</option>-->
<!--          </select>-->

<!--          <select v-model="siteFilter" class="filter-select">-->
<!--            <option value="">Tous les sites</option>-->
<!--            <option v-for="site in managerSites" :key="site.id" :value="site.id">-->
<!--              {{ site.name }}-->
<!--            </option>-->
<!--          </select>-->

<!--          <select v-model="sortBy" class="filter-select">-->
<!--            <option value="name">Trier par nom</option>-->
<!--            <option value="position">Trier par poste</option>-->
<!--            <option value="site">Trier par site</option>-->
<!--            <option value="arrivalTime">Trier par heure</option>-->
<!--          </select>-->
<!--        </div>-->
<!--      </div>-->
<!--    </div>-->

    <div class="team-members">
      <div class="members-grid">
        <div
          v-for="employee in paginatedEmployees"
          :key="employee.id"
          class="member-card"
          :class="[`status-${employee.status}`, { 'has-issues': employee.status !== 'present' }]"
        >
          <div class="member-header">
            <div class="member-avatar">
              <img v-if="employee.avatar" :src="employee.avatar" :alt="employee.name">
              <div v-else class="avatar-placeholder">
                {{ getInitials(employee.name) }}
              </div>
              <div class="status-indicator" :class="employee.status">
                <svg v-if="employee.status === 'present'" class="status-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                <svg v-else-if="employee.status === 'late'" class="status-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
                <svg v-else class="status-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>

            <div class="member-info">
              <h4 class="member-name">{{ employee.name }}</h4>
              <p class="member-position">{{ employee.position }}</p>
              <div class="member-details">
                <span class="detail-item">
                  <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  </svg>
                  {{ employee.siteName }}
                </span>
                <span class="detail-item">
                  <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                  {{ employee.email }}
                </span>
              </div>
            </div>

            <div class="member-actions">
              <button @click="viewEmployeeProfile(employee)" class="action-btn-sm primary">
                <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              </button>
              <button @click="editEmployee(employee)" class="action-btn-sm secondary">
                <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <div class="dropdown" v-if="employee.status !== 'present'">
                <button @click="toggleDropdown(employee.id)" class="action-btn-sm warning">
                  <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                  </svg>
                </button>
                <div v-if="activeDropdown === employee.id" class="dropdown-menu">
                  <button @click="sendReminder(employee)" class="dropdown-item">
                    <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                    Envoyer rappel
                  </button>
                  <button @click="markAsJustified(employee)" class="dropdown-item">
                    <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Marquer justifié
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="member-status-details">
            <div v-if="employee.status === 'present'" class="status-info present">
              <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Arrivé à {{ employee.arrivalTime }}</span>
            </div>

            <div v-else-if="employee.status === 'late'" class="status-info late">
              <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              <span>Retard de {{ employee.lateMinutes }}min (arrivé à {{ employee.arrivalTime }})</span>
            </div>

            <div v-else class="status-info absent">
              <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364L18.364 5.636"></path>
              </svg>
              <span>{{ employee.justified ? 'Absence justifiée' : 'Absence non justifiée' }}</span>
            </div>
          </div>

          <div class="member-performance">
            <div class="performance-metric">
              <span class="metric-label">Ponctualité ce mois</span>
              <div class="performance-bar">
                <div
                  class="performance-fill"
                  :style="{ width: `${employee.punctualityScore}%` }"
                  :class="{
                    'good': employee.punctualityScore >= 90,
                    'average': employee.punctualityScore >= 70 && employee.punctualityScore < 90,
                    'poor': employee.punctualityScore < 70
                  }"
                ></div>
              </div>
              <span class="metric-value">{{ employee.punctualityScore }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button
          @click="changePage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="pagination-btn"
        >
          Précédent
        </button>
        <span class="pagination-info">
          Page {{ currentPage }} sur {{ totalPages }}
        </span>
        <button
          @click="changePage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="pagination-btn"
        >
          Suivant
        </button>
      </div>
    </div>

    <EmployeeModal
      v-if="showAddEmployee"
      @close="showAddEmployee = false"
      @employee-added="handleEmployeeAdded"
      :manager-id="currentManager.id"
      :available-sites="managerSites"
    />

    <SiteModal
      v-if="showAddSite"
      @close="showAddSite = false"
      @site-added="handleSiteAdded"
      :manager-id="currentManager.id"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import "../assets/css/toke-equipe-09.css"
// import EmployeeModal from './EmployeeModal.vue'
// import SiteModal from './SiteModal.vue'

// Interface definitions
interface Manager {
  id: number
  name: string
  title: string
  department: string
  avatar?: string
  email: string
}

interface Employee {
  id: number
  name: string
  position: string
  email: string
  siteId: number
  siteName: string
  managerId: number
  status: 'present' | 'absent' | 'late'
  arrivalTime?: string
  lateMinutes?: number
  justified?: boolean
  avatar?: string
  punctualityScore: number
  hireDate: string
}

interface Site {
  id: number
  name: string
  address: string
  managerId: number
  description: string
}

interface TimeSlot {
  time: string
  count: number
}

// État réactif
const currentManager = ref<Manager>({
  id: 1,
  name: 'Marie Dupont',
  title: 'Manager IT',
  department: 'Département Informatique',
  email: 'marie.dupont@company.com'
})

const employees = ref<Employee[]>([
  {
    id: 1,
    name: 'Jean-Paul Kamdem',
    position: 'Développeur Senior',
    email: 'jp.kamdem@company.com',
    siteId: 1,
    siteName: 'Douala Centre',
    managerId: 1,
    status: 'present',
    arrivalTime: '08:15',
    punctualityScore: 95,
    hireDate: '2023-01-15'
  },
  {
    id: 2,
    name: 'Sarah Mbarga',
    position: 'Analyste Système',
    email: 'sarah.mbarga@company.com',
    siteId: 1,
    siteName: 'Douala Centre',
    managerId: 1,
    status: 'late',
    arrivalTime: '08:45',
    lateMinutes: 15,
    punctualityScore: 78,
    hireDate: '2023-03-10'
  },
  {
    id: 3,
    name: 'Michel Fosso',
    position: 'Chef de Projet',
    email: 'michel.fosso@company.com',
    siteId: 2,
    siteName: 'Yaoundé Tech',
    managerId: 1,
    status: 'absent',
    justified: false,
    punctualityScore: 85,
    hireDate: '2022-11-20'
  },
  {
    id: 4,
    name: 'Christophe Nana',
    position: 'Ingénieur DevOps',
    email: 'c.nana@company.com',
    siteId: 1,
    siteName: 'Douala Centre',
    managerId: 1,
    status: 'present',
    arrivalTime: '08:00',
    punctualityScore: 99,
    hireDate: '2023-05-01'
  },
  {
    id: 5,
    name: 'Linda Ngono',
    position: 'UX/UI Designer',
    email: 'linda.ngono@company.com',
    siteId: 3,
    siteName: 'Bafoussam Innovation Hub',
    managerId: 1,
    status: 'present',
    arrivalTime: '08:25',
    punctualityScore: 92,
    hireDate: '2024-02-28'
  },
  {
    id: 6,
    name: 'Paul Talla',
    position: 'Data Scientist',
    email: 'p.talla@company.com',
    siteId: 2,
    siteName: 'Yaoundé Tech',
    managerId: 1,
    status: 'late',
    arrivalTime: '09:10',
    lateMinutes: 40,
    punctualityScore: 65,
    hireDate: '2023-09-01'
  },
  {
    id: 7,
    name: 'Sophie Nde',
    position: 'Spécialiste Cybersécurité',
    email: 's.nde@company.com',
    siteId: 1,
    siteName: 'Douala Centre',
    managerId: 1,
    status: 'absent',
    justified: true,
    punctualityScore: 98,
    hireDate: '2023-06-05'
  },
])

const sites = ref<Site[]>([
  { id: 1, name: 'Douala Centre', address: '123 Avenue de l\'Indépendance, Douala', managerId: 1, description: 'Siège social' },
  { id: 2, name: 'Yaoundé Tech', address: '456 Boulevard de l\'Innovation, Yaoundé', managerId: 1, description: 'Centre de R&D' },
  { id: 3, name: 'Bafoussam Innovation Hub', address: '789 Rue de la Créativité, Bafoussam', managerId: 1, description: 'Incubateur de startups' }
])

const selectedDate = ref<Date>(new Date())
const searchTerm = ref<string>('')
const statusFilter = ref<'present' | 'absent' | 'late' | ''>('')
const siteFilter = ref<number | ''>('')
const sortBy = ref<string>('name')
const currentPage = ref<number>(1)
const itemsPerPage = 8
const showAddEmployee = ref<boolean>(false)
const showAddSite = ref<boolean>(false)
const activeDropdown = ref<number | null>(null)

// Computed properties
const managerEmployees = computed(() => employees.value.filter(emp => emp.managerId === currentManager.value.id))
const managerSites = computed(() => sites.value.filter(site => site.managerId === currentManager.value.id))

const presentCount = computed(() => managerEmployees.value.filter(e => e.status === 'present').length)
const lateCount = computed(() => managerEmployees.value.filter(e => e.status === 'late').length)
const absentCount = computed(() => managerEmployees.value.filter(e => e.status === 'absent').length)
const totalEmployees = computed(() => managerEmployees.value.length)
const attendanceRate = computed(() => {
  if (totalEmployees.value === 0) return 0
  const presentAndLate = presentCount.value + lateCount.value
  return Math.round((presentAndLate / totalEmployees.value) * 100)
})

const r = 80
const circumference = 2 * Math.PI * r
const presentArc = computed(() => (presentCount.value / totalEmployees.value) * circumference)
const lateArc = computed(() => (lateCount.value / totalEmployees.value) * circumference)
const absentArc = computed(() => (absentCount.value / totalEmployees.value) * circumference)

const isToday = computed(() => {
  const today = new Date()
  return selectedDate.value.toDateString() === today.toDateString()
})

const filteredEmployees = computed(() => {
  let filtered = managerEmployees.value.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      employee.siteName.toLowerCase().includes(searchTerm.value.toLowerCase())

    const matchesStatus = statusFilter.value ? employee.status === statusFilter.value : true
    const matchesSite = siteFilter.value ? employee.siteId === siteFilter.value : true

    return matchesSearch && matchesStatus && matchesSite
  })

  // Sorting
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'position':
        return a.position.localeCompare(b.position)
      case 'site':
        return a.siteName.localeCompare(b.siteName)
      case 'arrivalTime':
        if (!a.arrivalTime || !b.arrivalTime) return 0
        return a.arrivalTime.localeCompare(b.arrivalTime)
      default:
        return 0
    }
  })

  return filtered
})

const totalPages = computed(() => Math.ceil(filteredEmployees.value.length / itemsPerPage))

const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredEmployees.value.slice(start, end)
})

const timeSlots = computed<TimeSlot[]>(() => {
  const slots = [
    { time: '08:00', count: 0 },
    { time: '08:30', count: 0 },
    { time: '09:00', count: 0 },
    { time: '09:30+', count: 0 }
  ]

  const presentEmployees = managerEmployees.value.filter(e => e.status !== 'absent' && e.arrivalTime)

  presentEmployees.forEach(emp => {
    const [hour, minute] = emp.arrivalTime!.split(':').map(Number)
    const totalMinutes = hour * 60 + minute

    if (totalMinutes <= 8 * 60 + 30) {
      slots[0].count++
    } else if (totalMinutes <= 9 * 60) {
      slots[1].count++
    } else if (totalMinutes <= 9 * 60 + 30) {
      slots[2].count++
    } else {
      slots[3].count++
    }
  })

  return slots
})

const maxSlotCount = computed(() => Math.max(...timeSlots.value.map(slot => slot.count), 1))

// Fonctions
const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

const changeDate = (days: number) => {
  const newDate = new Date(selectedDate.value)
  newDate.setDate(newDate.getDate() + days)
  selectedDate.value = newDate
}

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const toggleDropdown = (employeeId: number) => {
  activeDropdown.value = activeDropdown.value === employeeId ? null : employeeId
}

const sendReminder = (employee: Employee) => {
  alert(`Rappel envoyé à ${employee.name} !`)
  activeDropdown.value = null
}

const markAsJustified = (employee: Employee) => {
  employee.justified = true
  alert(`${employee.name} est maintenant marqué comme absent justifié.`)
  activeDropdown.value = null
}

const viewEmployeeProfile = (employee: Employee) => {
  alert(`Afficher le profil de ${employee.name}`)
}

const editEmployee = (employee: Employee) => {
  alert(`Éditer les informations de ${employee.name}`)
}

const generateReport = () => {
  alert('Génération du rapport mensuel...')
}

const manageSchedules = () => {
  alert('Accéder à la gestion des plannings...')
}

const handleEmployeeAdded = (newEmployee: Employee) => {
  employees.value.push(newEmployee)
}

const handleSiteAdded = (newSite: Site) => {
  sites.value.push(newSite)
}

// Watchers
watch(filteredEmployees, () => {
  currentPage.value = 1
})

</script>