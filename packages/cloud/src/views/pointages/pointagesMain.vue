<template>
  <div class="min-h-screen flex flex-col bg-gradient-to-br from-[#9cbdf6] via-[#f5f9ff] to-[#dbcdef]">
    <Header />

    <main class="flex-1 max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-4 w-full">

      <!-- ══════════════════ PAGE TITLE ══════════════════ -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Gestion des pointages</h1>
          <p class="text-sm text-slate-500 mt-0.5">Consultez et gérez les pointages de votre équipe en temps réel.</p>
        </div>
        <div class="flex items-center gap-3">
          <!-- Sélecteur de période -->
          <div class="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
            <input
                type="date"
                v-model="filterStartDate"
                class="text-sm font-semibold text-slate-800 border-none outline-none bg-transparent cursor-pointer"
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-slate-400">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
            <input
                type="date"
                v-model="filterEndDate"
                :min="filterStartDate"
                class="text-sm font-semibold text-slate-800 border-none outline-none bg-transparent cursor-pointer"
            />
          </div>
          <!-- Export -->
          <button class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Exporter
          </button>
        </div>
      </div>

      <!-- ══════════════════ LOADING ══════════════════ -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-32 gap-4">
        <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p class="text-sm text-slate-500 font-medium">Chargement des pointages...</p>
      </div>

      <!-- ══════════════════ ERREUR ══════════════════ -->
      <div v-else-if="error" class="flex flex-col items-center justify-center py-32 gap-4">
        <div class="w-14 h-14 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-7 h-7">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1-1.732-1-2.464 0L4.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <h3 class="text-base font-bold text-slate-800">Erreur de chargement</h3>
        <p class="text-sm text-slate-500">{{ error }}</p>
        <button @click="loadEntries" class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          Réessayer
        </button>
      </div>

      <template v-else>

        <!-- ══════════════════ FILTRES ══════════════════ -->
        <div class="bg-white border border-slate-200 shadow-sm px-5 py-4">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Filtres</p>
          <div class="flex flex-wrap items-center gap-3">

<!--            &lt;!&ndash; Recherche employé &ndash;&gt;-->
<!--            <div class="relative flex-1 min-w-[180px]">-->
<!--              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">-->
<!--                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>-->
<!--              </svg>-->
<!--              <input-->
<!--                  v-model="filterEmployee"-->
<!--                  type="text"-->
<!--                  placeholder="Rechercher un employé"-->
<!--                  class="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-none focus:ring-2 focus:ring-blue-500 text-slate-700"-->
<!--              />-->
<!--            </div>-->

            <!-- Filtre employé : select + recherche texte combinés -->
            <div class="flex items-center gap-2 flex-1 min-w-[280px]">
              <!-- Select employé -->
              <select
                  v-model="filterEmployeeGuid"
                  class="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                  @change="filterEmployee = ''"
              >
                <option value="">Tous les employés</option>
                <option v-for="emp in uniqueEmployees" :key="emp.guid" :value="emp.guid">
                  {{ emp.name }}
                </option>
              </select>

              <!-- Recherche texte libre (désactivée si guid sélectionné) -->
              <div class="relative flex-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                    v-model="filterEmployee"
                    type="text"
                    placeholder="Ou rechercher par nom…"
                    :disabled="!!filterEmployeeGuid"
                    class="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    @input="filterEmployeeGuid = ''"
                />
              </div>
            </div>

            <!-- Nature du pointage -->
            <select v-model="filterNature" class="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-none focus:ring-2 focus:ring-blue-500 min-w-[170px]">
              <option value="">Toutes les natures</option>
              <option value="standard">Standard (site connu)</option>
              <option value="libre">Libre (waypoint)</option>
              <option value="fallback">Terminal partagé</option>
            </select>

            <!-- Type de pointage -->
            <select v-model="filterType" class="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-none focus:ring-2 focus:ring-blue-500 min-w-[160px]">
              <option value="">Tous les types</option>
              <option value="clock_in">Entrée</option>
              <option value="clock_out">Sortie</option>
              <option value="pause_start">Début de pause</option>
              <option value="pause_end">Fin de pause</option>
              <option value="external_mission">Mission externe</option>
              <option value="external_mission_end">Fin mission externe</option>
            </select>

            <!-- Photo -->
            <select v-model="filterPhoto" class="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-none focus:ring-2 focus:ring-blue-500">
              <option value="">Photo : toutes</option>
              <option value="with">Avec photo</option>
              <option value="without">Sans photo</option>
            </select>

            <!-- Statut -->
            <select v-model="filterStatus" class="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tous les statuts</option>
              <option value="accepted">Accepté</option>
              <option value="pending">En attente</option>
              <option value="rejected">Rejeté</option>
            </select>

            <!-- Reset -->
            <button
                v-if="hasActiveFilters"
                @click="resetFilters"
                class="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Réinitialiser
            </button>

            <span class="ml-auto text-xs text-slate-400 font-medium">
              {{ filteredEntries.length }} pointage(s)
            </span>

          </div>
        </div>

        <!-- ══════════════════ STATS CARDS ══════════════════ -->
        <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">

          <!-- Total -->
          <div class="bg-white rounded-lg border border-slate-200 shadow-sm px-5 py-4 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</span>
              <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-slate-600">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
            </div>
            <div class="text-3xl font-bold text-slate-800">{{ stats.total }}</div>
            <p class="text-xs text-slate-400">pointages</p>
          </div>

          <!-- Standard -->
          <div class="bg-white rounded-lg border border-blue-100 shadow-sm px-5 py-4 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-blue-500 uppercase tracking-wide">Standard</span>
              <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-blue-500">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
            </div>
            <div class="text-3xl font-bold text-blue-700">{{ stats.standard }}</div>
            <p class="text-xs text-blue-400">site connu</p>
          </div>

          <!-- Libre / Waypoint -->
          <div class="bg-white rounded-lg border border-purple-100 shadow-sm px-5 py-4 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-purple-500 uppercase tracking-wide">Libre</span>
              <div class="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-purple-500">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </div>
            </div>
            <div class="text-3xl font-bold text-purple-700">{{ stats.libre }}</div>
            <p class="text-xs text-purple-400">site inconnu</p>
          </div>

          <!-- Fallback -->
          <div class="bg-white rounded-lg border border-amber-100 shadow-sm px-5 py-4 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-amber-600 uppercase tracking-wide">Partagé</span>
              <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-amber-500">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
            </div>
            <div class="text-3xl font-bold text-amber-700">{{ stats.fallback }}</div>
            <p class="text-xs text-amber-400">terminal partagé</p>
          </div>

<!--          &lt;!&ndash; Avec photo &ndash;&gt;-->
<!--          <div class="bg-white rounded-2xl border border-emerald-100 shadow-sm px-5 py-4 flex flex-col gap-2">-->
<!--            <div class="flex items-center justify-between">-->
<!--              <span class="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Avec photo</span>-->
<!--              <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">-->
<!--                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-emerald-500">-->
<!--                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>-->
<!--                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>-->
<!--                </svg>-->
<!--              </div>-->
<!--            </div>-->
<!--            <div class="text-3xl font-bold text-emerald-700">{{ stats.avecPhoto }}</div>-->
<!--            <p class="text-xs text-emerald-400">{{ stats.total > 0 ? Math.round((stats.avecPhoto / stats.total) * 100) : 0 }}% du total</p>-->
<!--          </div>-->

          <!-- Employés distincts -->
          <div class="bg-white rounded-lg border border-slate-200 shadow-sm px-5 py-4 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employés</span>
              <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-slate-600">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
            </div>
            <div class="text-3xl font-bold text-slate-800">{{ stats.employes }}</div>
            <p class="text-xs text-slate-400">ayant pointé</p>
          </div>

        </div>

        <!-- ══════════════════ TABLEAU ══════════════════ -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          <!-- En-tête tableau -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 class="text-sm font-bold text-slate-700">
              Pointages <span class="text-slate-400 font-medium">({{ filteredEntries.length }})</span>
            </h2>
            <div class="flex items-center gap-2 text-xs text-slate-400">
              <span>Lignes par page</span>
              <select v-model="pageSize" class="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600 bg-white outline-none">
                <option v-for="n in [10, 25, 50, 100]" :key="n" :value="n">{{ n }}</option>
              </select>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
              <tr class="bg-slate-50 border-b border-slate-100">
                <th class="text-left text-xs font-bold text-slate-500 uppercase tracking-wide px-5 py-3">Date & heure</th>
                <th class="text-left text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">Employé</th>
                <th class="text-left text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">Nature</th>
                <th class="text-left text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">Type</th>
                <th class="text-left text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">Site / Lieu</th>
                <th class="text-left text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">Statut</th>
                <th class="text-left text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">Photo</th>
                <th class="text-left text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">Appareil</th>
                <th class="text-left text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">Actions</th>
              </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">

              <!-- Empty state -->
              <tr v-if="paginatedEntries.length === 0">
                <td colspan="9" class="px-5 py-16 text-center">
                  <div class="flex flex-col items-center gap-3">
                    <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6 text-slate-400">
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                    <p class="text-sm font-semibold text-slate-600">Aucun pointage trouvé</p>
                    <p class="text-xs text-slate-400">Modifiez les filtres ou la période de recherche.</p>
                  </div>
                </td>
              </tr>

              <!-- Rows -->
              <tr
                  v-for="entry in paginatedEntries"
                  :key="entry.guid"
                  class="hover:bg-slate-50 transition-colors group"
              >
                <!-- Date & heure -->
                <td class="px-5 py-3.5 whitespace-nowrap">
                  <div class="text-sm font-semibold text-slate-800">{{ formatDate(entry.clocked_at) }}</div>
                  <div class="text-xs text-slate-400">{{ formatTime(entry.clocked_at) }}</div>
                </td>

                <!-- Employé -->
                <td class="px-4 py-3.5">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {{ getInitials(entry.user?.name) }}
                    </div>
                    <div>
                      <div class="text-sm font-semibold text-slate-800 leading-tight">{{ entry.user?.name || '—' }}</div>
                    </div>
                  </div>
                </td>

                <!-- Nature (badge différenciation visuelle forte) -->
                <td class="px-4 py-3.5">
                    <span :class="getNatureBadgeClass(entry)" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold">
                      <span>{{ getNatureIcon(entry) }}</span>
                      {{ getNatureLabel(entry) }}
                    </span>
                </td>

                <!-- Type de pointage -->
                <td class="px-4 py-3.5">
                    <span :class="getTypeBadgeClass(entry.pointage_type)" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold">
                      {{ getTypeLabel(entry.pointage_type) }}
                    </span>
                </td>

                <!-- Site / Lieu -->
                <td class="px-4 py-3.5">
                  <div v-if="entry.site?.name" class="flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5 text-slate-400 shrink-0">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <circle cx="12" cy="11" r="3"/>
                    </svg>
                    <span class="text-xs text-slate-700 font-medium">{{ entry.site.name }}</span>
                  </div>
                  <div v-else-if="entry.coordinates" class="flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5 text-purple-400 shrink-0">
                      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    <span class="text-xs text-purple-600 font-medium font-mono">{{ entry.coordinates }}</span>
                  </div>
                  <span v-else class="text-xs text-slate-300">—</span>
                </td>

                <!-- Statut -->
                <td class="px-4 py-3.5">
                    <span :class="getStatusBadgeClass(entry.pointage_status)" class="px-2.5 py-1 rounded-full text-xs font-semibold">
                      {{ getStatusLabel(entry.pointage_status) }}
                    </span>
                  <!-- Indicateur anomalie -->
                  <span v-if="entry.has_anomalies" class="ml-1 inline-block w-2 h-2 rounded-full bg-red-500" title="Anomalie détectée"></span>
                </td>

                <!-- Photo -->
                <td class="px-4 py-3.5">
                  <div v-if="entry.image_url" class="flex items-center gap-1.5">
                    <div class="w-8 h-8 rounded-lg overflow-hidden border border-slate-200">
                      <img :src="entry.image_url" alt="photo" class="w-full h-full object-cover" />
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-emerald-500">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <div v-else class="flex items-center gap-1.5">
                    <div class="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-slate-300">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                        <line x1="2" y1="2" x2="22" y2="22" stroke-width="1.5"/>
                      </svg>
                    </div>
                  </div>
                </td>

                <!-- Appareil -->
                <td class="px-4 py-3.5">
                    <span class="text-xs text-slate-500 truncate max-w-[140px] block" :title="entry.device?.name">
                      {{ entry.device?.name || '—' }}
                    </span>
                </td>

                <!-- Actions -->
                <td class="px-4 py-3.5">
                  <div class="flex items-center gap-1 opacity-100 transition-opacity">
                    <button
                        @click="openDetail(entry)"
                        class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Voir le détail"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    </button>
                    <button
                        class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Plus d'options"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                        <circle cx="12" cy="5" r="1" fill="currentColor"/>
                        <circle cx="12" cy="12" r="1" fill="currentColor"/>
                        <circle cx="12" cy="19" r="1" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>

              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50">
            <span class="text-xs text-slate-400">
              {{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, filteredEntries.length) }} sur {{ filteredEntries.length }}
            </span>
            <div class="flex items-center gap-1">
              <button @click="currentPage = 1" :disabled="currentPage === 1" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
              </button>
              <button @click="currentPage--" :disabled="currentPage === 1" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <template v-for="p in visiblePages" :key="p">
                <span v-if="p === '...'" class="w-7 h-7 flex items-center justify-center text-xs text-slate-400">…</span>
                <button
                    v-else
                    @click="currentPage = p as number"
                    :class="currentPage === p ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-white'"
                    class="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors"
                >{{ p }}</button>
              </template>
              <button @click="currentPage++" :disabled="currentPage === totalPages" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button @click="currentPage = totalPages" :disabled="currentPage === totalPages" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
              </button>
            </div>
          </div>

        </div>

      </template>
    </main>

    <!-- ══════════════════ DRAWER DÉTAIL ══════════════════ -->
    <transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-x-8"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-8"
    >
      <div
          v-if="selectedEntry"
          class="fixed top-0 right-0 h-full w-[380px] bg-white shadow-2xl border-l border-slate-200 z-[200] flex flex-col overflow-y-auto"
      >
        <!-- Header drawer -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 class="text-sm font-bold text-slate-800">Détail du pointage</h3>
          <button @click="selectedEntry = null" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Contenu drawer -->
        <div class="flex-1 px-5 py-4 space-y-5">

          <!-- Badge statut -->
          <span :class="getStatusBadgeClass(selectedEntry.pointage_status)" class="px-3 py-1.5 rounded-full text-xs font-bold">
            {{ getStatusLabel(selectedEntry.pointage_status) }}
          </span>

          <!-- Type + Date -->
          <div class="flex items-start gap-3">
            <div :class="getTypeDotClass(selectedEntry.pointage_type)" class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div>
              <p class="text-base font-bold text-slate-800">{{ getTypeLabel(selectedEntry.pointage_type) }}</p>
              <p class="text-sm text-slate-500">{{ formatDate(selectedEntry.clocked_at) }} à {{ formatTime(selectedEntry.clocked_at) }}</p>
            </div>
          </div>

          <!-- Employé -->
          <div class="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
            <div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
              {{ getInitials(selectedEntry.user?.name) }}
            </div>
            <div>
              <p class="text-sm font-bold text-slate-800">{{ selectedEntry.user?.name }}</p>
            </div>
          </div>

          <!-- Infos détaillées -->
          <div class="space-y-3">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Informations</p>

            <div class="grid gap-2.5">

              <!-- Nature -->
              <div class="flex items-center justify-between py-2 border-b border-slate-50">
                <span class="text-xs text-slate-500 flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                  Nature
                </span>
                <span :class="getNatureBadgeClass(selectedEntry)" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold">
                  {{ getNatureIcon(selectedEntry) }} {{ getNatureLabel(selectedEntry) }}
                </span>
              </div>

              <!-- Site -->
              <div class="flex items-center justify-between py-2 border-b border-slate-50">
                <span class="text-xs text-slate-500 flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  Site
                </span>
                <span class="text-xs font-semibold text-slate-700">{{ selectedEntry.site?.name || '—' }}</span>
              </div>

              <!-- Localisation -->
              <div class="flex items-center justify-between py-2 border-b border-slate-50">
                <span class="text-xs text-slate-500 flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10z"/>
                  </svg>
                  Localisation
                </span>
                <span class="text-xs font-mono text-slate-600">{{ selectedEntry.coordinates || '—' }}</span>
              </div>

              <!-- Géofence -->
              <div class="flex items-center justify-between py-2 border-b border-slate-50">
                <span class="text-xs text-slate-500 flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                    <path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/>
                  </svg>
                  Zone autorisée
                </span>
                <span :class="selectedEntry.within_geofence ? 'text-emerald-600' : 'text-red-500'" class="text-xs font-bold">
                  {{ selectedEntry.within_geofence ? 'Dans la zone' : 'Hors zone' }}
                </span>
              </div>

              <!-- Appareil -->
              <div class="flex items-center justify-between py-2 border-b border-slate-50">
                <span class="text-xs text-slate-500 flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                    <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/>
                  </svg>
                  Appareil
                </span>
                <span class="text-xs font-semibold text-slate-700 text-right max-w-[180px] truncate">{{ selectedEntry.device?.name || '—' }}</span>
              </div>

              <!-- Score fraude -->
              <div class="flex items-center justify-between py-2 border-b border-slate-50">
                <span class="text-xs text-slate-500 flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                  Score fraude
                </span>
                <span :class="getFraudScoreClass(selectedEntry.fraud_score)" class="text-xs font-bold">
                  {{ selectedEntry.fraud_score }}/100
                </span>
              </div>

              <!-- Synchronisation -->
              <div class="flex items-center justify-between py-2">
                <span class="text-xs text-slate-500 flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                  Synchronisation
                </span>
                <span :class="selectedEntry.created_offline ? 'text-amber-600' : 'text-emerald-600'" class="text-xs font-bold">
                  {{ selectedEntry.created_offline ? 'Hors ligne' : 'En ligne' }}
                </span>
              </div>

            </div>
          </div>

          <!-- Memo -->
          <div v-if="selectedEntry.memo" class="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p class="text-xs font-bold text-amber-700 mb-1">Mémo</p>
            <p class="text-xs text-amber-600">{{ selectedEntry.memo }}</p>
          </div>

          <!-- Photo -->
          <div v-if="selectedEntry.image_url">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Photo</p>
            <img :src="selectedEntry.image_url" alt="Photo du pointage" class="w-full rounded-xl border border-slate-200 object-cover" />
          </div>

        </div>
      </div>
    </transition>

    <!-- Overlay drawer -->
    <div
        v-if="selectedEntry"
        @click="selectedEntry = null"
        class="fixed inset-0 bg-black/10 z-[199]"
    />

    <Footer />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import EntriesService from '@/service/EntriesService'
import Header from "@/views/components/header.vue";
import Footer from "@/views/components/footer.vue";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PeriodAttendanceResponse {
  success: boolean;
  data: {
    message: string;
    data: {
      pagination: {
        offset: number;
        limit: number;
        count: number;
      };
      entries: PointageEntry[];
    };
  };
}

interface PointageEntry {
  guid               : string
  pointage_type      : string
  pointage_status    : string
  clocked_at         : string
  server_received_at : string
  real_clocked_at    : string | null
  created_offline    : boolean
  coordinates        : string | null
  gps_accuracy       : number
  site_name          : string | null
  correction_reason  : string | null
  is_fallback_checkin: boolean
  image_url          : string | null
  user               : { guid: string; name: string } | null
  device             : { guid: string; name: string } | null
  site               : { guid: string; name: string } | null
  session            : { guid: string; duration: string } | null
  memo               : string | null
  device_info        : Record<string, any> | null
  ip_address         : string | null
  is_valid           : boolean
  requires_validation: boolean
  within_geofence    : boolean
  has_anomalies      : boolean
  fraud_score        : number
  updated_at         : string
}

// ─── Store ───────────────────────────────────────────────────────────────────
const userStore = useUserStore()
const route     = useRoute()

// ─── State ───────────────────────────────────────────────────────────────────
const allEntries    = ref<PointageEntry[]>([])
const loading       = ref(false)
const error         = ref<string | null>(null)
const selectedEntry = ref<PointageEntry | null>(null)

// ─── Filtres ─────────────────────────────────────────────────────────────────
const filterEmployee     = ref('')
const filterEmployeeGuid = ref('')
const filterNature    = ref('')
const filterType      = ref('')
const filterPhoto     = ref('')
const filterStatus    = ref('')

const today = new Date().toISOString().split('T')[0]
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
const filterStartDate = ref(monthStart)
const filterEndDate   = ref(today)

// ─── Pagination ───────────────────────────────────────────────────────────────
const currentPage = ref(1)
const pageSize    = ref(25)

// ─── Liste unique d'employés extraite des entrées chargées ────────────────────
const uniqueEmployees = computed(() => {
  const map = new Map<string, string>()
  for (const entry of allEntries.value) {
    if (entry.user?.guid && !map.has(entry.user.guid)) {
      map.set(entry.user.guid, entry.user.name)
    }
  }
  return Array.from(map.entries())
      .map(([guid, name]) => ({ guid, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
})

// ─── Helpers : détermination de la nature ────────────────────────────────────
/**
 * Détermine la nature d'un pointage selon les règles métier :
 * - is_fallback_checkin → terminal partagé (fallback)
 * - site non null → standard (site connu)
 * - sinon → libre (waypoint, site inconnu)
 */
const getEntryNature = (entry: PointageEntry): 'standard' | 'libre' | 'fallback' => {
  if (entry.is_fallback_checkin) return 'fallback'
  if (entry.site?.guid)          return 'standard'
  return 'libre'
}

const getNatureLabel = (entry: PointageEntry) => {
  const n = getEntryNature(entry)
  if (n === 'standard') return 'Standard'
  if (n === 'fallback') return 'Terminal partagé'
  return 'Libre'
}

const getNatureIcon = (entry: PointageEntry) => {
  const n = getEntryNature(entry)
  if (n === 'standard') return '📍'
  if (n === 'fallback') return '🖥️'
  return '🌐'
}

const getNatureBadgeClass = (entry: PointageEntry) => {
  const n = getEntryNature(entry)
  if (n === 'standard') return 'bg-blue-50 text-blue-700 border border-blue-100'
  if (n === 'fallback') return 'bg-amber-50 text-amber-700 border border-amber-100'
  return 'bg-purple-50 text-purple-700 border border-purple-100'
}

// ─── Helpers : type de pointage ───────────────────────────────────────────────
const getTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    clock_in             : 'Entrée',
    clock_out            : 'Sortie',
    pause_start          : 'Début pause',
    pause_end            : 'Fin pause',
    external_mission     : 'Mission ext.',
    external_mission_end : 'Fin mission',
  }
  return map[type] || type
}

const getTypeBadgeClass = (type: string) => {
  if (type === 'clock_in')              return 'bg-emerald-50 text-emerald-700'
  if (type === 'clock_out')             return 'bg-red-50 text-red-600'
  if (type === 'pause_start')           return 'bg-orange-50 text-orange-600'
  if (type === 'pause_end')             return 'bg-orange-50 text-orange-600'
  if (type === 'external_mission')      return 'bg-sky-50 text-sky-600'
  if (type === 'external_mission_end')  return 'bg-sky-50 text-sky-600'
  return 'bg-slate-100 text-slate-600'
}

const getTypeDotClass = (type: string) => {
  if (type === 'clock_in')  return 'bg-emerald-100 text-emerald-600'
  if (type === 'clock_out') return 'bg-red-100 text-red-500'
  return 'bg-orange-100 text-orange-500'
}

// ─── Helpers : statut ─────────────────────────────────────────────────────────
const getStatusLabel = (status: string) => {
  if (status === 'accepted') return 'Accepté'
  if (status === 'pending')  return 'En attente'
  if (status === 'rejected') return 'Rejeté'
  return status
}

const getStatusBadgeClass = (status: string) => {
  if (status === 'accepted') return 'bg-emerald-50 text-emerald-700'
  if (status === 'pending')  return 'bg-amber-50 text-amber-700'
  if (status === 'rejected') return 'bg-red-50 text-red-600'
  return 'bg-slate-100 text-slate-600'
}

// ─── Helpers : fraude ────────────────────────────────────────────────────────
const getFraudScoreClass = (score: number) => {
  if (score === 0)   return 'text-emerald-600'
  if (score < 30)    return 'text-amber-500'
  return 'text-red-600'
}

// ─── Helpers : formatage ─────────────────────────────────────────────────────
const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const getInitials = (name?: string) => {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Filtres computés ─────────────────────────────────────────────────────────
const hasActiveFilters = computed(() =>
    filterEmployee.value !== '' ||
    filterNature.value !== '' ||
    filterType.value !== '' ||
    filterPhoto.value !== '' ||
    filterStatus.value !== ''
)

const filteredEntries = computed(() => {
  let entries = [...allEntries.value]

  // // Filtre période
  // if (filterStartDate.value) {
  //   entries = entries.filter(e => e.clocked_at >= filterStartDate.value)
  // }
  // if (filterEndDate.value) {
  //   const endOfDay = filterEndDate.value + 'T23:59:59'
  //   entries = entries.filter(e => e.clocked_at <= endOfDay)
  // }

  // Filtre employé
  if (filterEmployee.value.trim()) {
    const q = filterEmployee.value.toLowerCase()
    entries = entries.filter(e => e.user?.name?.toLowerCase().includes(q))
  }

  // Filtre employé (guid depuis URL)
  if (filterEmployeeGuid.value) {
    entries = entries.filter(e => e.user?.guid === filterEmployeeGuid.value)
  }

  // Filtre nature
  if (filterNature.value) {
    entries = entries.filter(e => getEntryNature(e) === filterNature.value)
  }

  // Filtre type
  if (filterType.value) {
    entries = entries.filter(e => e.pointage_type === filterType.value)
  }

  // Filtre photo
  if (filterPhoto.value === 'with')    entries = entries.filter(e => !!e.image_url)
  if (filterPhoto.value === 'without') entries = entries.filter(e => !e.image_url)

  // Filtre statut
  if (filterStatus.value) {
    entries = entries.filter(e => e.pointage_status === filterStatus.value)
  }

  // Tri chronologique décroissant
  return entries.sort((a, b) => new Date(b.clocked_at).getTime() - new Date(a.clocked_at).getTime())
})

// ─── Stats ────────────────────────────────────────────────────────────────────
const stats = computed(() => {
  const entries = filteredEntries.value
  const standard  = entries.filter(e => getEntryNature(e) === 'standard').length
  const libre     = entries.filter(e => getEntryNature(e) === 'libre').length
  const fallback  = entries.filter(e => getEntryNature(e) === 'fallback').length
  const avecPhoto = entries.filter(e => !!e.image_url).length
  const employes  = new Set(entries.map(e => e.user?.guid).filter(Boolean)).size
  return { total: entries.length, standard, libre, fallback, avecPhoto, employes }
})

// ─── Pagination ───────────────────────────────────────────────────────────────
const totalPages = computed(() => Math.ceil(filteredEntries.value.length / pageSize.value) || 1)

const paginatedEntries = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredEntries.value.slice(start, start + pageSize.value)
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const cur   = currentPage.value
  const pages: (number | string)[] = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (cur > 3) pages.push('...')
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i)
    if (cur < total - 2) pages.push('...')
    pages.push(total)
  }
  return pages
})

// ─── Actions ──────────────────────────────────────────────────────────────────
const resetFilters = () => {
  filterEmployee.value     = ''
  filterEmployeeGuid.value = ''
  filterNature.value       = ''
  filterType.value         = ''
  filterPhoto.value        = ''
  filterStatus.value       = ''
  currentPage.value        = 1
}

const openDetail = (entry: PointageEntry) => {
  selectedEntry.value = entry
}

// ─── Chargement des données ───────────────────────────────────────────────────
const loadEntries = async () => {
  try {
    loading.value = true
    error.value   = null

    const managerGuid = userStore.user?.guid
    if (!managerGuid) throw new Error('Utilisateur non connecté')

    const response = await EntriesService.listEntries(managerGuid, {
      startDate: filterStartDate.value || undefined,
      endDate  : filterEndDate.value   || undefined,
    })
    if (!response?.success) throw new Error('Erreur API')

    const data = response as PeriodAttendanceResponse
    allEntries.value = (data.data?.data?.entries || []) as PointageEntry[]
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement'
  } finally {
    loading.value = false
  }
}

// Recharger depuis l'API quand la période change
watch([filterStartDate, filterEndDate], () => {
  currentPage.value = 1
  loadEntries()
})

onMounted(async () => {
  // Pré-filtrer par employé si ?employee=GUID dans l'URL
  const guidFromUrl = route.query.employee as string | undefined
  if (guidFromUrl) {
    filterEmployeeGuid.value = guidFromUrl
  }
  await loadEntries()
})
</script>