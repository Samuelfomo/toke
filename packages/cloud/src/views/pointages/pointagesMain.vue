<template>
  <div class="min-h-screen flex flex-col bg-gradient-to-br from-[#9cbdf6] via-[#f5f9ff] to-[#dbcdef]">
    <Header />

    <main class="flex-1 min-w-0 max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-4 w-full">

      <!-- ══════════════════ PAGE TITLE ══════════════════ -->
      <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Gestion des pointages</h1>
          <p class="text-sm text-slate-500 mt-0.5">Consultez et gérez les pointages de votre équipe en temps réel.</p>
        </div>
        <div class="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 sm:gap-3 w-full xl:w-auto min-w-0">
          <!-- Sélecteur de période -->
          <div class="col-span-2 flex items-center gap-2 min-w-0 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
            <input
                type="date"
                v-model="filterStartDate"
                class="w-full sm:w-auto min-w-0 flex-1 text-sm font-semibold text-slate-800 border-none outline-none bg-transparent cursor-pointer"
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 shrink-0 text-slate-400">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
            <input
                type="date"
                v-model="filterEndDate"
                :min="filterStartDate"
                class="w-full sm:w-auto min-w-0 flex-1 text-sm font-semibold text-slate-800 border-none outline-none bg-transparent cursor-pointer"
            />
          </div>
          <button
              @click="loadEntries"
              :disabled="loading || !filterStartDate || !filterEndDate || filterStartDate > filterEndDate"
              class="whitespace-nowrap px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {{ loading ? 'Recherche...' : 'Rechercher' }}
          </button>
          <!-- Export -->
          <button
              @click="handleExportPDF"
              :disabled="exportLoading || filteredEntries.length === 0"
              class="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            {{ exportLoading ? 'Génération...' : 'Exporter PDF' }}
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
        <div class="bg-white min-w-0 border border-slate-200 shadow-sm px-3 sm:px-5 py-4">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Filtres</p>
          <div class="grid grid-cols-1 sm:flex sm:flex-wrap sm:items-center gap-3">

            <!--            &lt;!&ndash; Recherche employé &ndash;&gt;-->
            <!--            <div class="relative flex-1 w-full sm:w-auto min-w-0 sm:min-w-[180px]">-->
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
            <div class="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 w-full sm:flex-1 sm:min-w-[280px]">
              <!-- Select employé -->
              <select
                  v-model="filterEmployeeGuid"
                  class="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto sm:max-w-[16rem] min-w-0 sm:min-w-[200px]"
                  @change="filterEmployee = ''"
              >
                <option value="">Tous les employés</option>
                <option v-for="emp in uniqueEmployees" :key="emp.guid" :value="emp.guid">
                  {{ emp.name }}
                </option>
              </select>

              <!-- Recherche texte libre (désactivée si guid sélectionné) -->
              <div class="relative w-full min-w-0 sm:flex-1">
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

            <select v-model="filterSiteGuid" aria-label="Filtrer par site" class="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto min-w-0 sm:min-w-[180px]">
              <option value="">Tous les sites</option>
              <option v-for="site in uniqueSites" :key="site.guid" :value="site.guid">{{ site.name }}</option>
              <option v-if="filterSiteGuid && !uniqueSites.some(site => site.guid === filterSiteGuid)" :value="filterSiteGuid">Site sélectionné</option>
            </select>

            <!-- Nature du pointage -->
            <select v-model="filterNature" class="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto min-w-0 sm:min-w-[170px]">
              <option value="">Toutes les natures</option>
              <option value="standard">Standard (site connu)</option>
              <option value="libre">Libre (waypoint)</option>
              <option value="fallback">Terminal partagé</option>
            </select>

            <!-- Type de pointage -->
            <select v-model="filterType" class="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto min-w-0 sm:min-w-[160px]">
              <option value="">Tous les types</option>
              <option value="clock_in">Entrée</option>
              <option value="clock_out">Sortie</option>
              <option value="pause_start">Début de pause</option>
              <option value="pause_end">Fin de pause</option>
              <option value="external_mission">Mission externe</option>
              <option value="external_mission_end">Fin mission externe</option>
            </select>

            <!-- Photo -->
            <select v-model="filterPhoto" class="w-full sm:w-auto min-w-0 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-none focus:ring-2 focus:ring-blue-500">
              <option value="">Photo : toutes</option>
              <option value="with">Avec photo</option>
              <option value="without">Sans photo</option>
            </select>

            <!-- Statut -->
            <select v-model="filterStatus" class="w-full sm:w-auto min-w-0 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tous les statuts</option>
              <option value="accepted">Accepté</option>
              <option value="pending">En attente</option>
              <option value="rejected">Rejeté</option>
            </select>
            <select v-model="filterControl" aria-label="Filtrer les situations à contrôler"
                    class="w-full sm:w-auto min-w-0 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tous les contrôles</option>
              <option value="invalid">Pointages non valides</option>
              <option value="validation">Validation demandée</option>
              <option value="outside">Hors zone autorisée</option>
              <option value="anomaly">Anomalie signalée</option>
            </select>
            <select v-model="filterMemo" aria-label="Filtrer les mémos associés"
                    class="w-full sm:w-auto min-w-0 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tous les pointages</option>
              <option value="with">Avec mémo associé</option>
              <option value="without">Sans mémo associé</option>
              <option value="pending" :disabled="!memoStatusReady">Mémo en attente de décision</option>
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

        <!-- Indicateurs pour la période chargée et les filtres actifs -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3" aria-label="Synthèse des pointages affichés">
          <div class="rounded-xl bg-white border border-slate-200 px-4 py-3">
            <div class="text-xs font-medium text-slate-500">Pointages</div>
            <div class="mt-1 text-2xl font-bold text-slate-900">{{ stats.total }}</div>
          </div>
          <div class="rounded-xl bg-white border border-amber-200 px-4 py-3">
            <div class="text-xs font-medium text-slate-600">À examiner</div>
            <div class="mt-1 text-2xl font-bold text-amber-700">{{ stats.attention }}</div>
          </div>
          <div class="rounded-xl bg-white border border-red-200 px-4 py-3">
            <div class="text-xs font-medium text-slate-600">Hors zone</div>
            <div class="mt-1 text-2xl font-bold text-red-700">{{ stats.outside }}</div>
          </div>
          <div class="rounded-xl bg-white border border-blue-200 px-4 py-3">
            <div class="text-xs font-medium text-slate-600">Avec mémo</div>
            <div class="mt-1 text-2xl font-bold text-[#004AAD]">{{ stats.withMemo }}</div>
          </div>
          <div class="rounded-xl bg-white border border-slate-200 px-4 py-3">
            <div class="text-xs font-medium text-slate-500">Employés concernés</div>
            <div class="mt-1 text-2xl font-bold text-slate-900">{{ stats.employes }}</div>
          </div>
        </div>

        <div v-if="memoSyncLoading" class="text-xs text-slate-500" role="status">Actualisation des justifications…</div>
        <div v-else-if="memoSyncError || !memoStatusReady" class="flex items-center gap-3 text-xs text-slate-600" role="status">
          <span>Le suivi des décisions n'est pas disponible pour tous les pointages.</span>
          <button type="button" class="text-[#004AAD] font-semibold hover:underline" @click="refreshMemos">Réessayer</button>
        </div>
        <!-- ══════════════════ TABLEAU ══════════════════ -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          <!-- En-tête tableau -->
          <div class="flex flex-wrap items-center justify-between gap-3 px-3 sm:px-5 py-4 border-b border-slate-100">
            <h2 class="text-sm font-bold text-slate-700">
              Pointages <span class="text-slate-400 font-medium">({{ filteredEntries.length }})</span>
            </h2>
            <div class="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <button type="button" @click="filterMemo = filterMemo === 'with' ? '' : 'with'; currentPage = 1"
                      :aria-pressed="filterMemo === 'with'"
                      :class="filterMemo === 'with' ? 'bg-blue-100 border-blue-300 text-blue-900' : 'bg-white border-slate-200 text-slate-700'"
                      class="rounded-lg border px-3 py-1.5 font-semibold hover:bg-blue-50">
                Avec mémo ({{ memoCount }})
              </button>
              <button v-if="memoStatusReady" type="button" @click="filterMemo = filterMemo === 'pending' ? '' : 'pending'; currentPage = 1"
                      :aria-pressed="filterMemo === 'pending'"
                      :class="filterMemo === 'pending' ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white border-slate-200 text-slate-700'"
                      class="rounded-lg border px-3 py-1.5 font-semibold hover:bg-amber-50">
                Mémos en attente ({{ pendingMemoCount }})
              </button>
              <button type="button" @click="attentionOnly = !attentionOnly; currentPage = 1"
                      :aria-pressed="attentionOnly"
                      :class="attentionOnly ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white border-slate-200 text-slate-700'"
                      class="rounded-lg border px-3 py-1.5 font-semibold hover:bg-amber-50">
                À examiner ({{ attentionCount }})
              </button>
              <span>Lignes par page</span>
              <select v-model="pageSize" class="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600 bg-white outline-none">
                <option v-for="n in [10, 25, 50, 100]" :key="n" :value="n">{{ n }}</option>
              </select>
            </div>
          </div>

          <p class="sm:hidden px-3 pb-3 text-xs text-slate-500">Faites défiler le tableau horizontalement pour voir toutes les informations.</p>
          <!-- Table -->
          <div class="w-full max-w-full overflow-x-auto" tabindex="0" role="region" aria-label="Tableau des pointages à défilement horizontal">
            <table class="w-full min-w-[960px] text-sm">
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
                  :class="entry.guid === resolvedSourceEntryGuid ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200' : ''"
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
                    <span class="text-xs text-purple-600 font-medium">Position enregistrée</span>
                  </div>
                  <span v-else class="text-xs text-slate-300">—</span>
                </td>

                <!-- Statut -->
                <td class="px-4 py-3.5">
                    <span :class="getStatusBadgeClass(entry.pointage_status)" class="px-2.5 py-1 rounded-full text-xs font-semibold">
                      {{ getStatusLabel(entry.pointage_status) }}
                    </span>
                  <div class="mt-1 text-xs font-semibold" :class="getPointageOverview(entry).tone === 'warning' ? 'text-amber-700' : getPointageOverview(entry).tone === 'danger' ? 'text-red-700' : getPointageOverview(entry).tone === 'success' ? 'text-emerald-700' : 'text-slate-500'">{{ getPointageOverview(entry).label }}</div>
                  <div v-if="getMemoReference(entry) || linkedMemos(entry).length" class="text-xs text-blue-700">
                    {{ memoRowLabel(entry) }}
                  </div>
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
                        type="button"
                        @click.stop="toggleActionMenu(entry, $event)"
                        :aria-expanded="actionMenuEntry?.guid === entry.guid"
                        aria-haspopup="menu"
                        :aria-label="`Actions pour ${entry.user?.name || 'ce pointage'}`"
                        class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#004AAD] transition-colors"
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

          <Teleport to="body">
            <div v-if="actionMenuEntry" class="fixed inset-0 z-[95]" @click="closeActionMenu" @keydown.esc="closeActionMenu"></div>
            <div v-if="actionMenuEntry" role="menu" aria-label="Actions du pointage" :style="actionMenuStyle"
                 class="fixed z-[96] w-60 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
              <button role="menuitem" type="button" @click="menuViewDetail" class="w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">Consulter le pointage</button>
              <button v-if="parsePointageCoordinates(actionMenuEntry.coordinates)" role="menuitem" type="button" @click="menuLocate" class="w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">Localiser sur la carte</button>
              <button v-if="getMemoReference(actionMenuEntry)" role="menuitem" type="button" @click="menuOpenMemo" class="w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">Consulter le mémo</button>
              <button v-if="actionMenuEntry.user?.guid" role="menuitem" type="button" @click="menuShowEmployeeDay" class="w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">Voir la journée de l'employé</button>
            </div>
          </Teleport>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-5 py-3.5 border-t border-slate-100 bg-slate-50">
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
          class="fixed top-0 right-0 h-full w-full sm:w-[590px] max-w-full bg-white shadow-2xl border-l border-slate-200 z-[200] flex flex-col overflow-y-auto"
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

          <!-- Synthèse accessible au manager ; le statut d'enregistrement reste distinct. -->
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <span class="inline-flex rounded-full px-3 py-1 text-xs font-bold"
                  :class="getPointageOverview(selectedEntry).tone === 'success' ? 'bg-emerald-100 text-emerald-800' : getPointageOverview(selectedEntry).tone === 'danger' ? 'bg-red-100 text-red-800' : getPointageOverview(selectedEntry).tone === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'">
              {{ getPointageOverview(selectedEntry).label }}
            </span>
            <p class="text-xs text-slate-600">{{ getPointageOverview(selectedEntry).explanation }}</p>
            <p class="text-xs text-slate-500">Enregistrement : {{ getStatusLabel(selectedEntry.pointage_status) }}</p>
          </div>

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
                <span class="text-xs font-semibold text-slate-700 text-right max-w-[210px]">{{ getLocationSummary(selectedEntry) }}</span>
              </div>

              <div id="pointage-location-map">
              <PointageLocationMap
                  :key="selectedEntry.guid"
                  :coordinates="selectedEntry.coordinates"
                  :site-guid="selectedEntry.site?.guid"
                  :site-name="selectedEntry.site?.name || selectedEntry.site_name"
                  :within-geofence="selectedEntry.within_geofence"
                  :gps-accuracy="selectedEntry.gps_accuracy"
              />
              </div>

              <!-- Géofence -->
              <div class="flex items-center justify-between py-2 border-b border-slate-50">
                <span class="text-xs text-slate-500 flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                    <path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/>
                  </svg>
                  Zone autorisée
                </span>
                <span :class="selectedEntry.within_geofence === true ? 'text-emerald-600' : selectedEntry.within_geofence === false ? 'text-red-500' : 'text-slate-500'" class="text-xs font-bold">
                  {{ selectedEntry.within_geofence === true ? 'Dans la zone' : selectedEntry.within_geofence === false ? 'Hors zone' : 'Non déterminé' }}
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

              <!-- La précision 0 n'est pas une mesure fiable à afficher comme ±0 m. -->
              <div class="flex items-center justify-between py-2 border-b border-slate-50 gap-3">
                <span class="text-xs text-slate-500">Localisation GPS</span>
                <span class="text-xs font-semibold text-slate-700 text-right">{{ getGpsAccuracyLabel(selectedEntry.gps_accuracy) }}</span>
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

          <!-- Mémo existant : lecture contextualisée, sans dupliquer sa gestion. -->
          <PointageMemoInvestigation
              v-if="getMemoReference(selectedEntry)"
              :key="getMemoReference(selectedEntry)?.guid"
              :entry-guid="selectedEntry.guid"
              :memo-guid="getMemoReference(selectedEntry)?.guid ?? null"
              :title="getMemoReference(selectedEntry)?.title"
          />

          <section v-if="selectedEntry.server_received_at" class="rounded-xl border border-slate-200 p-4 space-y-2">
            <h4 class="text-sm font-semibold text-slate-800">Historique de l'enregistrement</h4>
            <div class="flex justify-between gap-4 text-sm"><span class="text-slate-500">Heure du pointage</span><span class="font-medium text-slate-800">{{ formatDate(selectedEntry.clocked_at) }} à {{ formatTime(selectedEntry.clocked_at) }}</span></div>
            <div class="flex justify-between gap-4 text-sm"><span class="text-slate-500">Reçu par Toké</span><span class="font-medium text-slate-800">{{ formatDate(selectedEntry.server_received_at) }} à {{ formatTime(selectedEntry.server_received_at) }}</span></div>
            <p v-if="selectedEntry.created_offline" class="text-xs text-amber-700">Pointage réalisé hors connexion, puis synchronisé.</p>
          </section>

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
import { ref, computed, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import EntriesService from '@/service/EntriesService'
import MemoService from '@/service/MemoService'
import { getMemoReference, getPointageOverview, getLocationSummary, getGpsAccuracyLabel, parsePointageCoordinates, type PointageMemoReference } from './utils/pointagePresentation'
import PointageLocationMap from './components/PointageLocationMap.vue'
import PointageMemoInvestigation from './components/PointageMemoInvestigation.vue'
import Header from "@/views/components/header.vue";
import Footer from "@/views/components/footer.vue";

import { exportPointagesPDF, type PointagesExportOptions } from '@/utils/exports/exportPointagesPDF'

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
  gps_accuracy       : number | null
  site_name          : string | null
  correction_reason  : string | null
  is_fallback_checkin: boolean
  image_url          : string | null
  user               : { guid: string; name: string } | null
  device             : { guid: string; name: string } | null
  site               : { guid: string; name: string } | null
  session            : { guid: string; duration: string } | null
  memo               : PointageMemoReference | string | null
  device_info        : Record<string, any> | null
  ip_address         : string | null
  is_valid           : boolean
  requires_validation: boolean
  within_geofence    : boolean | null
  has_anomalies      : boolean
  fraud_score        : number
  updated_at         : string
}

// ─── Store ───────────────────────────────────────────────────────────────────
const userStore = useUserStore()
const route     = useRoute()
const router = useRouter()

const readQueryString = (value: unknown): string | null => {
  if (typeof value === 'string') return value.trim() || null
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string' && item.trim().length > 0)
    return typeof first === 'string' ? first.trim() : null
  }
  return null
}

const isBusinessDate = (value: string | null): value is string =>
    value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value)

// ─── State ───────────────────────────────────────────────────────────────────
const allEntries    = ref<PointageEntry[]>([])
const loading       = ref(false)
const error         = ref<string | null>(null)
const selectedEntry = ref<PointageEntry | null>(null)

// ─── Filtres ─────────────────────────────────────────────────────────────────
const filterEmployee     = ref('')
const filterEmployeeGuid = ref(readQueryString(route.query.employee) ?? '')
const filterSiteGuid = ref(readQueryString(route.query.site) ?? '')
const filterNature    = ref('')
const filterType      = ref('')
const filterPhoto     = ref('')
const filterStatus    = ref('')
const filterControl = ref<'' | 'invalid' | 'validation' | 'outside' | 'anomaly'>('')

const today = new Date().toISOString().split('T')[0]
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
const queryStartDate = readQueryString(route.query.start_date) ?? readQueryString(route.query.start)
const queryEndDate = readQueryString(route.query.end_date) ?? readQueryString(route.query.end)
const initialStartDate = isBusinessDate(queryStartDate)
    ? queryStartDate
    : isBusinessDate(queryEndDate)
        ? queryEndDate
        : monthStart
const initialEndDate = isBusinessDate(queryEndDate)
    ? queryEndDate
    : isBusinessDate(queryStartDate)
        ? queryStartDate
        : today
const filterStartDate = ref(initialStartDate <= initialEndDate ? initialStartDate : initialEndDate)
const filterEndDate   = ref(initialStartDate <= initialEndDate ? initialEndDate : initialStartDate)
const loadedStartDate = ref(filterStartDate.value)
const loadedEndDate = ref(filterEndDate.value)

const sourceEntryGuid = ref(readQueryString(route.query.entry))
const sourceSessionGuid = ref(readQueryString(route.query.session))
const resolvedSourceEntryGuid = ref<string | null>(null)

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

const uniqueSites = computed(() => {
  const sites = new Map<string, string>()
  for (const entry of allEntries.value) {
    if (entry.site?.guid) sites.set(entry.site.guid, entry.site.name || entry.site.guid)
  }
  return Array.from(sites, ([guid, name]) => ({ guid, name })).sort((a, b) => a.name.localeCompare(b.name))
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
const formatDate = (iso: string) => {
  const businessDate = iso.slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(businessDate)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : businessDate
}

// const formatTime = (iso: string) =>
//      new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const formatTime = (iso: string) => iso.substring(11, 16)

const getInitials = (name?: string) => {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Filtres computés ─────────────────────────────────────────────────────────
const hasActiveFilters = computed(() =>
    filterEmployee.value !== '' ||
    filterEmployeeGuid.value !== '' ||
    filterSiteGuid.value !== '' ||
    filterNature.value !== '' ||
    filterType.value !== '' ||
    filterPhoto.value !== '' ||
    filterStatus.value !== '' ||
    filterControl.value !== '' ||
    attentionOnly.value ||
    filterMemo.value !== ''
)

const attentionOnly = ref(false)
const filterMemo = ref<'with' | 'without' | 'pending' | ''>('')
type MemoIndexItem = { guid: string; memo_status?: string; affected_entries?: string[] }
const memosByGuid = ref<Record<string, MemoIndexItem>>({})
const memosByEntry = ref<Record<string, string[]>>({})
const memoSyncLoading = ref(false)
const memoSyncError = ref(false)
const memoStatusReady = ref(false)
let memoRequest = 0

function linkedMemos(entry: PointageEntry): MemoIndexItem[] {
  const ids = new Set<string>(memosByEntry.value[entry.guid] ?? [])
  const direct = getMemoReference(entry)?.guid
  if (direct) ids.add(direct)
  return [...ids].map(guid => memosByGuid.value[guid]).filter((memo): memo is MemoIndexItem => Boolean(memo))
}
function hasLinkedMemo(entry: PointageEntry): boolean {
  return Boolean(getMemoReference(entry)) || (memosByEntry.value[entry.guid]?.length ?? 0) > 0
}
function hasPendingMemo(entry: PointageEntry): boolean {
  return linkedMemos(entry).some(memo => memo.memo_status === 'pending')
}
function memoRowLabel(entry: PointageEntry): string {
  if (hasPendingMemo(entry)) return 'Mémo en attente'
  if (hasLinkedMemo(entry)) return 'Mémo associé'
  return ''
}
const memoCount = computed(() => allEntries.value.filter(hasLinkedMemo).length)
const pendingMemoCount = computed(() => allEntries.value.filter(hasPendingMemo).length)
async function refreshMemos(): Promise<void> {
  const request = ++memoRequest
  const managerGuid = userStore.user?.guid
  memoStatusReady.value = false
  memoSyncError.value = false
  memosByGuid.value = {}
  memosByEntry.value = {}
  if (!managerGuid) return
  memoSyncLoading.value = true
  try {
    const response: any = await MemoService.listMemo(managerGuid)
    if (request !== memoRequest) return
    const payload = response?.data?.memos ?? response?.data?.data?.memos ?? response?.data?.data ?? response?.data
    const items: unknown = Array.isArray(payload) ? payload : payload?.items
    if (response?.success === false || !Array.isArray(items)) throw new Error('Liste des mémos indisponible')
    const byGuid: Record<string, MemoIndexItem> = {}
    const byEntry: Record<string, string[]> = {}
    for (const raw of items) {
      if (!raw || typeof raw !== 'object') continue
      const memo = raw as MemoIndexItem
      if (typeof memo.guid !== 'string') continue
      byGuid[memo.guid] = memo
      if (!Array.isArray(memo.affected_entries)) continue
      for (const id of memo.affected_entries) {
        if (typeof id !== 'string') continue
        ;(byEntry[id] ??= []).push(memo.guid)
      }
    }
    memosByGuid.value = byGuid
    memosByEntry.value = byEntry
    // La liste peut être paginée : ne pas présenter un statut global comme exhaustif.
    const pagination = payload?.pagination
    const limit = Number(pagination?.limit)
    const count = Number(pagination?.count)
    memoStatusReady.value = Number.isFinite(limit) && Number.isFinite(count)
      ? count < limit && Number(pagination?.offset ?? 0) === 0
      : Array.isArray(payload)
    if (!memoStatusReady.value && filterMemo.value === 'pending') filterMemo.value = ''
  } catch (cause) {
    if (request !== memoRequest) return
    console.warn('[Pointages] Chargement du suivi des mémos impossible', cause)
    memoSyncError.value = true
    if (filterMemo.value === 'pending') filterMemo.value = ''
  } finally {
    if (request === memoRequest) memoSyncLoading.value = false
  }
}
const needsAttention = (entry: PointageEntry) => {
  const tone = getPointageOverview(entry).tone
  return tone === 'warning' || tone === 'danger' || hasPendingMemo(entry)
}
const attentionCount = computed(() => allEntries.value.filter(needsAttention).length)
const filteredEntries = computed(() => {
  let entries = [...allEntries.value]
  if (filterSiteGuid.value) entries = entries.filter(entry => entry.site?.guid === filterSiteGuid.value)

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

  if (filterControl.value === 'invalid') entries = entries.filter(e => e.is_valid === false)
  if (filterControl.value === 'validation') entries = entries.filter(e => e.requires_validation === true)
  if (filterControl.value === 'outside') entries = entries.filter(e => e.within_geofence === false)
  if (filterControl.value === 'anomaly') entries = entries.filter(e => e.has_anomalies === true)

  if (filterMemo.value === 'with') entries = entries.filter(hasLinkedMemo)
  if (filterMemo.value === 'without') entries = entries.filter(e => !hasLinkedMemo(e))
  if (filterMemo.value === 'pending' && memoStatusReady.value) entries = entries.filter(hasPendingMemo)
  if (attentionOnly.value) entries = entries.filter(needsAttention)

  // Tri chronologique décroissant
  return entries.sort((a, b) => new Date(b.clocked_at).getTime() - new Date(a.clocked_at).getTime())
})

// ─── Stats ────────────────────────────────────────────────────────────────────
const stats = computed(() => {
  const entries = filteredEntries.value
  return {
    total: entries.length,
    attention: entries.filter(needsAttention).length,
    outside: entries.filter(entry => entry.within_geofence === false).length,
    withMemo: entries.filter(hasLinkedMemo).length,
    employes: new Set(entries.map(entry => entry.user?.guid).filter(Boolean)).size,
  }
})
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
  filterSiteGuid.value     = ''
  filterEmployee.value     = ''
  filterEmployeeGuid.value = ''
  filterNature.value       = ''
  filterType.value         = ''
  filterPhoto.value        = ''
  filterStatus.value       = ''
  filterControl.value      = ''
  attentionOnly.value = false
  filterMemo.value = ''
  currentPage.value        = 1
}

const openDetail = (entry: PointageEntry) => {
  selectedEntry.value = entry
}

// Menu contextuel ancré au bouton, sans découpe par le défilement horizontal du tableau.
const actionMenuEntry = ref<PointageEntry | null>(null)
const actionMenuStyle = ref<Record<string, string>>({})
const closeActionMenu = () => { actionMenuEntry.value = null }
function toggleActionMenu(entry: PointageEntry, event: MouseEvent) {
  if (actionMenuEntry.value?.guid === entry.guid) { closeActionMenu(); return }
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  const estimatedHeight = 184
  actionMenuStyle.value = {
    left: `${Math.max(8, Math.min(rect.right - 240, window.innerWidth - 248))}px`,
    top: `${rect.bottom + estimatedHeight > window.innerHeight ? Math.max(8, rect.top - estimatedHeight) : rect.bottom + 4}px`,
  }
  actionMenuEntry.value = entry
}
function menuViewDetail() {
  const entry = actionMenuEntry.value
  closeActionMenu()
  if (entry) openDetail(entry)
}
async function menuLocate() {
  const entry = actionMenuEntry.value
  closeActionMenu()
  if (!entry || !parsePointageCoordinates(entry.coordinates)) return
  openDetail(entry)
  await nextTick()
  document.getElementById('pointage-location-map')?.scrollIntoView({behavior: 'smooth', block: 'center'})
}
function menuOpenMemo() {
  const entry = actionMenuEntry.value
  closeActionMenu()
  const memo = entry && getMemoReference(entry)
  if (memo && entry) void router.push({ name: 'memoList', query: {memoGuid: memo.guid, entryGuid: entry.guid} })
}
function menuShowEmployeeDay() {
  const entry = actionMenuEntry.value
  closeActionMenu()
  if (!entry?.user?.guid) return
  selectedEntry.value = null
  filterEmployee.value = ''
  filterEmployeeGuid.value = entry.user.guid
  const day = entry.clocked_at.slice(0, 10)
  filterStartDate.value = day
  filterEndDate.value = day
  currentPage.value = 1
  void loadEntries()
}
function handleMenuEscape(event: KeyboardEvent) { if (event.key === 'Escape') closeActionMenu() }
function closeMenuOnScroll() { closeActionMenu() }
onMounted(() => { window.addEventListener('keydown', handleMenuEscape); window.addEventListener('scroll', closeMenuOnScroll, true) })
onBeforeUnmount(() => { window.removeEventListener('keydown', handleMenuEscape); window.removeEventListener('scroll', closeMenuOnScroll, true) })

const openRequestedSourceEntry = () => {
  if (!sourceEntryGuid.value && !sourceSessionGuid.value) {
    resolvedSourceEntryGuid.value = null
    return
  }

  let target: PointageEntry | undefined

  if (sourceEntryGuid.value) {
    target = allEntries.value.find(entry => entry.guid === sourceEntryGuid.value)
  }

  if (!target && sourceSessionGuid.value) {
    const sessionEntries = allEntries.value.filter(
        entry => entry.session?.guid === sourceSessionGuid.value,
    )
    target = sessionEntries.find(entry => entry.pointage_type === 'clock_in') ?? sessionEntries[0]
  }

  if (!target) {
    resolvedSourceEntryGuid.value = null
    return
  }

  resolvedSourceEntryGuid.value = target.guid
  selectedEntry.value = target

  const filteredIndex = filteredEntries.value.findIndex(entry => entry.guid === target?.guid)
  if (filteredIndex >= 0) {
    currentPage.value = Math.floor(filteredIndex / pageSize.value) + 1
  }
}

// ─── Chargement des données ───────────────────────────────────────────────────
const loadEntries = async () => {
  if (loading.value || !filterStartDate.value || !filterEndDate.value || filterStartDate.value > filterEndDate.value) return
  const requestedStartDate = filterStartDate.value
  const requestedEndDate = filterEndDate.value
  try {
    loading.value = true
    error.value   = null

    const managerGuid = userStore.user?.guid
    if (!managerGuid) throw new Error('Utilisateur non connecté')

    const response = await EntriesService.listEntries(managerGuid, {
      startDate: requestedStartDate,
      endDate  : requestedEndDate,
    })
    if (!response?.success) throw new Error('Erreur API')

    const data = response as PeriodAttendanceResponse
    allEntries.value = (data.data?.data?.entries || []) as PointageEntry[]
    loadedStartDate.value = requestedStartDate
    loadedEndDate.value = requestedEndDate
    currentPage.value = 1
    openRequestedSourceEntry()
    void refreshMemos()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement'
  } finally {
    loading.value = false
  }
}

const exportLoading = ref(false)

const handleExportPDF = () => {
  if (exportLoading.value) return
  exportLoading.value = true

  try {
    const options: PointagesExportOptions = {
      entries      : filteredEntries.value,
      periodFrom   : loadedStartDate.value,
      periodTo     : loadedEndDate.value,
      generatedBy  : userStore.fullName ?? 'Manager',
      tenantName   : (userStore).tenantName ?? undefined,
      reportRef    : `ATT-${new Date().toISOString().slice(0,10).replace(/-/g,'')}` +
          `-${String(Math.floor(Math.random()*999999)).padStart(6,'0')}`,
      activeFilters: [
        filterSiteGuid.value ? `Site : ${uniqueSites.value.find(site => site.guid === filterSiteGuid.value)?.name || filterSiteGuid.value}` : '',
        filterNature.value   ? `Nature : ${filterNature.value}`   : '',
        filterType.value     ? `Type : ${filterType.value}`       : '',
        filterPhoto.value    ? `Photo : ${filterPhoto.value}`     : '',
        filterStatus.value   ? `Statut : ${filterStatus.value}`   : '',
      ].filter(Boolean).join(' · ') || 'Aucun filtre supplémentaire',
    }
    exportPointagesPDF(options)
  } finally {
    exportLoading.value = false
  }
}

watch([filterSiteGuid, filterStatus, filterControl, filterMemo, filterNature, filterType, filterPhoto, filterEmployee, filterEmployeeGuid, attentionOnly], () => { currentPage.value = 1 })

onMounted(async () => {
  await loadEntries()
})
</script>