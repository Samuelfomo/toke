<template>
  <!-- ══════════════════════════════════════════════════════════════════════
       Page imprimable — /pointages/print
       Styles @media print : pas de header, pagination automatique du navigateur
  ══════════════════════════════════════════════════════════════════════════ -->
  <div class="print-root">

    <!-- ── Bouton d'action (masqué à l'impression) ── -->
    <div class="no-print action-bar">
      <div class="action-bar-inner">
        <div class="action-bar-left">
          <button class="btn-back" @click="router.back()">
            ← Retour
          </button>
          <div class="report-ref-badge">
            <span class="ref-label">Référence :</span>
            <span class="ref-value">{{ reportRef }}</span>
          </div>
        </div>
        <div class="action-bar-right">
          <span v-if="loading" class="loading-label">Chargement des données…</span>
          <span v-else class="entries-count">{{ entries.length }} pointage(s) chargé(s)</span>
          <button class="btn-print" :disabled="loading" @click="handlePrint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimer / Enregistrer en PDF
          </button>
        </div>
      </div>
    </div>

    <!-- ── Chargement ── -->
    <div v-if="loading" class="no-print loading-screen">
      <div class="spinner"></div>
      <p>Génération du rapport en cours…</p>
    </div>

    <!-- ── Erreur ── -->
    <div v-else-if="error" class="no-print error-screen">
      <p>{{ error }}</p>
      <button @click="loadData">Réessayer</button>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════
         DOCUMENT IMPRIMABLE
    ══════════════════════════════════════════════════════════════════════ -->
    <div v-else class="document">

      <!-- ──────────────── NIVEAU 1 : EN-TÊTE ──────────────── -->
      <header class="doc-header">
        <div class="doc-header-left">
          <!-- Logo / Nom organisation -->
          <div class="org-identity">
            <div class="org-logo-placeholder">
              <!-- Si un logo était disponible : <img :src="logoUrl" /> -->
              <span class="org-logo-initials">{{ orgInitials }}</span>
            </div>
            <div>
              <div class="org-name">{{ organizationName }}</div>
              <div class="org-subtitle">Système de gestion des présences</div>
            </div>
          </div>

          <!-- Titre rapport -->
          <div class="report-title-block">
            <h1 class="report-title">Rapport de pointages</h1>
            <div class="report-period">
              Période : <strong>{{ formatDate(filters.startDate) }}</strong>
              &nbsp;→&nbsp;
              <strong>{{ formatDate(filters.endDate) }}</strong>
            </div>
          </div>
        </div>

        <!-- Encart référence (haut droite) -->
        <div class="doc-header-right">
          <div class="ref-card">
            <div class="ref-card-row">
              <span class="ref-card-label">Rapport n°</span>
              <span class="ref-card-value ref-card-accent">{{ reportRef }}</span>
            </div>
            <div class="ref-card-row">
              <span class="ref-card-label">Généré le</span>
              <span class="ref-card-value">{{ generatedAt }}</span>
            </div>
            <div class="ref-card-row">
              <span class="ref-card-label">Par</span>
              <span class="ref-card-value">{{ filters.managerName }}</span>
            </div>
            <div class="ref-card-row">
              <span class="ref-card-label">Fuseau</span>
              <span class="ref-card-value">{{ timezone }}</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Séparateur -->
      <div class="doc-divider"></div>

      <!-- Filtres actifs -->
      <div class="filters-summary">
        <span class="filters-label">Filtres appliqués :</span>
        <span class="filters-value">{{ activeFiltersLabel }}</span>
      </div>

      <!-- ──────────────── NIVEAU 2 : SYNTHÈSE ──────────────── -->
      <section class="stats-section">
        <h2 class="section-title">Synthèse de la période</h2>
        <div class="stats-grid">

          <div class="stat-card">
            <div class="stat-label">Total pointages</div>
            <div class="stat-value">{{ stats.total }}</div>
          </div>

          <div class="stat-card stat-card-blue">
            <div class="stat-label">Standard</div>
            <div class="stat-value stat-blue">{{ stats.standard }}</div>
            <div class="stat-sub">Site connu</div>
          </div>

          <div class="stat-card stat-card-purple">
            <div class="stat-label">Libres</div>
            <div class="stat-value stat-purple">{{ stats.libre }}</div>
            <div class="stat-sub">Site inconnu</div>
          </div>

          <div class="stat-card stat-card-amber">
            <div class="stat-label">Terminal partagé</div>
            <div class="stat-value stat-amber">{{ stats.fallback }}</div>
            <div class="stat-sub">Appareil partagé</div>
          </div>

          <div class="stat-card stat-card-green">
            <div class="stat-label">Avec photo</div>
            <div class="stat-value stat-green">{{ stats.avecPhoto }}</div>
            <div class="stat-sub">{{ stats.total > 0 ? Math.round(stats.avecPhoto / stats.total * 100) : 0 }}% du total</div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Employés uniques</div>
            <div class="stat-value">{{ stats.employes }}</div>
            <div class="stat-sub">Ayant pointé</div>
          </div>

          <div class="stat-card stat-card-wide">
            <div class="stat-label">Premier pointage</div>
            <div class="stat-value stat-sm">{{ stats.first ? formatDateTime(stats.first) : '—' }}</div>
          </div>

          <div class="stat-card stat-card-wide">
            <div class="stat-label">Dernier pointage</div>
            <div class="stat-value stat-sm">{{ stats.last ? formatDateTime(stats.last) : '—' }}</div>
          </div>

        </div>
      </section>

      <!-- ──────────────── NIVEAU 3 : TABLEAU ──────────────── -->
      <section class="table-section">
        <h2 class="section-title">
          Détail des pointages
          <span class="section-count">({{ entries.length }})</span>
        </h2>

        <div v-if="entries.length === 0" class="empty-table">
          Aucun pointage ne correspond aux critères sélectionnés.
        </div>

        <table v-else class="report-table">
          <thead>
          <tr>
            <th class="col-date">Date</th>
            <th class="col-time">Heure</th>
            <th class="col-employee">Employé</th>
            <th class="col-nature">Nature</th>
            <th class="col-type">Type</th>
            <th class="col-site">Site</th>
            <th class="col-source">Source</th>
            <th class="col-photo">Photo</th>
          </tr>
          </thead>
          <tbody>
          <tr
              v-for="(entry, index) in entries"
              :key="entry.guid"
              :class="index % 2 === 0 ? 'row-even' : 'row-odd'"
          >
            <td class="col-date">{{ formatDate(entry.clocked_at) }}</td>
            <td class="col-time td-time">{{ formatTime(entry.clocked_at) }}</td>
            <td class="col-employee">{{ entry.user?.name || '—' }}</td>
            <td class="col-nature">
                <span :class="'nature-badge nature-' + getEntryNature(entry)">
                  {{ getNatureLabel(entry) }}
                </span>
            </td>
            <td class="col-type">{{ getTypeLabel(entry.pointage_type) }}</td>
            <td class="col-site">{{ entry.site?.name || (entry.coordinates ? 'GPS' : '—') }}</td>
            <td class="col-source">{{ getSourceLabel(entry) }}</td>
            <td class="col-photo td-center">
              <span v-if="entry.image_url" class="photo-yes">● Oui</span>
              <span v-else class="photo-no">○ Non</span>
            </td>
          </tr>
          </tbody>
        </table>
      </section>

      <!-- ──────────────── NIVEAU 4 : PIED DE PAGE ──────────────── -->
      <footer class="doc-footer">
        <div class="footer-left">
          <div>Rapport généré automatiquement par <strong>Wame Attendance</strong>.</div>
          <div>Référence : <strong>{{ reportRef }}</strong> — Généré le {{ generatedAt }}</div>
        </div>
        <div class="footer-right">
          <span class="confidential">CONFIDENTIEL — Document à usage interne uniquement</span>
        </div>
      </footer>

    </div><!-- /document -->
  </div><!-- /print-root -->
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import EntriesService from '@/service/EntriesService'
import {
  type PointageEntry,
  type ReportFilters,
  type ReportStats,
  generateReportRef,
  getEntryNature,
  getNatureLabel,
  getTypeLabel,
  getSourceLabel,
  formatDate,
  formatTime,
  formatDateTime,
  computeStats,
  buildActiveFiltersLabel,
} from '@/utils/reportUtils'

// ─── Router / Store ───────────────────────────────────────────────────────────
const route     = useRoute()
const router    = useRouter()
const userStore = useUserStore()

// ─── État ────────────────────────────────────────────────────────────────────
const entries   = ref<PointageEntry[]>([])
const loading   = ref(true)
const error     = ref<string | null>(null)
const reportRef = ref(generateReportRef())

// ─── Métadonnées ─────────────────────────────────────────────────────────────
const generatedAt = new Date().toLocaleString('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
})

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

// ─── Filtres depuis l'URL ─────────────────────────────────────────────────────
const q = route.query
const filters = ref<ReportFilters>({
  startDate       : (q.start       as string) || '',
  endDate         : (q.end         as string) || '',
  nature          : (q.nature      as string) || '',
  type            : (q.type        as string) || '',
  photo           : (q.photo       as string) || '',
  status          : (q.status      as string) || '',
  employeeGuid    : (q.employee    as string) || '',
  employeeName    : '',   // sera rempli après chargement
  managerGuid     : (q.manager     as string) || userStore.user?.guid || '',
  managerName     : userStore.fullName || 'Manager',
  organizationName: (userStore as any).organization?.name || 'Organisation',
})

// ─── Organisation ─────────────────────────────────────────────────────────────
const organizationName = computed(() =>
    (userStore as any).organization?.name || userStore.fullName || 'Organisation'
)

const orgInitials = computed(() => {
  const name = organizationName.value
  return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
})

// ─── Stats ────────────────────────────────────────────────────────────────────
const stats = computed<ReportStats>(() => computeStats(entries.value))

// ─── Filtres actifs (label) ───────────────────────────────────────────────────
const activeFiltersLabel = computed(() => buildActiveFiltersLabel(filters.value))

// ─── Chargement + filtrage client ─────────────────────────────────────────────
const loadData = async () => {
  try {
    loading.value = true
    error.value   = null

    const managerGuid = filters.value.managerGuid
    if (!managerGuid) throw new Error('Manager non identifié')

    const response = await EntriesService.listEntries(managerGuid, {
      startDate: filters.value.startDate || undefined,
      endDate  : filters.value.endDate   || undefined,
    })

    if (!response?.success) throw new Error('Erreur API')

    let data: PointageEntry[] = (response as any).data?.data?.entries || []

    // ── Filtres client ──────────────────────────────────────────────────────
    if (filters.value.employeeGuid) {
      data = data.filter(e => e.user?.guid === filters.value.employeeGuid)
      // Récupérer le nom pour l'affichage
      if (data[0]?.user?.name) filters.value.employeeName = data[0].user.name
    }

    if (filters.value.nature) {
      data = data.filter(e => getEntryNature(e) === filters.value.nature)
    }

    if (filters.value.type) {
      data = data.filter(e => e.pointage_type === filters.value.type)
    }

    if (filters.value.photo === 'with')    data = data.filter(e => !!e.image_url)
    if (filters.value.photo === 'without') data = data.filter(e => !e.image_url)

    if (filters.value.status) {
      data = data.filter(e => e.pointage_status === filters.value.status)
    }

    // Tri chronologique
    entries.value = data.sort(
        (a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime()
    )

  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement'
  } finally {
    loading.value = false
  }
}

const handlePrint = () => window.print()

onMounted(loadData)
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════════════════════
   STYLES — optimisés écran + impression
══════════════════════════════════════════════════════════════════════════════ */

/* Variables */
:root {
  --blue   : #2563eb;
  --purple : #7c3aed;
  --amber  : #d97706;
  --green  : #059669;
  --gray-50: #f8fafc;
  --gray-100:#f1f5f9;
  --gray-200:#e2e8f0;
  --gray-400:#94a3b8;
  --gray-600:#475569;
  --gray-800:#1e293b;
}

.print-root {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  color: var(--gray-800);
  background: #fff;
}

/* ── Barre d'actions (écran uniquement) ─────────────────────────────────── */
.action-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #1e293b;
  padding: 12px 24px;
  border-bottom: 2px solid #334155;
}

.action-bar-inner {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.action-bar-left, .action-bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-back {
  background: transparent;
  border: 1px solid #475569;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all .15s;
}
.btn-back:hover { background: #334155; color: #fff; }

.report-ref-badge {
  background: #334155;
  border: 1px solid #475569;
  border-radius: 8px;
  padding: 4px 12px;
  font-size: 12px;
  color: #94a3b8;
}
.ref-label { margin-right: 6px; }
.ref-value { color: #60a5fa; font-weight: 700; font-family: monospace; }

.entries-count, .loading-label {
  font-size: 12px;
  color: #64748b;
}

.btn-print {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #2563eb;
  color: #fff;
  border: none;
  font-size: 13px;
  font-weight: 700;
  padding: 8px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: background .15s;
}
.btn-print:hover:not(:disabled) { background: #1d4ed8; }
.btn-print:disabled { opacity: .5; cursor: not-allowed; }

.loading-screen, .error-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
  font-size: 14px;
  color: #64748b;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 4px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Document ────────────────────────────────────────────────────────────── */
.document {
  max-width: 1100px;
  margin: 32px auto;
  padding: 48px;
  background: #fff;
  box-shadow: 0 4px 32px rgba(0,0,0,.08);
  border-radius: 12px;
}

/* ── En-tête ─────────────────────────────────────────────────────────────── */
.doc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 32px;
  margin-bottom: 24px;
}

.doc-header-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.org-identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.org-logo-placeholder {
  width: 52px;
  height: 52px;
  background: #2563eb;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.org-logo-initials {
  color: #fff;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -.5px;
}

.org-name {
  font-size: 18px;
  font-weight: 800;
  color: var(--gray-800);
  line-height: 1.2;
}

.org-subtitle {
  font-size: 11px;
  color: var(--gray-400);
  margin-top: 2px;
}

.report-title {
  font-size: 28px;
  font-weight: 900;
  color: var(--gray-800);
  margin: 0 0 6px;
  letter-spacing: -.5px;
}

.report-period {
  font-size: 14px;
  color: var(--gray-600);
}

/* Encart référence */
.ref-card {
  border: 1.5px solid var(--gray-200);
  border-radius: 10px;
  padding: 14px 18px;
  background: var(--gray-50);
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ref-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  font-size: 12px;
}

.ref-card-label {
  color: var(--gray-400);
  font-weight: 600;
  white-space: nowrap;
}

.ref-card-value {
  font-weight: 700;
  color: var(--gray-800);
  text-align: right;
  font-size: 11.5px;
}

.ref-card-accent {
  color: #2563eb;
  font-family: monospace;
  font-size: 13px;
}

.doc-divider {
  height: 2px;
  background: linear-gradient(to right, #2563eb, #7c3aed, transparent);
  border-radius: 2px;
  margin-bottom: 16px;
}

/* Filtres résumé */
.filters-summary {
  font-size: 12px;
  color: var(--gray-400);
  margin-bottom: 28px;
  padding: 8px 14px;
  background: var(--gray-50);
  border-radius: 8px;
  border: 1px solid var(--gray-200);
}
.filters-label { font-weight: 700; margin-right: 6px; }
.filters-value { color: var(--gray-600); }

/* ── Titres de section ────────────────────────────────────────────────────── */
.section-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--gray-800);
  text-transform: uppercase;
  letter-spacing: .8px;
  margin: 0 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-count {
  font-size: 12px;
  font-weight: 400;
  color: var(--gray-400);
  text-transform: none;
  letter-spacing: 0;
}

/* ── Stats ───────────────────────────────────────────────────────────────── */
.stats-section { margin-bottom: 36px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}

.stat-card {
  border: 1px solid var(--gray-200);
  border-radius: 10px;
  padding: 12px 14px;
  background: #fff;
}

.stat-card-wide { grid-column: span 3; }
.stat-card-blue   { border-color: #bfdbfe; background: #eff6ff; }
.stat-card-purple { border-color: #ddd6fe; background: #f5f3ff; }
.stat-card-amber  { border-color: #fde68a; background: #fffbeb; }
.stat-card-green  { border-color: #a7f3d0; background: #ecfdf5; }

.stat-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .6px;
  color: var(--gray-400);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 900;
  color: var(--gray-800);
  line-height: 1;
}

.stat-sm { font-size: 16px; margin-top: 4px; }
.stat-sub { font-size: 10px; color: var(--gray-400); margin-top: 2px; }

.stat-blue   { color: #1d4ed8; }
.stat-purple { color: #6d28d9; }
.stat-amber  { color: #b45309; }
.stat-green  { color: #047857; }

/* ── Tableau ─────────────────────────────────────────────────────────────── */
.table-section { margin-bottom: 36px; }

.empty-table {
  text-align: center;
  padding: 40px;
  color: var(--gray-400);
  font-size: 14px;
  border: 1px dashed var(--gray-200);
  border-radius: 10px;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.report-table th {
  background: var(--gray-800);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .6px;
  padding: 9px 10px;
  text-align: left;
  white-space: nowrap;
}

.report-table th:first-child { border-radius: 6px 0 0 6px; }
.report-table th:last-child  { border-radius: 0 6px 6px 0; }

.report-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--gray-100);
  vertical-align: middle;
  font-size: 12px;
  color: var(--gray-800);
}

.row-even { background: #fff; }
.row-odd  { background: var(--gray-50); }

.td-time { font-family: monospace; font-weight: 700; color: #2563eb; }
.td-center { text-align: center; }

/* Badges nature */
.nature-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.nature-standard { background: #dbeafe; color: #1e40af; }
.nature-libre    { background: #ede9fe; color: #5b21b6; }
.nature-fallback { background: #fef3c7; color: #92400e; }

/* Photo */
.photo-yes { color: #059669; font-weight: 700; font-size: 11px; }
.photo-no  { color: #94a3b8; font-size: 11px; }

/* ── Pied de page ────────────────────────────────────────────────────────── */
.doc-footer {
  border-top: 1px solid var(--gray-200);
  padding-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  font-size: 10.5px;
  color: var(--gray-400);
  line-height: 1.6;
}
.footer-left { display: flex; flex-direction: column; gap: 2px; }
.confidential {
  font-weight: 700;
  color: #ef4444;
  font-size: 10px;
  letter-spacing: .3px;
}

/* ══════════════════════════════════════════════════════════════════════════════
   MEDIA PRINT
══════════════════════════════════════════════════════════════════════════════ */
@media print {
  .no-print { display: none !important; }

  .print-root { background: #fff; }

  .document {
    max-width: 100%;
    margin: 0;
    padding: 20mm 15mm;
    box-shadow: none;
    border-radius: 0;
  }

  /* Pagination automatique */
  .report-table { page-break-inside: auto; }
  .report-table tr { page-break-inside: avoid; page-break-after: auto; }
  .report-table thead { display: table-header-group; }
  .report-table tfoot { display: table-footer-group; }

  /* Pied de page sur chaque page */
  .doc-footer { position: fixed; bottom: 8mm; left: 15mm; right: 15mm; }

  /* Stats grid 4 colonnes en print */
  .stats-grid { grid-template-columns: repeat(4, 1fr); }
  .stat-card-wide { grid-column: span 2; }
}
</style>