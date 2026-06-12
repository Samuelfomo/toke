<template>
  <div class="flex min-h-screen bg-gradient-to-r from-[#d0e8f7] via-[#f0e4f5] to-[#d0e8f7]">
    <div class="flex flex-col w-full">
      <Header />

      <!-- Loader -->
      <div v-if="isLoading" class="fixed inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm z-50">
        <div class="w-14 h-14 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p class="mt-4 font-medium text-gray-500 text-sm">Chargement des données...</p>
      </div>

      <div class="flex-grow flex">
        <main class="flex-grow lg:pl-32 py-8 px-4 lg:px-8 w-full max-w-[1600px] m-auto">

          <!-- ── En-tête page ─────────────────────────────────────── -->
          <div class="mb-6 flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <h1 class="text-2xl font-bold text-gray-900">Sites</h1>
              </div>
              <p class="text-sm text-gray-500 ml-10">Gérez vos sites de travail et zones autorisées</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                  @click="goToAddSite"
                  class="h-10 px-5 bg-indigo-600 text-white rounded-xl font-semibold text-sm
                       hover:bg-indigo-700 active:scale-95 flex items-center gap-2
                       shadow-lg shadow-indigo-200 transition-all duration-150">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14M5 12h14"/>
                </svg>
                Ajouter un site
              </button>
              <button class="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- ── KPI Cards ────────────────────────────────────────── -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <!-- Total -->
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                  </svg>
                </div>
                <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total des sites</span>
              </div>
              <p class="text-3xl font-bold text-gray-900">{{ sites.length }}</p>
              <p class="text-xs text-gray-400 mt-1">Tous les sites</p>
            </div>

            <!-- Actifs -->
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Sites actifs</span>
              </div>
              <p class="text-3xl font-bold text-gray-900">{{ kpi.active }}</p>
              <p class="text-xs text-gray-400 mt-1">Actuellement actifs</p>
            </div>

            <!-- Publics -->
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"/>
                  </svg>
                </div>
                <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Sites publics</span>
              </div>
              <p class="text-3xl font-bold text-gray-900">{{ kpi.public }}</p>
              <p class="text-xs text-gray-400 mt-1">Accessibles publiquement</p>
            </div>

            <!-- Privés -->
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Sites privés</span>
              </div>
              <p class="text-3xl font-bold text-gray-900">{{ kpi.private }}</p>
              <p class="text-xs text-gray-400 mt-1">Accès restreint</p>
            </div>
          </div>

          <!-- ── Carte principale ────────────────────────────────── -->
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">

            <!-- Barre de recherche + filtres + toggle vue -->
            <div class="p-5 border-b border-gray-100">
              <div class="flex flex-col lg:flex-row gap-3">

                <!-- Recherche -->
                <div class="relative flex-grow">
                  <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input
                      type="text"
                      v-model="searchTerm"
                      placeholder="Rechercher un site, une adresse, une ville..."
                      class="w-full h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl
                           text-sm text-gray-700 placeholder:text-gray-400
                           focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                           transition-all duration-150"/>
                </div>

                <!-- Filtres -->
                <div class="flex items-center gap-2 flex-wrap">
                  <!-- Filtre Type -->
                  <div class="relative">
                    <select
                        v-model="filterType"
                        class="h-10 pl-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl
                             text-sm text-gray-700 appearance-none cursor-pointer
                             focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                             transition-all duration-150">
                      <option value="">Type de site</option>
                      <option v-for="t in siteTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </div>

                  <!-- Filtre Statut -->
                  <div class="relative">
                    <select
                        v-model="filterActive"
                        class="h-10 pl-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl
                             text-sm text-gray-700 appearance-none cursor-pointer
                             focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                             transition-all duration-150">
                      <option value="">Statut</option>
                      <option value="true">Actif</option>
                      <option value="false">Inactif</option>
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </div>

                  <!-- Filtre Visibilité -->
                  <div class="relative">
                    <select
                        v-model="filterVisibility"
                        class="h-10 pl-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl
                             text-sm text-gray-700 appearance-none cursor-pointer
                             focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                             transition-all duration-150">
                      <option value="">Visibilité</option>
                      <option value="true">Public</option>
                      <option value="false">Privé</option>
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </div>

                  <!-- Badge filtres actifs -->
                  <button
                      v-if="hasActiveFilters"
                      @click="clearFilters"
                      class="h-10 px-3 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 text-xs font-medium
                           flex items-center gap-1.5 hover:bg-indigo-100 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Filtres
                  </button>

                  <!-- Toggle vue liste / grille -->
                  <div class="flex items-center bg-gray-100 rounded-xl p-1 ml-1">
                    <button
                        @click="viewMode = 'list'"
                        :class="viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'"
                        class="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                      </svg>
                    </button>
                    <button
                        @click="viewMode = 'grid'"
                        :class="viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'"
                        class="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── VUE LISTE (tableau) ─────────────────────────── -->
            <div v-if="viewMode === 'list'" class="overflow-x-auto">
              <table class="min-w-full">
                <thead>
                <tr class="bg-gray-50 border-b border-gray-100">
                  <th class="py-3.5 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Site</th>
                  <th class="py-3.5 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th class="py-3.5 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Adresse</th>
                  <th class="py-3.5 px-5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th class="py-3.5 px-5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Visibilité</th>
                  <th class="py-3.5 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Créé le</th>
                  <th class="py-3.5 px-5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                <tr
                    v-for="site in paginatedSites"
                    :key="site.guid"
                    class="hover:bg-gray-50/60 transition-colors duration-100 group">

                  <!-- Site (miniature SVG + nom + adresse) -->
                  <td class="py-4 px-5">
                    <div class="flex items-center gap-3">
                      <!-- Miniature polygone SVG -->
                      <div class="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex-shrink-0 overflow-hidden">
                        <svg
                            :viewBox="getSvgViewBox(site.geofence_polygon.coordinates)"
                            xmlns="http://www.w3.org/2000/svg"
                            class="w-full h-full">
                          <polygon
                              :points="getSvgPoints(site.geofence_polygon.coordinates)"
                              fill="rgba(99,102,241,0.25)"
                              stroke="rgb(99,102,241)"
                              stroke-width="0.0008"
                              stroke-linejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <p class="font-semibold text-sm text-gray-900">{{ site.name }}</p>
                        <p class="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          </svg>
                          {{ site.address?.location }}, {{ site.address?.city }}
                        </p>
                        <p class="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                          </svg>
                          {{ site.address?.place_name }}
                        </p>
                      </div>
                    </div>
                  </td>

                  <!-- Type -->
                  <td class="py-4 px-5">
                      <span
                          class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold"
                          :class="siteTypeBadge(site.site_type!).class">
                        {{ siteTypeBadge(site.site_type!).label }}
                      </span>
                  </td>

                  <!-- Adresse détaillée -->
                  <td class="py-4 px-5">
                    <p class="text-sm text-gray-700">{{ site.address?.city }}</p>
                    <p class="text-xs text-gray-400">{{ site.address?.location }}</p>
                  </td>

                  <!-- Statut -->
                  <td class="py-4 px-5 text-center">
                      <span
                          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                          :class="site.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'">
                        <span class="w-1.5 h-1.5 rounded-full" :class="site.active ? 'bg-emerald-500' : 'bg-red-400'"></span>
                        {{ site.active ? 'Actif' : 'Inactif' }}
                      </span>
                  </td>

                  <!-- Visibilité -->
                  <td class="py-4 px-5 text-center">
                      <span
                          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                          :class="site.public ? 'bg-sky-50 text-sky-700' : 'bg-gray-100 text-gray-600'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path v-if="site.public" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945"/>
                          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                        {{ site.public ? 'Public' : 'Privé' }}
                      </span>
                  </td>

                  <!-- Date -->
                  <td class="py-4 px-5">
                    <p class="text-sm text-gray-700">{{ formatDate(site.created_at) }}</p>
                    <p class="text-xs text-gray-400">{{ formatTime(site.created_at) }}</p>
                  </td>

                  <!-- Actions -->
                  <td class="py-4 px-5 text-center">
                    <div class="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                          @click="viewSiteMap(site.guid)"
                          class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                          title="Voir sur la carte">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      </button>
                      <button
                          @click="editSite(site.guid)"
                          class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Modifier">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button
                          @click="toggleMenu(site.guid, $event)"
                          class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>

            <!-- ── VUE GRILLE ──────────────────────────────────── -->
            <div v-else class="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <div
                  v-for="site in paginatedSites"
                  :key="site.guid"
                  class="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden hover:border-indigo-200 hover:shadow-md transition-all duration-200 group">

                <!-- Miniature SVG full-width -->
                <div class="h-32 bg-indigo-50 relative overflow-hidden">
                  <svg
                      :viewBox="getSvgViewBox(site.geofence_polygon.coordinates)"
                      xmlns="http://www.w3.org/2000/svg"
                      preserveAspectRatio="xMidYMid meet"
                      class="w-full h-full">
                    <polygon
                        :points="getSvgPoints(site.geofence_polygon.coordinates)"
                        fill="rgba(99,102,241,0.2)"
                        stroke="rgb(99,102,241)"
                        stroke-width="0.0006"
                        stroke-linejoin="round"/>
                    <circle
                        v-for="(pt, i) in getPolygonPoints(site.geofence_polygon.coordinates as any)"
                        :key="i"
                        :cx="pt[0]"
                        :cy="pt[1]"
                        r="0.0004"
                        fill="rgb(99,102,241)"/>
                  </svg>
                  <!-- Badge type -->
                  <div class="absolute top-2 left-2">
                    <span
                        class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold shadow-sm"
                        :class="siteTypeBadge(site.site_type!).class">
                      {{ siteTypeBadge(site.site_type!).label }}
                    </span>
                  </div>
                  <!-- Actions grille -->
                  <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button @click="viewSiteMap(site.guid)" class="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center text-sky-600 hover:bg-white shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    </button>
                    <button @click="editSite(site.guid)" class="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center text-indigo-600 hover:bg-white shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    <button @click="toggleMenu(site.guid, $event)" class="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center text-gray-500 hover:bg-white shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div class="p-4">
                  <h3 class="font-semibold text-sm text-gray-900 truncate">{{ site.name }}</h3>
                  <p class="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    </svg>
                    <span class="truncate">{{ site.address?.location }}, {{ site.address?.city }}</span>
                  </p>
                  <div class="flex items-center gap-2 mt-3">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                          :class="site.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'">
                      <span class="w-1.5 h-1.5 rounded-full" :class="site.active ? 'bg-emerald-500' : 'bg-red-400'"></span>
                      {{ site.active ? 'Actif' : 'Inactif' }}
                    </span>
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                          :class="site.public ? 'bg-sky-50 text-sky-700' : 'bg-gray-100 text-gray-500'">
                      {{ site.public ? 'Public' : 'Privé' }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-400 mt-2">{{ formatDate(site.created_at) }}</p>
                </div>
              </div>
            </div>

            <!-- État vide -->
            <div
                v-if="!isLoading && filteredSites.length === 0"
                class="py-20 text-center">
              <div class="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <p class="text-base font-semibold text-gray-600">Aucun site trouvé</p>
              <p class="text-sm text-gray-400 mt-1">Essayez de modifier vos critères de recherche</p>
            </div>

            <!-- Pagination -->
            <div
                v-if="filteredSites.length > 0"
                class="px-5 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <p class="text-sm text-gray-500">
                Affichage
                <span class="font-semibold text-gray-700">{{ paginationStart }}</span>
                à
                <span class="font-semibold text-gray-700">{{ paginationEnd }}</span>
                sur
                <span class="font-semibold text-gray-700">{{ filteredSites.length }}</span>
                sites
              </p>
              <div class="flex items-center gap-1.5">
                <button
                    @click="prevPage"
                    :disabled="currentPage === 1"
                    class="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500
                         hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all duration-150">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
                <button
                    v-for="page in visiblePages"
                    :key="page"
                    @click="currentPage = page"
                    :class="currentPage === page
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'"
                    class="w-8 h-8 rounded-lg border text-sm font-medium transition-all duration-150">
                  {{ page }}
                </button>
                <button
                    @click="nextPage"
                    :disabled="currentPage === totalPages"
                    class="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500
                         hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all duration-150">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- ── Bandeau aide ────────────────────────────────────── -->
          <div class="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <div>
                <p class="font-semibold text-white text-sm">Besoin d'aide pour gérer vos sites ?</p>
                <p class="text-sm text-slate-400 mt-1">Consultez notre guide complet pour créer, modifier et sécuriser vos zones géographiques.</p>
              </div>
            </div>
            <button class="h-9 px-5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-medium
                           hover:bg-white/20 flex items-center gap-2 transition-colors flex-shrink-0">
              Voir le guide
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
            </button>
          </div>

        </main>
      </div>
      <Footer />

      <!-- Dropdown menu contextuel (Teleport) -->
      <Teleport to="body">
        <div
            v-if="activeMenu !== null"
            :style="menuPosition"
            class="fixed w-48 rounded-xl shadow-xl bg-white border border-gray-100 overflow-hidden"
            style="z-index: 9999;">
          <div class="py-1.5">
            <button
                @click="viewSiteMap(activeMenu!)"
                class="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
              </svg>
              Voir sur la carte
            </button>
            <button
                @click="editSite(activeMenu!)"
                class="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Modifier
            </button>
            <div class="border-t border-gray-100 my-1"></div>
            <button
                @click="deleteSite(activeMenu!)"
                class="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Supprimer
            </button>
          </div>
        </div>
      </Teleport>

      <!-- Toast notification -->
      <div
          ref="toastRef"
          class="fixed right-6 top-6 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white text-sm font-medium z-[100]
               opacity-0 translate-y-2 transition-all duration-300 pointer-events-none"
          :class="messageType === 'success' ? 'bg-emerald-500' : 'bg-red-500'">
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path v-if="messageType === 'success'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        {{ messageText }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter } from 'vue-router';
import gsap from 'gsap';

import Header from '@/views/components/header.vue';
import Footer from '@/views/components/footer.vue';
import HeadBuilder from '@/utils/HeadBuilder';
import SiteService from '@/service/SiteService';
import { Site, Sites, SitesResponse } from '@/utils/interfaces/site.interface';

// ─── Enums ─────────────────────────────────────────────────────────────────────

enum SiteType {
  MANAGER = 'manager_site',
  GLOBAL = 'global_site',
  TEMPORARY = 'temporary_site',
  PUBLIC = 'public_site',
}

// ─── State ─────────────────────────────────────────────────────────────────────

const router = useRouter();
const isLoading = ref(false);
const sites = ref<Site[]>([]);

const searchTerm = ref('');
const filterType = ref('');
const filterActive = ref('');
const filterVisibility = ref('');
const viewMode = ref<'list' | 'grid'>('list');

const currentPage = ref(1);
const entriesPerPage = ref(10);

const activeMenu = ref<string | null>(null);
const menuPosition = ref<Record<string, string>>({});

const toastRef = ref<HTMLElement | null>(null);
const messageType = ref<'success' | 'error'>('success');
const messageText = ref('');

// ─── Options filtres ────────────────────────────────────────────────────────────

const siteTypeOptions = [
  { value: SiteType.GLOBAL,    label: 'Global Site' },
  { value: SiteType.MANAGER,   label: 'Manager Site' },
  { value: SiteType.PUBLIC,    label: 'Public Site' },
  { value: SiteType.TEMPORARY, label: 'Temporary Site' },
];

// ─── Badge type ────────────────────────────────────────────────────────────────

const siteTypeBadge = (type: string) => {
  const map: Record<string, { label: string; class: string }> = {
    [SiteType.GLOBAL]:    { label: 'Global Site',    class: 'bg-indigo-50 text-indigo-700' },
    [SiteType.MANAGER]:   { label: 'Manager Site',   class: 'bg-purple-50 text-purple-700' },
    [SiteType.PUBLIC]:    { label: 'Public Site',    class: 'bg-sky-50 text-sky-700' },
    [SiteType.TEMPORARY]: { label: 'Temporary Site', class: 'bg-amber-50 text-amber-700' },
  };
  return map[type] ?? { label: type, class: 'bg-gray-100 text-gray-600' };
};

// ─── KPI ───────────────────────────────────────────────────────────────────────

const kpi = computed(() => ({
  active:  sites.value.filter(s => s.active).length,
  public:  sites.value.filter(s => s.public).length,
  private: sites.value.filter(s => !s.public).length,
}));

// ─── Filtres ───────────────────────────────────────────────────────────────────

const hasActiveFilters = computed(() =>
    !!searchTerm.value || !!filterType.value || !!filterActive.value || !!filterVisibility.value
);

const clearFilters = () => {
  searchTerm.value = '';
  filterType.value = '';
  filterActive.value = '';
  filterVisibility.value = '';
};

const filteredSites = computed(() => {
  let result = sites.value;

  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    result = result.filter(s =>
        [s.name, s.site_type, s.address?.city, s.address?.location, s.address?.place_name]
            .filter(Boolean)
            .some(f => f!.toLowerCase().includes(term))
    );
  }

  if (filterType.value) {
    result = result.filter(s => s.site_type === filterType.value);
  }

  if (filterActive.value !== '') {
    const active = filterActive.value === 'true';
    result = result.filter(s => s.active === active);
  }

  if (filterVisibility.value !== '') {
    const pub = filterVisibility.value === 'true';
    result = result.filter(s => s.public === pub);
  }

  return result;
});

// ─── Pagination ────────────────────────────────────────────────────────────────

const totalPages = computed(() => Math.max(1, Math.ceil(filteredSites.value.length / entriesPerPage.value)));

const paginatedSites = computed(() => {
  const start = (currentPage.value - 1) * entriesPerPage.value;
  return filteredSites.value.slice(start, start + entriesPerPage.value);
});

const paginationStart = computed(() => Math.min((currentPage.value - 1) * entriesPerPage.value + 1, filteredSites.value.length));
const paginationEnd   = computed(() => Math.min(currentPage.value * entriesPerPage.value, filteredSites.value.length));

const visiblePages = computed(() => {
  const pages: number[] = [];
  const total = totalPages.value;
  const cur = currentPage.value;
  const delta = 1;
  for (let i = Math.max(1, cur - delta); i <= Math.min(total, cur + delta); i++) {
    pages.push(i);
  }
  return pages;
});

const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++; };
const prevPage = () => { if (currentPage.value > 1) currentPage.value--; };

watch([searchTerm, filterType, filterActive, filterVisibility, entriesPerPage], () => {
  currentPage.value = 1;
});

// ─── SVG Polygon helpers ───────────────────────────────────────────────────────

/**
 * Retourne les coordonnées brutes du polygone (sans le point de fermeture doublon).
 * Format GeoJSON : coordinates[0] = tableau de [lng, lat].
 */
const getPolygonPoints = (polygon: { coordinates: number[][][] }): number[][] => {
  const ring = polygon.coordinates[0];
  if (!ring || ring.length < 2) return [];
  // Le dernier point ferme le polygone (identique au premier) — on l'exclut
  const last = ring[ring.length - 1];
  const first = ring[0];
  const isClosed = first[0] === last[0] && first[1] === last[1];
  return isClosed ? ring.slice(0, -1) : ring;
};

/**
 * Calcule un viewBox SVG avec un padding de 10% autour du polygone.
 * Coordonnées GeoJSON = [lng, lat] → en SVG on utilise lng comme X et lat comme Y
 * (pas besoin d'inverser car on normalise via viewBox).
 */
const getSvgViewBox = (coordinates: number[][][]): string => {
  const pts = getPolygonPoints({ coordinates });
  if (pts.length === 0) return '0 0 1 1';

  const xs = pts.map(p => p[0]);
  const ys = pts.map(p => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const w = maxX - minX || 0.001;
  const h = maxY - minY || 0.001;
  const pad = Math.max(w, h) * 0.15;

  return `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`;
};

/**
 * Convertit les coordonnées en chaîne de points SVG "x,y x,y ..."
 */
const getSvgPoints = (coordinates: number[][][]): string => {
  const pts = getPolygonPoints({ coordinates });
  return pts.map(p => `${p[0]},${p[1]}`).join(' ');
};

// ─── Formatage dates ───────────────────────────────────────────────────────────

const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// ─── Navigation ────────────────────────────────────────────────────────────────

const goToAddSite = () => router.push('/sites/add');

const editSite = (guid: string) => {
  activeMenu.value = null;
  router.push({ name: 'edit', query: { guid } });
};

const viewSiteMap = (guid: string) => {
  activeMenu.value = null;
  router.push({ name: 'map', query: { guid } });
};

// ─── Menu contextuel ───────────────────────────────────────────────────────────

const toggleMenu = (guid: string, event: MouseEvent) => {
  if (activeMenu.value === guid) { activeMenu.value = null; return; }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  menuPosition.value = {
    top:   `${rect.bottom + 6}px`,
    right: `${window.innerWidth - rect.right}px`,
  };
  activeMenu.value = guid;
};

const handleOutsideClick = (e: MouseEvent) => {
  if (!activeMenu.value) return;
  const t = e.target as HTMLElement;
  if (!t.closest('[data-menu-trigger]') && !t.closest('[data-menu-dropdown]')) {
    activeMenu.value = null;
  }
};

// ─── Suppression ───────────────────────────────────────────────────────────────

const deleteSite = async (guid: string) => {
  activeMenu.value = null;
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce site ?')) return;
  try {
    messageType.value = 'success';
    messageText.value = 'Site supprimé avec succès';
    showToast();
    await loadSites();
  } catch {
    messageType.value = 'error';
    messageText.value = 'Erreur lors de la suppression';
    showToast();
  }
};

// ─── Toast ─────────────────────────────────────────────────────────────────────

const showToast = () => {
  gsap.to(toastRef.value, {
    opacity: 1, y: 0, duration: 0.35, ease: 'power3.out',
    onComplete: () => {
      setTimeout(() => {
        gsap.to(toastRef.value, { opacity: 0, y: -8, duration: 0.3 });
      }, 3000);
    }
  });
};

// ─── Chargement données ────────────────────────────────────────────────────────

const loadSites = async () => {
  isLoading.value = true;
  try {
    const res: SitesResponse = await SiteService.listSites();
    if (res.success) {
      sites.value = res.data.sites.items;
    }
  } catch (e) {
    console.error('Erreur chargement sites:', e);
  } finally {
    isLoading.value = false;
  }
};

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  HeadBuilder.apply({ title: 'Sites - Toké', css: [], meta: { viewport: 'width=device-width, initial-scale=1.0' } });
  await loadSites();
  document.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
});
</script>