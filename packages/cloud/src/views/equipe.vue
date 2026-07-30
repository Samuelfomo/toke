<template>
  <div class="min-h-screen bg-gradient-to-r from-[#d0e8f7] via-[#f0e4f5] to-[#d0e8f7] font-['Sora',sans-serif]">
    <Header />

    <main class="max-w-[1400px] mx-auto px-6 py-8">

      <!-- ══ Loading ══════════════════════════════════════════════ -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-40 gap-4">
        <div class="w-10 h-10 border-4 border-[#004AAD]/20 border-t-[#004AAD] rounded-full animate-spin"></div>
        <p class="text-sm text-slate-500 font-medium">Chargement de votre équipe…</p>
      </div>

      <template v-else>

        <!-- ══ Page Header ══════════════════════════════════════════ -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Gestion des équipes</h1>
            <p class="text-sm text-slate-500 mt-1">Gérez vos équipes, managers et suivez la structure organisationnelle.</p>
          </div>
          <div class="flex items-center gap-3">
            <button
                @click="navigateToAddEmployee"
                class="inline-flex items-center gap-2 px-5 py-2.5 bg-[#004AAD] hover:bg-[#003a8c] text-white text-sm font-semibold rounded-xl shadow-md shadow-[#004AAD]/20 transition-all duration-150 active:scale-95"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
              </svg>
              Nouvel employé
            </button>
            <button class="w-9 h-9 lg:flex hidden items-center justify-center rounded-xl bg-white/70 border border-white/60 text-slate-500 hover:bg-white transition-colors shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
              </svg>
            </button>
          </div>
        </div>

        <div
            v-if="teamStore.flash"
            role="status"
            aria-live="polite"
            class="mb-6 flex items-start gap-3 rounded-2xl border p-4 shadow-sm"
            :class="{
              'bg-emerald-50 border-emerald-200 text-emerald-800': teamStore.flash.type === 'success',
              'bg-amber-50 border-amber-200 text-amber-900': teamStore.flash.type === 'warning',
              'bg-rose-50 border-rose-200 text-rose-800': teamStore.flash.type === 'error',
            }"
        >
          <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              class="shrink-0 mt-0.5"
          >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                :d="teamStore.flash.type === 'success'
                  ? 'M5 13l4 4L19 7'
                  : 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'"
            />
          </svg>

          <div class="flex-1">
            <p class="text-sm font-bold">{{ teamStore.flash.title }}</p>
            <p class="text-sm mt-0.5 opacity-90">{{ teamStore.flash.message }}</p>
          </div>

          <button
              type="button"
              class="text-current opacity-60 hover:opacity-100"
              aria-label="Fermer la notification"
              @click="teamStore.clearFlash()"
          >
            ×
          </button>
        </div>

        <!-- ══ KPI Cards ════════════════════════════════════════════ -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <!-- Équipes -->
          <div class="bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl p-5 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <div class="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <span class="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+2 ce mois</span>
            </div>
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Équipes</p>
            <p class="text-3xl font-bold text-slate-900">{{ groupCount }}</p>
          </div>

          <!-- Managers -->
          <div class="bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl p-5 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              </div>
              <span class="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+3 ce mois</span>
            </div>
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Managers</p>
            <p class="text-3xl font-bold text-slate-900">{{ summary?.sub_managers_count ?? 0 }}</p>
          </div>

          <!-- Membres -->
          <div class="bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl p-5 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-[#004AAD]">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
              </div>
              <span class="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+18 ce mois</span>
            </div>
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Membres</p>
            <p class="text-3xl font-bold text-slate-900">{{ summary?.total_employees ?? 0 }}</p>
          </div>

          <!-- Sous-équipes -->
          <div class="bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl p-5 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"/>
                </svg>
              </div>
              <span class="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+4 ce mois</span>
            </div>
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Sous-équipes</p>
            <p class="text-3xl font-bold text-slate-900">{{ subTeamCount }}</p>
          </div>

          <!-- Membres actifs -->
          <div class="bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl p-5 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <div class="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Membres actifs</p>
            <p class="text-3xl font-bold text-slate-900">{{ summary?.direct_employees ?? 0 }}</p>
            <div class="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                  class="h-full bg-violet-500 rounded-full transition-all duration-500"
                  :style="{ width: activePercent + '%' }"
              ></div>
            </div>
            <p class="text-[10px] text-slate-400 mt-1">{{ activePercent }}% du total</p>
          </div>
        </div>

        <!-- ══ Toolbar ═══════════════════════════════════════════════ -->
        <div class="bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl shadow-sm overflow-hidden">

          <div class="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-100">
            <!-- Search -->
            <div class="relative flex-1 min-w-[200px] max-w-xs">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                  type="text"
                  v-model="searchTerm"
                  placeholder="Rechercher une équipe…"
                  class="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/30 transition-all placeholder:text-slate-400"
              />
            </div>

            <!-- Statut filter -->
            <div class="relative">
              <select
                  v-model="filterStatus"
                  class="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/30 cursor-pointer text-slate-700 font-medium transition-all"
              >
                <option value="">Statut : Tous</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
              <svg class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>

            <!-- Département filter -->
            <div class="relative">
              <select
                  v-model="filterDepartment"
                  class="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/30 cursor-pointer text-slate-700 font-medium transition-all"
              >
                <option value="">Département : Tous</option>
                <option v-for="dep in availableDepartments" :key="dep" :value="dep">{{ dep }}</option>
              </select>
              <svg class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>

            <!-- Spacer -->
            <div class="flex-1"></div>

            <!-- View toggles -->
            <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                  @click="viewMode = 'list'"
                  :class="viewMode === 'list' ? 'bg-white text-[#004AAD] shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                  class="w-8 h-7 flex items-center justify-center rounded-lg transition-all"
                  title="Vue liste"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                </svg>
              </button>
              <button
                  :class="'text-slate-400 cursor-not-allowed'"
                  class="w-8 h-7 flex items-center justify-center rounded-lg transition-all"
                  title="Vue grille (bientôt disponible)"
                  disabled
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                </svg>
              </button>
              <button
                  :class="'text-slate-400 cursor-not-allowed'"
                  class="w-8 h-7 flex items-center justify-center rounded-lg transition-all"
                  title="Organigramme (bientôt disponible)"
                  disabled
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm2 8a2 2 0 00-2 2v2a2 2 0 002 2h4a2 2 0 002-2v-2a2 2 0 00-2-2H5zm10 0a2 2 0 00-2 2v2a2 2 0 002 2h4a2 2 0 002-2v-2a2 2 0 00-2-2h-4z"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- ══ Table Header ════════════════════════════════════════ -->
          <div class="grid grid-cols-[2.5fr_1.8fr_1fr_1.2fr_1fr_1fr_88px] gap-4 px-6 py-3 bg-slate-50/80 border-b border-slate-100">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Équipe</span>
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Responsable(s)</span>
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Structure</span>
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Membres</span>
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</span>
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</span>
          </div>

          <!-- ══ Empty States ════════════════════════════════════════ -->
          <div v-if="rawData === null" class="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
            <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div>
              <p class="font-semibold text-slate-700">Aucune équipe trouvée</p>
              <p class="text-sm text-slate-500 mt-1">Commencez par ajouter des employés à votre équipe.</p>
            </div>
            <button
                @click="navigateToAddEmployee"
                class="inline-flex items-center gap-2 px-4 py-2 bg-[#004AAD] text-white text-sm font-semibold rounded-xl hover:bg-[#003a8c] transition-colors"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
              Ajouter un employé
            </button>
          </div>

          <div v-else-if="filteredRows.length === 0" class="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <div>
              <p class="font-semibold text-slate-700">Aucun résultat</p>
              <p class="text-sm text-slate-500 mt-1">Aucun élément ne correspond à vos filtres.</p>
            </div>
            <button @click="clearFilters" class="text-sm text-[#004AAD] font-semibold hover:underline">Réinitialiser les filtres</button>
          </div>

          <!-- ══ Table Rows ══════════════════════════════════════════ -->
          <template v-else>
            <template v-for="row in paginatedRows" :key="row.key">

              <!-- ── Groupe / Sans-groupe / Sous-équipe row ─── -->
              <div
                  class="grid grid-cols-[2.5fr_1.8fr_1fr_1.2fr_1fr_1fr_88px] gap-4 items-center px-6 py-4 border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors duration-100 cursor-pointer group"
                  :class="{ 'pl-12': row.isSubTeam }"
                  @click="row.isExpandable ? toggleExpand(row.key) : viewEmployee(row.employeeGuid)"
              >
                <!-- Équipe col -->
                <div class="flex items-center gap-3 min-w-0">
                  <!-- Expand chevron -->
                  <button
                      v-if="row.isExpandable"
                      @click.stop="toggleExpand(row.key)"
                      :class="expandedRows.has(row.key) ? 'rotate-90' : ''"
                      class="shrink-0 w-5 h-5 flex items-center justify-center text-slate-400 transition-transform duration-200"
                  >
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                  <div v-else-if="row.isSubTeam" class="shrink-0 w-5 h-5 flex items-center justify-center">
                    <span class="w-2 h-2 rounded-full" :class="row.dotColor ?? 'bg-indigo-400'"></span>
                  </div>
                  <div v-else class="shrink-0 w-5"></div>

                  <!-- Avatar or icon -->
                  <div
                      v-if="row.avatar"
                      class="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-white shadow-sm shrink-0"
                  >
                    <img :src="row.avatar" :alt="row.name" class="w-full h-full object-cover"/>
                  </div>
                  <div
                      v-else
                      class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-2 ring-white shadow-sm"
                      :class="row.iconBg ?? 'bg-indigo-100'"
                  >
                    <svg v-if="!row.initials" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" :class="row.iconColor ?? 'text-indigo-500'">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <span v-else class="text-xs font-bold" :class="row.iconColor ?? 'text-indigo-600'">{{ row.initials }}</span>
                  </div>

                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-slate-900 truncate">{{ row.name }}</p>
                    <p class="text-xs text-slate-500 truncate">{{ row.subtitle }}</p>
                  </div>
                </div>

                <!-- Responsable col -->
                <div class="flex items-center gap-2.5 min-w-0">
                  <div v-if="row.managerAvatar" class="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                    <img :src="row.managerAvatar" :alt="row.managerName" class="w-full h-full object-cover"/>
                  </div>
                  <div v-else-if="row.managerName" class="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                    <span class="text-[10px] font-bold text-slate-600">{{ row.managerInitials }}</span>
                  </div>
                  <div v-if="row.managerName" class="min-w-0">
                    <p class="text-sm font-semibold text-slate-800 truncate">{{ row.managerName }}</p>
                    <p class="text-xs text-slate-500 truncate">{{ row.managerTitle ?? '—' }}</p>
                  </div>
                  <span v-else class="text-sm text-slate-400">—</span>
                </div>

                <!-- Structure col -->
                <div>
                  <span v-if="row.structureLabel" class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg" :class="row.structureClass">
                    {{ row.structureLabel }}
                  </span>
                  <span v-else class="text-sm text-slate-400">—</span>
                </div>

                <!-- Membres col -->
                <div class="flex items-center gap-2">
                  <div class="flex -space-x-2">
                    <div
                        v-for="(m, idx) in (row.memberAvatars ?? []).slice(0, 3)"
                        :key="idx"
                        class="w-7 h-7 rounded-full ring-2 ring-white overflow-hidden bg-slate-200 shrink-0"
                    >
                      <img v-if="m" :src="m" class="w-full h-full object-cover" alt="icon"/>
                      <div v-else class="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400"></div>
                    </div>
                  </div>
                  <span v-if="(row.memberCount ?? 0) > 3" class="text-xs font-semibold text-[#004AAD] bg-blue-50 px-2 py-0.5 rounded-full">
                    +{{ (row.memberCount ?? 0) - 3 }}
                  </span>
                  <div v-if="row.memberCount !== undefined" class="ml-1 text-xs text-slate-500">
                    <div class="flex items-center gap-1">
                      <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="text-slate-400"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                      {{ row.managerCountLabel }}
                    </div>
                    <div class="flex items-center gap-1 mt-0.5">
                      <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="text-slate-400"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      {{ row.employeeCountLabel }}
                    </div>
                  </div>
                </div>

                <!-- Statut col -->
                <div>
                  <span
                      :class="row.active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                  >
                    <span :class="row.active !== false ? 'bg-emerald-400' : 'bg-slate-400'" class="w-1.5 h-1.5 rounded-full"></span>
                    {{ row.active !== false ? 'Active' : 'Inactive' }}
                  </span>
                </div>

                <!-- Actions col -->
                <div class="flex items-center justify-center gap-1" @click.stop>
                  <button
                      v-if="row.employeeGuid"
                      @click.stop="viewEmployee(row.employeeGuid)"
                      class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#004AAD] transition-colors"
                      title="Voir le profil"
                  >
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  </button>
                  <button
                      v-if="row.isExpandable && !row.employeeGuid"
                      @click.stop="toggleExpand(row.key)"
                      :class="expandedRows.has(row.key) ? 'bg-blue-50 text-[#004AAD]' : 'text-slate-400 hover:bg-slate-100 hover:text-[#004AAD]'"
                      class="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                      :title="expandedRows.has(row.key) ? 'Masquer les membres' : 'Voir les membres'"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
                      <path d="M8 11L12 15L16 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <button
                      v-if="row.employeeGuid"
                      @click.stop="toggleRowMenu(row.key, $event)"
                      :class="{ 'bg-slate-100': activeRowMenu === row.key }"
                      class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- ── Membres expandés du groupe avec pagination locale ─── -->
              <template v-if="row.isExpandable && expandedRows.has(row.key)">

                <!-- Lignes membres (paginées) -->
                <div
                    v-for="emp in getGroupPage(row)"
                    :key="emp.guid"
                    @click="viewEmployee(emp.guid)"
                    class="grid grid-cols-[2.5fr_1.8fr_1fr_1.2fr_1fr_1fr_88px] gap-4 items-center pl-20 pr-6 py-3 border-b border-slate-100 last:border-0 bg-slate-50/50 hover:bg-blue-50/20 cursor-pointer transition-colors"
                >
                  <!-- Employé -->
                  <div class="flex items-center gap-3 min-w-0">
                    <div v-if="emp.avatar_url" class="w-8 h-8 rounded-lg overflow-hidden shrink-0 ring-2 ring-white shadow-sm">
                      <img :src="emp.avatar_url" :alt="emp.first_name" class="w-full h-full object-cover"/>
                    </div>
                    <div v-else class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#004AAD]/15 to-[#004AAD]/30 flex items-center justify-center shrink-0 ring-2 ring-white shadow-sm">
                      <span class="text-[10px] font-bold text-[#004AAD]">{{ initials(emp.first_name, emp.last_name) }}</span>
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-slate-800 truncate">{{ emp.first_name }} {{ emp.last_name }}</p>
                      <p class="text-xs text-slate-500 truncate">{{ emp.email }}</p>
                    </div>
                  </div>

                  <!-- Département -->
                  <div class="min-w-0">
                    <p class="text-sm text-slate-700 truncate">{{ emp.department || '—' }}</p>
                    <p class="text-xs text-slate-500 truncate">{{ emp.job_title || '—' }}</p>
                  </div>

                  <!-- Planning -->
                  <div>
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md" :class="planningBadge(emp.assignment_info?.current_type)">
                      {{ planningLabel(emp.assignment_info?.current_type) }}
                    </span>
                  </div>

                  <!-- Membre count (vide sur ligne individuelle) -->
                  <div></div>

                  <!-- Statut -->
                  <div>
                    <span
                        :class="emp.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'"
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                    >
                      <span :class="emp.active ? 'bg-emerald-400' : 'bg-slate-400'" class="w-1.5 h-1.5 rounded-full"></span>
                      {{ emp.active ? 'Actif' : 'Inactif' }}
                    </span>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center justify-center gap-1" @click.stop>
                    <button
                        @click.stop="viewEmployee(emp.guid)"
                        class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-[#004AAD] transition-colors"
                    >
                      <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    </button>
                    <button
                        @click.stop="sendMemoToEmployee(emp)"
                        class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-violet-600 transition-colors"
                        title="Envoyer un mémo"
                    >
                      <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                      </svg>
                    </button>
                    <button
                        @click.stop="editEmployee(emp)"
                        class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 transition-colors"
                    >
                      <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- ── Pagination locale du groupe ── -->
                <div
                    v-if="(row.members?.length ?? 0) > GROUP_PAGE_SIZE"
                    class="flex items-center justify-between pl-20 pr-6 py-2.5 bg-slate-50/80 border-b border-slate-100"
                >
                  <!-- Info -->
                  <span class="text-xs text-slate-400">
                    {{ groupRangeStart(row) }}–{{ groupRangeEnd(row) }}
                    sur {{ row.members?.length ?? 0 }} membre{{ (row.members?.length ?? 0) > 1 ? 's' : '' }}
                  </span>

                  <!-- Boutons -->
                  <div class="flex items-center gap-1">
                    <!-- Précédent -->
                    <button
                        @click.stop="setGroupPage(row.key, getGroupCurrentPage(row.key) - 1)"
                        :disabled="getGroupCurrentPage(row.key) === 1"
                        class="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500
                               hover:bg-white hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none
                               transition-colors bg-white"
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                      </svg>
                    </button>

                    <!-- Numéros -->
                    <template v-for="p in getGroupVisiblePages(row)" :key="p">
                      <span
                          v-if="p === '...'"
                          class="w-7 h-7 flex items-center justify-center text-xs text-slate-400"
                      >…</span>
                      <button
                          v-else
                          @click.stop="setGroupPage(row.key, p as number)"
                          class="w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-semibold transition-colors"
                          :class="p === getGroupCurrentPage(row.key)
                            ? 'bg-[#004AAD] text-white border-[#004AAD]'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
                      >
                        {{ p }}
                      </button>
                    </template>

                    <!-- Suivant -->
                    <button
                        @click.stop="setGroupPage(row.key, getGroupCurrentPage(row.key) + 1)"
                        :disabled="getGroupCurrentPage(row.key) === getGroupTotalPages(row)"
                        class="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500
                               hover:bg-white hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none
                               transition-colors bg-white"
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                  </div>
                </div>

              </template>

            </template>

            <!-- ══ Pagination principale ══════════════════════════════ -->
            <div v-if="totalPages > 1" class="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-black/5">
              <span class="text-sm text-slate-500">
                Affichage {{ (currentPage - 1) * itemsPerPage + 1 }} à {{ Math.min(currentPage * itemsPerPage, filteredRows.length) }} sur {{ filteredRows.length }}
              </span>
              <div class="flex items-center gap-1.5">
                <button
                    @click="changePage(currentPage - 1)"
                    :disabled="currentPage === 1"
                    class="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <button
                    v-for="page in pageNumbers"
                    :key="page"
                    @click="changePage(page)"
                    :class="page === currentPage ? 'bg-[#004AAD] text-white border-[#004AAD]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'"
                    class="w-8 h-8 rounded-lg border text-sm font-semibold transition-colors"
                >
                  {{ page }}
                </button>
                <button
                    @click="changePage(currentPage + 1)"
                    :disabled="currentPage === totalPages"
                    class="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>
          </template>

        </div>
      </template>
    </main>

    <Footer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Header from '../views/components/header.vue'
import Footer from '../views/components/footer.vue'
import HeadBuilder from '@/utils/HeadBuilder'
import { useUserStore } from '@/stores/userStore'
import { useEmployee } from '@/utils/useEmployee'
import { useTeamStore } from '@/stores/teamStore'
import type { Employee, EmployeesWithoutGroup, EmployeesWithoutGroup2 } from '@/utils/interfaces/equipe.interface'

// ── Stores ────────────────────────────────────────────────────────────
const userStore = useUserStore()
const employeeStore = useEmployee()
const router = useRouter()
const teamStore = useTeamStore()

// ── State ─────────────────────────────────────────────────────────────
const isLoading = computed(() => teamStore.isLoading)
const rawData = computed(() => teamStore.rawData)
const summary = computed(() => rawData.value?.summary ?? null)

const searchTerm = ref('')
const filterStatus = ref('')
const filterDepartment = ref('')
const viewMode = ref<'list' | 'grid' | 'org'>('list')
const currentPage = ref(1)
const itemsPerPage = 10
const expandedRows = ref<Set<string>>(new Set())

// ── Pagination locale par groupe ──────────────────────────────────────
// 5 membres par page à l'intérieur d'un groupe expansé
const GROUP_PAGE_SIZE = 5

// Map : row.key → page courante (1-indexed)
const groupPages = ref<Map<string, number>>(new Map())

const getGroupCurrentPage = (key: string): number =>
    groupPages.value.get(key) ?? 1

const setGroupPage = (key: string, page: number) => {
  groupPages.value = new Map(groupPages.value).set(key, page)
}

const getGroupTotalPages = (row: TableRow): number =>
    Math.max(1, Math.ceil((row.members?.length ?? 0) / GROUP_PAGE_SIZE))

const getGroupPage = (row: TableRow) => {
  const page = getGroupCurrentPage(row.key)
  const start = (page - 1) * GROUP_PAGE_SIZE
  return (row.members ?? []).slice(start, start + GROUP_PAGE_SIZE)
}

const groupRangeStart = (row: TableRow): number => {
  const page = getGroupCurrentPage(row.key)
  return (row.members?.length ?? 0) === 0 ? 0 : (page - 1) * GROUP_PAGE_SIZE + 1
}

const groupRangeEnd = (row: TableRow): number =>
    Math.min(getGroupCurrentPage(row.key) * GROUP_PAGE_SIZE, row.members?.length ?? 0)

const getGroupVisiblePages = (row: TableRow): (number | '...')[] => {
  const total = getGroupTotalPages(row)
  const current = getGroupCurrentPage(row.key)

  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

// Reset page locale quand on ferme un groupe
const toggleExpand = (key: string) => {
  if (expandedRows.value.has(key)) {
    expandedRows.value.delete(key)
    // Reset à la page 1 pour la prochaine ouverture
    groupPages.value = new Map(groupPages.value)
    groupPages.value.delete(key)
  } else {
    expandedRows.value.add(key)
  }
}

// ── Context Menu ──────────────────────────────────────────────────────
const activeRowMenu = ref<string | null>(null)
const activeRowData = ref<TableRow | null>(null)
const rowMenuPosition = ref<Record<string, string>>({})

// ── Helpers ───────────────────────────────────────────────────────────
const initials = (first: string, last: string) =>
    `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}`

const planningLabel = (type?: string) => {
  if (type === 'rotation') return 'Rotation'
  if (type === 'schedule') return 'Fixe'
  return 'Non défini'
}

const planningBadge = (type?: string) => {
  if (type === 'rotation') return 'bg-violet-50 text-violet-700'
  if (type === 'schedule') return 'bg-blue-50 text-blue-700'
  return 'bg-slate-100 text-slate-500'
}

// ── Row model ─────────────────────────────────────────────────────────
interface TableRow {
  key: string
  name: string
  subtitle: string
  avatar?: string | null
  initials?: string
  iconBg?: string
  iconColor?: string
  managerName?: string
  managerInitials?: string
  managerAvatar?: string | null
  managerTitle?: string
  structureLabel?: string
  structureClass?: string
  memberCount?: number
  memberAvatars?: (string | null)[]
  managerCountLabel?: string
  employeeCountLabel?: string
  active?: boolean
  isExpandable: boolean
  isSubTeam: boolean
  dotColor?: string
  members?: (Employee | EmployeesWithoutGroup | EmployeesWithoutGroup2)[]
  employeeGuid?: string
  department?: string
}

// ── Build rows from rawData ───────────────────────────────────────────
const allRows = computed((): TableRow[] => {
  if (!rawData.value) return []

  const rows: TableRow[] = []

  // 1. Groupes avec leurs membres — dédoublonnage par group.guid
  const groupMap = new Map<string, { group: any, employees: Employee[] }>()

  rawData.value.employees_by_group?.forEach((groupData) => {
    const guid = groupData.group.guid
    if (!groupMap.has(guid)) {
      groupMap.set(guid, { group: groupData.group, employees: [] })
    }
    const existing = groupMap.get(guid)!
    const incoming = groupData.employees ?? []
    incoming.forEach(emp => {
      if (!existing.employees.find(e => e.guid === emp.guid)) {
        existing.employees.push(emp)
      }
    })
  })

  const groupColors = [
    { bg: 'bg-indigo-100', color: 'text-indigo-600' },
    { bg: 'bg-emerald-100', color: 'text-emerald-600' },
    { bg: 'bg-amber-100', color: 'text-amber-600' },
    { bg: 'bg-rose-100', color: 'text-rose-600' },
    { bg: 'bg-sky-100', color: 'text-sky-600' },
  ]

  Array.from(groupMap.values()).forEach(({ group, employees }, idx) => {
    const members = employees
    const managerEmp = members.find(e =>
            Array.isArray(e.roles) && e.roles.some((r: any) =>
                r.code?.toLowerCase().includes('manager') ||
                r.name?.toLowerCase().includes('manager') ||
                r.name?.toLowerCase().includes('responsable')
            )
    ) ?? members[0]

    const c = groupColors[idx % groupColors.length]

    rows.push({
      key: `group-${group.guid}`,
      name: group.name,
      subtitle: 'Aucune équipe parente',
      iconBg: c.bg,
      iconColor: c.color,
      managerName: managerEmp
          ? `${managerEmp.first_name} ${managerEmp.last_name}`.trim()
          : '—',
      managerInitials: managerEmp
          ? initials(managerEmp.first_name, managerEmp.last_name)
          : '—',
      managerAvatar: managerEmp?.avatar_url ?? null,
      managerTitle: managerEmp?.job_title ?? '—',
      structureLabel: 'Groupe',
      structureClass: 'bg-indigo-50 text-indigo-700',
      memberCount: members.length,
      memberAvatars: members.slice(0, 4).map(e => e.avatar_url ?? null),
      managerCountLabel: `${members.filter(e => Array.isArray(e.roles) && e.roles.some((r: any) => r.name?.toLowerCase().includes('manager'))).length} manager(s)`,
      employeeCountLabel: `${members.length} employé(s)`,
      active: members.some(e => e.active),
      isExpandable: members.length > 0,
      isSubTeam: false,
      members,
      department: members[0]?.department,
    })
  })

  // 2. Membres sans groupe (directs)
  const withoutGroup = rawData.value.employees_without_group ?? []
  if (withoutGroup.length > 0) {
    rows.push({
      key: 'no-group',
      name: 'Sans groupe',
      subtitle: 'Membres directs sans affectation de groupe',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-500',
      structureLabel: 'Direct',
      structureClass: 'bg-slate-100 text-slate-600',
      memberCount: withoutGroup.length,
      memberAvatars: withoutGroup.slice(0, 4).map(e => e.avatar_url ?? null),
      managerCountLabel: `0 manager(s)`,
      employeeCountLabel: `${withoutGroup.length} employé(s)`,
      active: withoutGroup.some(e => e.active),
      isExpandable: true,
      isSubTeam: false,
      members: withoutGroup,
    })
  }

  // 3. Sous-équipes
  const dotColors = ['bg-blue-400', 'bg-violet-400', 'bg-emerald-400', 'bg-amber-400']
  rawData.value.sub_teams?.forEach((sub, idx) => {
    const subMembers = sub.employees_without_group ?? []
    const subSummary = sub.summary

    const resolvedManager = teamStore.employees.find(e => e.guid === sub.supervisor)
    const managerName = resolvedManager
        ? `${resolvedManager.firstName} ${resolvedManager.lastName}`.trim()
        : sub.supervisor
            ? `...${sub.supervisor.slice(-8)}`
            : '—'
    const managerInitialsVal = resolvedManager
        ? initials(resolvedManager.firstName, resolvedManager.lastName)
        : sub.supervisor?.slice(0, 2).toUpperCase() ?? '—'

    rows.push({
      key: `sub-${sub.supervisor}-${idx}`,
      name: resolvedManager
          ? `Équipe de ${resolvedManager.firstName} ${resolvedManager.lastName}`
          : `Sous-équipe ${idx + 1}`,
      subtitle: 'Sous-équipe',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-500',
      managerName,
      managerInitials: managerInitialsVal,
      managerAvatar: resolvedManager?.avatar ?? null,
      managerTitle: resolvedManager?.jobTitle ?? '—',
      structureLabel: 'Sous-équipe',
      structureClass: 'bg-orange-50 text-orange-700',
      memberCount: subSummary.total_employees,
      memberAvatars: subMembers.slice(0, 4).map(e => e.avatar_url ?? null),
      managerCountLabel: `${subSummary.sub_managers_count} manager(s)`,
      employeeCountLabel: `${subSummary.direct_employees} employé(s)`,
      active: subMembers.some(e => e.active),
      isExpandable: subMembers.length > 0,
      isSubTeam: true,
      dotColor: dotColors[idx % dotColors.length],
      members: subMembers,
      employeeGuid: sub.supervisor,
    })
  })

  return rows
})

// ── Computed KPIs ─────────────────────────────────────────────────────
const groupCount = computed(() => (rawData.value?.employees_by_group?.length ?? 0) + (rawData.value?.sub_teams?.length ?? 0))
const subTeamCount = computed(() => rawData.value?.sub_teams?.length ?? 0)
const activePercent = computed(() => {
  const total = summary.value?.total_employees ?? 0
  const direct = summary.value?.direct_employees ?? 0
  if (!total) return 0
  return Math.round((direct / total) * 100)
})

// ── Departments for filter ─────────────────────────────────────────────
const availableDepartments = computed(() => {
  const deps = new Set<string>()
  teamStore.employees.forEach(e => { if (e.department && e.department !== 'N/A') deps.add(e.department) })
  return Array.from(deps).sort()
})

// ── Filtering ─────────────────────────────────────────────────────────
const filteredRows = computed(() => {
  let rows = allRows.value

  if (searchTerm.value.trim()) {
    const q = searchTerm.value.toLowerCase()
    rows = rows.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.managerName?.toLowerCase().includes(q) ||
        r.subtitle?.toLowerCase().includes(q)
    )
  }

  if (filterStatus.value === 'active') rows = rows.filter(r => r.active !== false)
  if (filterStatus.value === 'inactive') rows = rows.filter(r => r.active === false)

  if (filterDepartment.value) {
    rows = rows.filter(r =>
        r.department?.toLowerCase() === filterDepartment.value.toLowerCase() ||
        r.members?.some(m => m.department?.toLowerCase() === filterDepartment.value.toLowerCase())
    )
  }

  return rows
})

// ── Pagination principale ─────────────────────────────────────────────
const totalPages = computed(() => Math.ceil(filteredRows.value.length / itemsPerPage))

const pageNumbers = computed(() => {
  const pages: number[] = []
  for (let i = 1; i <= totalPages.value; i++) pages.push(i)
  return pages
})

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredRows.value.slice(start, start + itemsPerPage)
})

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

watch(filteredRows, () => { currentPage.value = 1 })

// ── Context menu ──────────────────────────────────────────────────────
const toggleRowMenu = (key: string, event: MouseEvent) => {
  if (activeRowMenu.value === key) {
    activeRowMenu.value = null
    activeRowData.value = null
    return
  }
  const btn = event.currentTarget as HTMLElement
  const rect = btn.getBoundingClientRect()
  rowMenuPosition.value = {
    top: `${rect.bottom + 8}px`,
    right: `${window.innerWidth - rect.right}px`,
  }
  activeRowMenu.value = key
  activeRowData.value = filteredRows.value.find(r => r.key === key) ?? null
}

const closeMenu = () => {
  activeRowMenu.value = null
  activeRowData.value = null
}

// ── Actions ───────────────────────────────────────────────────────────
const navigateToAddEmployee = () => {
  router.push({ name: 'employeeCreate' })
}

const viewEmployee = (guid?: string) => {
  if (!guid) return
  closeMenu()
  router.push({ name: 'profileCard', params: { id: guid } })
}

const sendMemoToEmployee = (emp: Employee | EmployeesWithoutGroup | EmployeesWithoutGroup2) => {
  router.push({
    name: 'memoList',
    query: {
      action: 'create',
      employeeGuid: emp.guid,
      employeeName: `${emp.first_name} ${emp.last_name}`.trim()
    }
  })
}

const editEmployee = (emp: Employee | EmployeesWithoutGroup | EmployeesWithoutGroup2) => {
  router.push({ name: 'employeeEdit', params: { id: emp.guid } })
}

const clearFilters = () => {
  searchTerm.value = ''
  filterStatus.value = ''
  filterDepartment.value = ''
}

// ── Outside click ─────────────────────────────────────────────────────
const handleOutsideClick = (e: MouseEvent) => {
  if (!activeRowMenu.value) return
  const t = e.target as HTMLElement
  if (!t.closest('[data-menu-trigger]') && !t.closest('.fixed.z-\\[9999\\]')) closeMenu()
}

// ── Lifecycle ─────────────────────────────────────────────────────────
onMounted(async () => {
  document.addEventListener('click', handleOutsideClick)
  HeadBuilder.apply({
    title: 'Équipe — Toké',
    meta: { viewport: 'width=device-width, initial-scale=1.0' }
  })
  employeeStore.initialize()
  try {
    await teamStore.loadTeam(userStore.user?.guid!, true)
  } catch (e: any) {
    console.error('❌ Erreur chargement équipe:', e)
    teamStore.setFlash({
      type: 'error',
      title: 'Chargement impossible',
      message: e?.message ?? 'Impossible de charger la liste des collaborateurs.',
    })
  }

  if (teamStore.flash?.type !== 'error') {
    window.setTimeout(() => teamStore.clearFlash(), 10000)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>