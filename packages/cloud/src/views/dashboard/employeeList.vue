<template>
  <section class="absent-section">
    <h3 class="section-title">Pointages des Employés</h3>

    <!-- Header avec bouton toggle -->
    <div class="section-header">
      <button class="toggle-btn" @click="toggleSection">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          :class="{ rotated: !isExpanded }"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
    </div>

    <!-- Liste des absents -->
    <transition name="expand">
      <div v-if="isExpanded" class="absent-list">
        <div
          v-for="employee in absentEmployees"
          :key="employee.guid"
          class="absent-card"
          @click="$emit('employee-click', employee)"
        >
          <div class="left">
            <div class="avatar">
              <img v-if="employee.avatar" :src="employee.avatar" :alt="employee.name" />
              <span v-else class="initials">{{ employee.initials }}</span>
              <span :class="['status-dot', `dot-${employee.statusColor}`]"></span>
            </div>

            <div class="info">
              <strong>{{ employee.name }}</strong>
              <span>{{ employee.job_title }}</span>
            </div>
          </div>

          <div class="right">
<!--            <span class="time">{{ employee.actualTime || employee.expectedTime }}</span>-->
            <span class="status absent">Absent</span>
            <button class="memo-btn" @click.stop="$emit('memo-click', employee)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="9" x2="15" y2="9"/>
                <line x1="9" y1="13" x2="15" y2="13"/>
              </svg>
              Mémo
            </button>
          </div>
        </div>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { TransformedEmployee } from '@/service/UserService';

interface Props {
  employees: TransformedEmployee[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'employee-click': [employee: TransformedEmployee];
  'memo-click': [employee: TransformedEmployee];
}>();

const isExpanded = ref(true);

const absentEmployees = computed(() =>
  props.employees.filter(e => e.status === 'absent')
);

const toggleSection = () => {
  isExpanded.value = !isExpanded.value;
};
</script>

<style scoped>
/* =========================
   Section principale
========================= */

.absent-section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 1.5rem;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04), 0 10px 28px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  min-height: 420px;
  max-height: 700px;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 1rem;
}

/* =========================
   Header avec toggle
========================= */

.section-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.toggle-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s ease;
}

.toggle-btn:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.toggle-btn svg {
  width: 20px;
  height: 20px;
  color: #64748b;
  transition: transform 0.3s ease;
}

.toggle-btn svg.rotated {
  transform: rotate(-180deg);
}

/* =========================
   Liste des employés
========================= */

.absent-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-right: 4px;
}

/* Scrollbar moderne */
.absent-list::-webkit-scrollbar {
  width: 6px;
}

.absent-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 6px;
}

.absent-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* =========================
   Carte employé
========================= */

.absent-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.25s ease;
}

.absent-card:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

/* =========================
   Partie gauche
========================= */

.left {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  flex: 1;
}

.avatar {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.initials {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
}

.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 2px solid white;
}

.dot-present { background: #22c55e; }
.dot-late { background: #f59e0b; }
.dot-absent { background: #ef4444; }
.dot-on-pause { background: #fbbf24; }
.dot-off-day { background: #64748b; }

/* Info employé */
.info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.info strong {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.info span {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* =========================
   Partie droite
========================= */

.right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.time {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  min-width: 50px;
  text-align: center;
}

/* Badge status */
.status {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.status.absent {
  background: #fef2f2;
  color: #b91c1c;
}

.status.present {
  background: #dcfce7;
  color: #166534;
}

.status.late {
  background: #fef3c7;
  color: #92400e;
}

/* Bouton mémo */
.memo-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 6px 10px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
}

.memo-btn:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
  color: #0f172a;
}

.memo-btn svg {
  width: 14px;
  height: 14px;
}

/* =========================
   Animation expand
========================= */

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 1000px;
  opacity: 1;
}

/* =========================
   Responsive
========================= */

@media (max-width: 1024px) {
  .absent-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .right {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 768px) {
  .absent-section {
    padding: 1.25rem;
  }

  .section-title {
    font-size: 1.1rem;
  }

  .absent-card {
    padding: 0.875rem;
  }

  .info strong {
    font-size: 13px;
  }

  .info span {
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .memo-btn span {
    display: none;
  }

  .memo-btn {
    padding: 6px;
  }
}
</style>