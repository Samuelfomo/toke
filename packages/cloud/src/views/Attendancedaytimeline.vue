<template>
  <div class="tl-root">

    <!-- ══ CHIPS RÉSUMÉ ══ -->
<!--    <div class="tl-chips">-->
<!--      <span class="chip chip-status" :class="`chip-${detail.status}`">-->
<!--        {{ getStatusLabel(detail.status) }}-->
<!--      </span>-->
<!--      <span v-if="detail.expected_time" class="chip chip-expected">-->
<!--        ⏰ Prévu : {{ detail.expected_time }}-->
<!--      </span>-->
<!--      <span v-if="detail.work_hours" class="chip chip-hours">-->
<!--        ⏳ {{ detail.work_hours }}h travaillées-->
<!--      </span>-->
<!--      <span v-if="detail.delay_minutes && detail.delay_minutes > 0" class="chip chip-delay">-->
<!--        🔴 Retard : {{ fmtMin(detail.delay_minutes) }}-->
<!--      </span>-->
<!--    </div>-->

    <!-- ══ BANNIÈRE RETARD ══ -->
    <div v-if="detail.delay_minutes && detail.delay_minutes > 0" class="tl-late-banner">
      <div class="tlb-icon">⚠️</div>
      <div class="tlb-content">
        <span class="tlb-title">Arrivée en retard</span>
        <span class="tlb-detail">
<!--          Prévu à <strong>{{ detail.expected_time }}</strong>-->
<!--          — Arrivé à <strong>{{ detail.clock_in_time }}</strong>-->
           Retard de <strong>{{ fmtMin(detail.delay_minutes) }}</strong>
        </span>
      </div>
<!--      <div class="tlb-pill">{{ fmtMin(detail.delay_minutes) }}</div>-->
    </div>

    <!-- ══ PAS DE POINTAGE ══ -->
    <div v-if="!events.length" class="tl-none">Aucun pointage enregistré pour cette journée.</div>

    <!-- ══ SERPENT ══ -->
    <div v-else class="tl-snake">

      <template v-for="(row, ri) in rows" :key="ri">

        <!-- ─── LIGNE HORIZONTALE ─── -->
        <div class="tl-row" :class="{ 'tl-row-odd': ri % 2 === 1 }">

          <!-- Rail + nœuds -->
          <div class="tl-rail">

            <div
                v-for="(ev, ei) in row"
                :key="ev.id"
                class="tl-node"
                :style="{ '--i': ri * 4 + ei }"
            >
              <!-- Heure : AU-DESSUS sur ligne paire, EN-DESSOUS sur ligne impaire -->
              <div class="tl-time" :class="ri % 2 === 0 ? 'pos-top' : 'pos-bottom'">
                {{ ev.time }}
              </div>

              <!-- Bulle -->
              <div
                  class="tl-bubble"
                  :style="{ background: ev.color, boxShadow: `0 4px 16px ${ev.color}60` }"
              >
                {{ ev.icon }}
              </div>

              <!-- Label : EN-DESSOUS sur ligne paire, AU-DESSUS sur ligne impaire -->
              <div class="tl-label" :class="ri % 2 === 0 ? 'pos-bottom' : 'pos-top'">
                {{ ev.label }}
              </div>
            </div>

          </div><!-- /rail -->

        </div><!-- /row -->

        <!-- ─── CONNECTEUR SERPENTIN entre ligne ri et ri+1 ─── -->
        <div
            v-if="ri < rows.length - 1"
            class="tl-arc"
            :class="ri % 2 === 0 ? 'arc-right' : 'arc-left'"
        ></div>

      </template>

    </div><!-- /snake -->

    <!-- ══ LÉGENDE ══ -->
    <div v-if="events.length" class="tl-legend">
      <div v-for="ev in uniqueEvents" :key="ev.key" class="tl-legend-item">
        <span class="tl-legend-dot" :style="{ background: ev.color }"></span>
        <span>{{ ev.label }}</span>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DayDetail {
  date: string;
  status: string;
  expected_time: string | null;
  clock_in_time: string | null;
  clock_out_time: string | null;
  pause_start_time: string | null;
  pause_end_time: string | null;
  mission_start_time: string | null;
  mission_end_time: string | null;
  delay_minutes: number | null;
  work_hours: number | null;
}

// ─── Props ────────────────────────────────────────────────────────────────────
const props = defineProps<{ detail: DayDetail }>();

// ─── Config visuelle ──────────────────────────────────────────────────────────
const CFG: Record<string, { label: string; color: string; icon: string }> = {
  expected:      { label: 'Heure prévue',  color: '#dd6b20', icon: '⏰' },
  clock_in:      { label: 'Arrivée',       color: '#38a169', icon: '🟢' },
  pause_start:   { label: 'Début pause',   color: '#3182ce', icon: '☕' },
  pause_end:     { label: 'Fin pause',     color: '#2b6cb0', icon: '▶️' },
  mission_start: { label: 'Début mission', color: '#805ad5', icon: '🚀' },
  mission_end:   { label: 'Fin mission',   color: '#553c9a', icon: '🏁' },
  clock_out:     { label: 'Départ',        color: '#e53e3e', icon: '🔴' },
};

// ─── Événements triés ─────────────────────────────────────────────────────────
interface TLEvent {
  id: string; key: string; time: string;
  label: string; color: string; icon: string;
}

const events = computed<TLEvent[]>(() => {
  const d = props.detail;
  const raw = [
    { key: 'expected',      time: d.expected_time },
    { key: 'clock_in',      time: d.clock_in_time },
    { key: 'pause_start',   time: d.pause_start_time },
    { key: 'pause_end',     time: d.pause_end_time },
    { key: 'mission_start', time: d.mission_start_time },
    { key: 'mission_end',   time: d.mission_end_time },
    { key: 'clock_out',     time: d.clock_out_time },
  ].filter(e => !!e.time);

  raw.sort((a, b) => (a.time! > b.time! ? 1 : -1));

  return raw.map((e, i) => ({
    id: `${e.key}-${i}`, key: e.key, time: e.time!,
    label: CFG[e.key]?.label ?? e.key,
    color: CFG[e.key]?.color ?? '#718096',
    icon:  CFG[e.key]?.icon  ?? '⚪',
  }));
});

// ─── Découpage en lignes de 4 ─────────────────────────────────────────────────
const rows = computed<TLEvent[][]>(() => {
  const out: TLEvent[][] = [];
  for (let i = 0; i < events.value.length; i += 4) out.push(events.value.slice(i, i + 4));
  return out;
});

// ─── Légende dédupliquée ──────────────────────────────────────────────────────
const uniqueEvents = computed(() =>
    events.value.filter((e, i, a) => a.findIndex(x => x.key === e.key) === i)
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtMin = (m: number) => {
  if (!m || m <= 0) return '0 min';
  const h = Math.floor(m / 60), mn = m % 60;
  return h === 0 ? `${mn} min` : mn === 0 ? `${h}h` : `${h}h${mn.toString().padStart(2, '0')}`;
};

const getStatusLabel = (s: string) => ({
  present: 'Présent', late: 'En retard', absent: 'Absent',
  'off-day': 'Repos', 'on-pause': 'En pause',
  active: 'Actif', mission: 'Mission', external_mission: 'Mission',
}[s] ?? s);
</script>

<style scoped>
/* ════════════════════════════════════
   ROOT
════════════════════════════════════ */
.tl-root {
  padding: 24px 28px 20px;
  background: #f8fafc;
  font-family: 'Segoe UI', system-ui, sans-serif;
  box-sizing: border-box;
}

/* ════════════════════════════════════
   CHIPS
════════════════════════════════════ */
.tl-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 32px; }
.chip {
  display: inline-flex; align-items: center;
  padding: 4px 13px; border-radius: 20px;
  font-size: 12px; font-weight: 600;
  background: #edf2f7; color: #4a5568; white-space: nowrap;
}
.chip-status.chip-present        { background:#c6f6d5; color:#276749; }
.chip-status.chip-late           { background:#feebc8; color:#923b00; }
.chip-status.chip-absent         { background:#fed7d7; color:#9b2c2c; }
.chip-status.chip-on-pause       { background:#bee3f8; color:#2c5282; }
.chip-status.chip-mission,
.chip-status.chip-external_mission { background:#e9d8fd; color:#553c9a; }
.chip-status.chip-active         { background:#b2f5ea; color:#234e52; }
.chip-delay                      { background:#fed7d7; color:#9b2c2c; font-weight:700; }
.chip-expected                   { background:#fefcbf; color:#744210; }
.chip-hours                      { background:#e6fffa; color:#234e52; }

/* ════════════════════════════════════
   BANNIÈRE RETARD
════════════════════════════════════ */
.tl-late-banner {
  display: flex; align-items: center; gap: 12px;
  background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
  border: 1.5px solid #fc8181;
  border-left: 5px solid #e53e3e;
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 24px;
}
.tlb-icon  { font-size: 22px; flex-shrink: 0; }
.tlb-content {
  display: flex; flex-direction: column; gap: 2px; flex: 1;
}
.tlb-title {
  font-size: 12px; font-weight: 800; color: #9b2c2c;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.tlb-detail {
  font-size: 13px; color: #742a2a;
}
.tlb-detail strong { color: #9b2c2c; font-weight: 800; }
.tlb-pill {
  background: #e53e3e; color: white;
  font-size: 13px; font-weight: 800;
  padding: 4px 12px; border-radius: 999px;
  white-space: nowrap; flex-shrink: 0;
}

/* ════════════════════════════════════
   AUCUN POINTAGE
════════════════════════════════════ */
.tl-none { color:#a0aec0; font-style:italic; font-size:13px; padding:8px 0 16px; }

/* ════════════════════════════════════
   SERPENT (colonne flex)
════════════════════════════════════ */
.tl-snake { display: flex; flex-direction: column; }

/* ════════════════════════════════════
   UNE LIGNE
════════════════════════════════════ */
.tl-row {
  /*
    Hauteur suffisante pour :
      - bulle (64px)
      - heure (~20px) + espace au-dessus (12px)
      - label (~14px) + espace en-dessous (12px)
    ≈ 64 + 20 + 12 + 14 + 12 = ~122 → on prend 150px
  */
  height: 150px;
  position: relative;
}

/* Rail horizontal centré verticalement dans la ligne */
.tl-rail {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);

  display: grid;
  grid-template-columns: repeat(4, 1fr); /* toujours 4 colonnes */
  align-items: center;
  justify-items: center;
}
.tl-node {
  grid-column: span 1;
}
/* Ligne de fond */
.tl-rail::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 32px;
  right: 32px;
  height: 4px;
  background: #cbd5e0;
  border-radius: 2px;
  transform: translateY(-50%);
  z-index: 0;
}

/* Ligne impaire : nœuds droite→gauche (sens du serpent) */
.tl-row-odd .tl-rail { flex-direction: row-reverse; }

/* ════════════════════════════════════
   UN NŒUD
════════════════════════════════════ */
.tl-node {
  /* Centre du nœud = centre de la bulle */
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  animation: nodePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: calc(var(--i, 0) * 0.09s);
}
@keyframes nodePop {
  from { opacity: 0; transform: scale(0.2); }
  to   { opacity: 1; transform: scale(1); }
}

/* Bulle */
.tl-bubble {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  border: 3px solid rgba(255,255,255,0.7);
  transition: transform 0.2s;
  cursor: default;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}
.tl-bubble:hover { transform: scale(1.13); }

/* Heure — positionnée PAR RAPPORT AU CENTRE DE LA BULLE */
.tl-time {
  position: absolute;
  font-size: 11px;
  font-weight: 800;
  color: #2d3748;
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 20px;
  padding: 2px 9px;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(0,0,0,0.07);
  z-index: 3;
  left: 50%;
  transform: translateX(-50%);
}
/* AU-DESSUS de la bulle (ligne paire) */
.tl-time.pos-top    { bottom: calc(100% + 8px); top: auto; }
/* EN-DESSOUS de la bulle (ligne impaire) */
.tl-time.pos-bottom { top: calc(100% + 8px); bottom: auto; }

/* Label */
.tl-label {
  position: absolute;
  font-size: 10px;
  font-weight: 700;
  color: #4a5568;
  text-align: center;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  z-index: 3;
  left: 50%;
  transform: translateX(-50%);
}
/* EN-DESSOUS de la bulle (ligne paire) */
.tl-label.pos-bottom { top: calc(100% + 34px); bottom: auto; }
/* AU-DESSUS de la bulle (ligne impaire) */
.tl-label.pos-top    { bottom: calc(100% + 34px); top: auto; }

/* ════════════════════════════════════
   ARC SERPENTIN
   Demi-cercle qui relie la fin d'une
   ligne au début de la suivante.
════════════════════════════════════ */
.tl-arc {
  height: 60px;
  width: 60px;
  border: 4px solid #cbd5e0;
  box-sizing: border-box;
  flex-shrink: 0;
  /* alignement : l'arc doit se coller au rail */
  position: relative;
}

/* Arc côté DROIT (fin de ligne paire) */
.arc-right {
  border-left: none;
  border-top-right-radius: 60px;
  border-bottom-right-radius: 60px;
  align-self: flex-end;
  /* marge = left du rail avant-dernier (≈32px) + position dernier nœud */
  margin-right: 0;
  right: 0;
}

/* Arc côté GAUCHE (fin de ligne impaire) */
.arc-left {
  border-right: none;
  border-top-left-radius: 60px;
  border-bottom-left-radius: 60px;
  align-self: flex-start;
  left: 0;
  margin-left: 0;
}

/* ════════════════════════════════════
   LÉGENDE
════════════════════════════════════ */
.tl-legend {
  display: flex; flex-wrap: wrap; gap: 14px;
  padding-top: 16px; border-top: 1px solid #e2e8f0; margin-top: 16px;
}
.tl-legend-item {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: #4a5568; font-weight: 500;
}
.tl-legend-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }

/* ════════════════════════════════════
   RESPONSIVE
════════════════════════════════════ */
@media (max-width: 600px) {
  .tl-root   { padding: 16px 12px; }
  .tl-row    { height: 120px; }
  .tl-bubble { width: 46px; height: 46px; font-size: 19px; }
  .tl-time   { font-size: 9px; padding: 1px 6px; }
  .tl-label  { font-size: 8px; }
  .tl-arc    { height: 46px; width: 46px; }
  .tl-rail::before { left: 16px; right: 16px; }
}
</style>