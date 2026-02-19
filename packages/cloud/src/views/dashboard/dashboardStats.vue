<template>
  <section class="dashboard-stats">
    <h3 class="section-title">
      📊 Statistiques de Présence
    </h3>

    <div class="stats-grid">

      <!-- ================= PREMIER DOUGHNUT - PRÉSENTS/ABSENTS ================= -->
      <div class="stats-card">
        <h4 class="card-title">Présence vs Absence</h4>
        <div class="absence-wrapper">
          <div class="doughnut-box">
            <Doughnut :data="presenceAbsenceData" :options="doughnutOptions" />
            <div class="center-text">
              <strong>{{ totalWorkingDay }}</strong>
              <span>Au travail</span>
            </div>
          </div>

          <div class="absence-legend">
            <div class="legend-item">
              <span class="dot present-global"></span>
              <div class="legend-text">
                <span class="legend-label">Présents</span>
                <strong>{{ totalPresent }}</strong>
              </div>
            </div>
            <div class="legend-item">
              <span class="dot absent"></span>
              <div class="legend-text">
                <span class="legend-label">Absents</span>
                <strong>{{ props.summary.total_absences }}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= DEUXIÈME DOUGHNUT - PONCTUALITÉ ================= -->
      <div class="stats-card">
        <h4 class="card-title">Ponctualité</h4>
        <div class="absence-wrapper">
          <div class="doughnut-box">
            <Doughnut :data="punctualityData" :options="doughnutOptions" />
            <div class="center-text">
              <strong>{{ totalPresent }}</strong>
              <span>Présents</span>
            </div>
          </div>

          <div class="absence-legend">
            <div class="legend-item">
              <span class="dot present"></span>
              <div class="legend-text">
                <span class="legend-label">À l'heure</span>
                <strong>{{ props.summary.total_present_on_time }}</strong>
              </div>
            </div>
            <div class="legend-item">
              <span class="dot late"></span>
              <div class="legend-text">
                <span class="legend-label">En retard</span>
                <strong>{{ props.summary.total_late_arrivals }}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= LINE CHART ================= -->
      <div class="stats-card wide">
        <h4 class="card-title">Répartition des Employés par Statut</h4>

        <!-- Résumé rapide -->
        <div class="quick-summary">
          <div class="summary-item">
            <span class="summary-label">Total équipe:</span>
            <strong>{{ totalEmployees }}</strong>
          </div>
          <div class="summary-item">
            <span class="summary-label">Devraient travailler:</span>
            <strong>{{ props.summary.total_expected_workdays }}</strong>
          </div>
          <div class="summary-item">
            <span class="summary-label">Taux de présence:</span>
            <strong class="text-success">{{ attendanceRate }}%</strong>
          </div>
          <div class="summary-item">
            <span class="summary-label">Taux de ponctualité:</span>
            <strong class="text-info">{{ punctualityRate }}%</strong>
          </div>
        </div>

        <div class="chart-container">
          <Line v-if="lineChartData" :data="lineChartData" :options="lineChartOptions as any" />
        </div>
      </div>

    </div>

  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Summary, TransformedEmployee } from '@/service/UserService'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  Filler,
} from 'chart.js'
import { Line, Doughnut } from 'vue-chartjs'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  Filler
)

interface Props {
  summary: Summary
  employees: TransformedEmployee[]
}

const props = defineProps<Props>()

/* ================= CALCULS ================= */

// Total d'employés
const totalEmployees = computed(() => props.summary.total_team_members)

// Total présents (à l'heure + en retard)
const totalPresent = computed(() =>
  props.summary.total_present_on_time + props.summary.total_late_arrivals
)

// Total qui devraient travailler (présents + absents, sans les repos)
const totalWorkingDay = computed(() =>
  props.summary.total_expected_workdays
)

// Taux de présence (parmi ceux qui devraient travailler)
const attendanceRate = computed(() => {
  if (props.summary.total_expected_workdays === 0) return 0
  const presentAndLate = props.summary.total_present_on_time + props.summary.total_late_arrivals
  return Math.round((presentAndLate / props.summary.total_expected_workdays) * 100)
})

// Taux de ponctualité (parmi ceux qui sont présents)
const punctualityRate = computed(() => {
  const totalPres = props.summary.total_present_on_time + props.summary.total_late_arrivals
  if (totalPres === 0) return 0
  return Math.round((props.summary.total_present_on_time / totalPres) * 100)
})

/* ================= COLORS ================= */
const COLORS = {
  present: '#22c55e',        // Vert pour présents à l'heure
  presentGlobal: '#3b82f6',  // Bleu pour présents (global)
  late: '#f59e0b',           // Orange pour retards
  absent: '#ef4444',         // Rouge pour absents
}

/* ================= PREMIER DOUGHNUT - PRÉSENCE/ABSENCE ================= */
const presenceAbsenceData = computed(() => ({
  labels: ['Présents', 'Absents'],
  datasets: [
    {
      data: [
        totalPresent.value,
        props.summary.total_absences
      ],
      backgroundColor: [
        COLORS.presentGlobal,
        COLORS.absent
      ],
      borderWidth: 0,
      hoverOffset: 8
    }
  ]
}))

/* ================= DEUXIÈME DOUGHNUT - PONCTUALITÉ ================= */
const punctualityData = computed(() => ({
  labels: ['À l\'heure', 'En retard'],
  datasets: [
    {
      data: [
        props.summary.total_present_on_time,
        props.summary.total_late_arrivals
      ],
      backgroundColor: [
        COLORS.present,
        COLORS.late
      ],
      borderWidth: 0,
      hoverOffset: 8
    }
  ]
}))

/* ================= OPTIONS COMMUNES DOUGHNUT ================= */
const doughnutOptions = {
  cutout: '70%',
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: '#0f172a',
      padding: 12,
      callbacks: {
        label: function(context: any) {
          const value = context.parsed
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const percentage = total > 0 ? Math.round((value / total) * 100) : 0
          return `${context.label}: ${value} (${percentage}%)`
        }
      }
    }
  }
}

/* ================= LINE CHART DATA ================= */
const lineChartData = computed(() => ({
  labels: ['Présents à l\'heure', 'En retard', 'Absents'],
  datasets: [
    {
      label: 'Évolution des statuts',
      data: [
        props.summary.total_present_on_time,
        props.summary.total_late_arrivals,
        props.summary.total_absences,
        props.summary.total_off_days
      ],

      tension: 0.4,
      borderWidth: 3,
      fill: 'origin',

      /* ===== POINTS ===== */
      pointRadius: 6,
      pointHoverRadius: 8,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointBackgroundColor: [
        COLORS.present,
        COLORS.late,
        COLORS.absent,
        // COLORS.rest
      ],

      /* ===== 🔥 MAGIE ICI - Chaque segment a sa propre couleur ===== */
      segment: {
        borderColor: (ctx: any) => {
          const colors = [
            COLORS.present,
            COLORS.late,
            COLORS.absent,
            // COLORS.rest
          ]
          return colors[ctx.p0DataIndex]
        },

        backgroundColor: (ctx: any) => {
          const colors = [
            COLORS.present,
            COLORS.late,
            COLORS.absent,
            // COLORS.rest
          ]

          const color = colors[ctx.p0DataIndex]

          return `${color}33` // ~20% opacity
        }
      }
    }
  ]
}))


const lineChartOptions = computed(() => {
  const maxValue = Math.max(
    props.summary.total_present_on_time,
    props.summary.total_late_arrivals,
    props.summary.total_absences,
    // props.summary.total_off_days,
    1
  )

  const suggestedMax = Math.ceil(maxValue / 2) * 2

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y
            const total = props.summary.total_team_members
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0
            return `${value} employé${value > 1 ? 's' : ''} (${percentage}%)`
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 12,
            weight: '600'
          }
        }
      },
      y: {
        beginAtZero: true,
        suggestedMax: suggestedMax,
        ticks: {
          precision: 0,
          stepSize: 1,
          font: {
            size: 12
          }
        },
        grid: {
          color: '#f1f5f9'
        }
      }
    }
  }
})

</script>

<style scoped>
.dashboard-stats {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 1.4rem;
}

/* ⬇️ Grid avec 2 doughnuts plus larges */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* 2 colonnes égales */
  gap: 1.5rem;
}

.stats-card {
  background: #fff;
  border-radius: 18px;
  padding: 2rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.06);
  transition: 0.25s ease;
}

.stats-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
}

/* ⬇️ Le line chart prend toute la largeur */
.stats-card.wide {
  padding: 2rem;
  grid-column: span 2;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #0f172a;
}

/* ⬇️ Doughnut plus grand */
.absence-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.doughnut-box {
  position: relative;
  width: 280px;  /* Augmenté de 200px à 280px */
  height: 280px; /* Augmenté de 200px à 280px */
}

.center-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  pointer-events: none;
}

.center-text strong {
  font-size: 2.5rem; /* Augmenté */
  font-weight: 800;
  color: #0f172a;
}

.center-text span {
  font-size: 1rem; /* Augmenté */
  color: #94a3b8;
  font-weight: 500;
}

/* Légende améliorée */
.absence-legend {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  width: 100%;
  max-width: 350px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 10px;
  background: #f8fafc;
}

.legend-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.legend-label {
  font-size: 0.875rem; /* Augmenté */
  color: #64748b;
  font-weight: 500;
}

.legend-item strong {
  font-size: 1.25rem; /* Augmenté */
  color: #0f172a;
  font-weight: 700;
}

.dot {
  width: 16px;  /* Augmenté */
  height: 16px; /* Augmenté */
  border-radius: 50%;
  min-width: 16px;
}

.dot.present { background: #22c55e; }
.dot.present-global { background: #3b82f6; }
.dot.late { background: #f59e0b; }
.dot.absent { background: #ef4444; }
.dot.rest { background: #94a3b8; }

/* Résumé rapide */
.quick-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 12px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-label {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
}

.summary-item strong {
  font-size: 1.25rem;
  color: #0f172a;
  font-weight: 700;
}

.text-success {
  color: #22c55e !important;
}

.text-info {
  color: #3b82f6 !important;
}

/* Chart */
.chart-container {
  height: 300px;
}

/* Responsive */
@media (max-width: 1400px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stats-card.wide {
    grid-column: span 1;
  }
}

@media (max-width: 1200px) {
  .quick-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .doughnut-box {
    width: 240px;
    height: 240px;
  }
}

@media (max-width: 768px) {
  .absence-legend {
    grid-template-columns: 1fr;
  }

  .quick-summary {
    grid-template-columns: 1fr;
  }

  .doughnut-box {
    width: 200px;
    height: 200px;
  }
}
</style>