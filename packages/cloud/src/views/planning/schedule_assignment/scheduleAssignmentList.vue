<template>
  <div class="mx-auto flex h-full w-full max-w-[1500px] flex-col overflow-hidden bg-slate-50 px-4 pb-5 sm:px-6 lg:px-8">

    <!-- ── En-tête ── -->
    <div class="py-5 flex-shrink-0">
      <div class="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <div class="flex items-center gap-1.5 text-slate-400 text-xs mb-1.5 font-medium">
            <IconCalendarStats :size="11"/>
            <span>Planning & Rotations</span>
            <IconChevronRight :size="11"/>
            <span class="text-slate-800">Planning standard</span>
          </div>
          <h1 class="text-xl font-bold text-slate-900 tracking-tight">Planning standard</h1>
          <p class="text-slate-400 text-sm mt-0.5">Visualisez le planning par blocs horaires sur la période
            sélectionnée.</p>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <div class="relative" ref="exportDropdownRef">
            <button @click="exportDropdownOpen = !exportDropdownOpen"
                    class="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition">
              <IconUpload :size="14"/>
              Exporter
              <IconChevronDown :size="13" class="text-slate-400"/>
            </button>
            <Transition name="dropdown">
              <div v-if="exportDropdownOpen"
                   class="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                <button @click="handleExportCSV" :disabled="!canExport || exportLoading === 'csv'"
                        class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed">
                  <IconFileText :size="15" class="text-green-500"/>
                  <span>Exporter CSV</span>
                  <IconLoader2 v-if="exportLoading === 'csv'" :size="12" class="ml-auto animate-spin text-slate-400"/>
                </button>
                <button @click="handleExportPDF" :disabled="!canExport || exportLoading === 'pdf'"
                        class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed">
                  <IconFile :size="15" class="text-red-500"/>
                  <span>Aperçu PDF</span>
                  <IconLoader2 v-if="exportLoading === 'pdf'" :size="12" class="ml-auto animate-spin text-slate-400"/>
                </button>
              </div>
            </Transition>
          </div>

          <button @click="handleExportExcel" :disabled="!canExport || exportLoading === 'excel'"
                  class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-200 transition disabled:opacity-40 disabled:cursor-not-allowed">
            <IconLoader2 v-if="exportLoading === 'excel'" :size="14" class="animate-spin"/>
            <IconTable v-else :size="14"/>
            Générer Excel
          </button>

          <button @click="openPlanningSuggestionModule"
                  class="flex items-center gap-2 px-4 py-2.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold rounded-xl transition">
            <IconSparkles :size="15"/>
            Planification assistée
          </button>

          <button @click="openCreate"
                  class="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-200 transition">
            <IconPlus :size="15"/>
            Nouvelle affectation
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto">

      <!-- ── Barre de filtres ── -->
      <div class="bg-white border border-slate-100 px-2 py-3 flex items-center gap-4 flex-wrap flex-shrink-0">

        <div class="flex flex-col gap-1">
          <span class="text-xs text-slate-400 font-bold uppercase tracking-wide">Type</span>
          <div class="flex rounded-lg border border-slate-200 overflow-hidden">
            <button @click="setTargetType('user')"
                    class="px-3 py-1.5 text-xs font-semibold transition"
                    :class="filterType === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'"
            >Employé
            </button>
            <button @click="setTargetType('group')"
                    class="px-3 py-1.5 text-xs font-semibold transition border-l border-slate-200"
                    :class="filterType === 'group' ? 'bg-blue-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'"
            >Groupe
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-1 min-w-[220px]">
        <span class="text-xs text-slate-400 font-bold uppercase tracking-wide">
          {{ filterType === 'group' ? 'Groupe' : 'Employé' }}
        </span>
          <div class="relative">
            <IconUsers v-if="filterType === 'group'" :size="13"
                       class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
            <IconUser v-else :size="13"
                      class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
            <select v-model="selectedTargetGuid"
                    class="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition cursor-pointer">
              <option value="">{{ filterType === 'group' ? 'Tous les groupes' : 'Tous les employés' }}</option>
              <option v-for="t in availableTargets" :key="t.guid" :value="t.guid">{{ t.name }}</option>
            </select>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <span class="text-xs text-slate-400 font-bold uppercase tracking-wide">Période</span>
          <div class="flex items-center gap-1.5">
            <input type="date" v-model="periodFrom" class="filter-input text-xs py-1.5 cursor-pointer"/>
            <IconArrowRight :size="12" class="text-slate-300 flex-shrink-0"/>
            <input type="date" v-model="periodTo" :min="periodFrom" class="filter-input text-xs py-1.5 cursor-pointer"/>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <span class="text-xs text-slate-400 font-bold uppercase tracking-wide">Vue</span>
          <div class="flex rounded-lg border border-slate-200 overflow-hidden">
            <button @click="setViewMode('week')"
                    class="px-3 py-1.5 text-xs font-semibold transition"
                    :class="viewMode === 'week' ? 'bg-blue-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'"
            >Semaine
            </button>
            <button @click="setViewMode('month')"
                    class="px-3 py-1.5 text-xs font-semibold transition border-l border-slate-200"
                    :class="viewMode === 'month' ? 'bg-blue-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'"
            >Mois
            </button>
            <button @click="setViewMode('programme')"
                    class="px-3 py-1.5 text-xs font-semibold transition border-l border-slate-200"
                    :class="viewMode === 'programme' ? 'bg-blue-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'"
            >Programme
            </button>
          </div>
        </div>

        <!-- Sélecteur nb employés (masqué en vue programme) -->
        <div v-if="viewMode !== 'programme'" class="flex flex-col gap-1">
          <span class="text-xs text-slate-400 font-bold uppercase tracking-wide">Afficher</span>
          <select v-model="employeesPerPage"
                  class="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-400 transition cursor-pointer">
            <option :value="10">10 employés</option>
            <option :value="15">15 employés</option>
            <option :value="25">25 employés</option>
            <option :value="50">50 employés</option>
          </select>
        </div>

        <div class="flex-1"/>

        <button @click="advancedFiltersOpen = !advancedFiltersOpen"
                class="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
                :class="advancedFiltersOpen ? 'bg-slate-50 border-blue-300 text-blue-600' : ''">
          <IconFilter :size="12"/>
          Filtres avancés
        </button>
      </div>

      <!-- ── Filtres avancés ── -->
      <Transition name="slide-down">
        <div v-if="advancedFiltersOpen"
             class="bg-white border border-slate-100 px-2 py-3 flex items-center gap-3 flex-shrink-0">
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500 font-medium">Statut :</span>
            <select v-model="filterStatus" class="filter-input text-xs py-1.5 cursor-pointer">
              <option value="">Tous</option>
              <option value="active">Actif uniquement</option>
              <option value="inactive">Inactif uniquement</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500 font-medium">Recherche :</span>
            <div class="relative">
              <IconSearch :size="12"
                          class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
              <input v-model="searchQuery" type="text" placeholder="Nom, code..."
                     class="filter-input !pl-7 text-base py-1.5 w-44"/>
            </div>
          </div>
          <button @click="resetFilters" class="text-xs text-blue-500 hover:text-blue-600 font-semibold transition ml-2">
            Réinitialiser
          </button>
        </div>
      </Transition>

      <!-- ── Contenu principal ── -->
      <div class="flex-1 overflow-y-auto py-6">

        <div v-if="loading" class="flex items-center justify-center h-64 gap-2 text-slate-400">
          <IconLoader2 :size="20" class="animate-spin text-blue-500"/>
          <span class="text-sm">Chargement du planning...</span>
        </div>

        <div
            v-else-if="unresolvedTemplateGuids.length > 0"
            class="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800"
        >
          <IconAlertTriangle :size="18" class="mt-0.5 flex-shrink-0 text-amber-500"/>
          <div>
            <p class="text-sm font-bold">Certains modèles horaires sont introuvables</p>
            <p class="mt-0.5 text-xs text-amber-700">
              Les affectations existent, mais {{ unresolvedTemplateGuids.length }} modèle(s) ne peuvent pas être résolus :
              {{ unresolvedTemplateGuids.join(', ') }}.
            </p>
          </div>
        </div>

        <div v-if="!loading && allFlatMembers.length === 0"
             class="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
          <div class="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
            <IconAlertTriangle :size="28" class="text-amber-500"/>
          </div>
          <div class="text-center">
            <p class="text-sm font-semibold text-slate-600">Aucune affectation active</p>
            <p class="text-xs text-slate-400 mt-0.5">Aucun planning standard trouvé sur la période sélectionnée.</p>
          </div>
          <button @click="openCreate" class="text-xs font-semibold text-blue-500 hover:text-blue-600 transition">
            + Créer une affectation
          </button>
        </div>

        <template v-else>

          <!-- ── Vue Semaine / Mois ─────────────────────────────────────── -->
          <template v-if="viewMode !== 'programme'">
            <div class="space-y-6">
              <!-- Indicateur employés cachés -->
              <div v-if="hiddenCount > 0"
                   class="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                <IconChevronDown :size="14"/>
                {{ hiddenCount }} employé(s) supplémentaire(s) non affiché(s). Augmentez la limite d'affichage pour les
                voir.
              </div>

              <!-- Légende -->
              <div class="flex items-center gap-4 text-xs text-slate-400 px-1">
                <div class="flex items-center gap-1.5">
                  <div class="w-5 h-5 rounded-md bg-green-100 border border-green-200 flex items-center justify-center">
                    <div class="w-1.5 h-1.5 rounded-full bg-green-500"/>
                  </div>
                  <span>Présent</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="w-5 h-5 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center">
                    <!--                  <span class="text-xs text-amber-500 font-bold">P</span>-->
                    <div class="w-1.5 h-1.5 rounded-full bg-amber-500"/>
                  </div>
                  <span>Pause</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <span class="text-slate-400 text-sm font-medium">—</span>
                  </div>
                  <span>Absent / repos</span>
                </div>
              </div>

              <!-- Un tableau par jour -->
              <div
                  v-for="section in daySections"
                  :key="section.day.iso"
                  class="overflow-hidden border rounded-xl bg-white shadow-sm"
                  :class="section.day.isToday ? 'border-blue-300' : 'border-slate-200'"
              >
                <!-- En-tête jour -->
                <div class="px-4 py-3 border-b flex items-center justify-between"
                     :class="section.day.isToday ? 'bg-blue-50 border-blue-200' : section.day.isWeekend ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-100'">
                  <div class="flex items-center gap-2">
                  <span class="text-xs font-bold uppercase tracking-wide"
                        :class="section.day.isToday ? 'text-blue-600' : 'text-slate-500'">
                    {{ section.day.dayLabel }}
                  </span>
                    <span class="text-sm font-bold"
                          :class="section.day.isToday ? 'text-blue-700' : 'text-slate-800'">
                    {{ section.day.dayNum }}/{{ section.day.monthNum }}
                  </span>
                    <span v-if="section.day.isToday"
                          class="text-xs px-1.5 py-0.5 bg-blue-500 text-white rounded-full font-bold">
                    Aujourd'hui
                  </span>
                    <span v-if="section.day.isWeekend && !section.day.isToday"
                          class="text-xs text-slate-400 italic">Week-end</span>
                  </div>
                  <span v-if="section.blocks.length === 0" class="text-xs text-slate-400 italic">Jour de repos</span>
                  <span v-else class="text-xs text-slate-400">{{ section.blocks.length }} bloc(s) horaire(s)</span>
                </div>

                <!-- Tableau blocs si des blocs existent -->
                <div v-if="section.blocks.length > 0" class="overflow-x-auto">
                  <table class="border-collapse w-full">
                    <thead>
                    <tr class="bg-slate-50 border-b border-slate-100">
                      <!-- Colonne employé -->
                      <th class="px-4 py-2.5 text-left text-xs font-bold text-slate-500 w-48 sticky left-0 bg-slate-50 z-10 border-r border-slate-100">
                        Employé
                      </th>
                      <!-- Colonnes blocs horaires -->
                      <th v-for="block in section.blocks" :key="block.label"
                          class="px-3 py-2.5 text-center text-xs font-bold text-slate-500 min-w-[90px] border-l border-slate-100">
                        {{ block.label }}
                      </th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="member in visibleMembers" :key="member.guid"
                        class="border-b border-slate-100 last:border-0 bg-white hover:bg-slate-50/40 transition">
                      <!-- Colonne employé -->
                      <td class="px-4 py-2.5 sticky left-0 bg-inherit border-r border-slate-100 z-10">
                        <div class="flex items-center gap-2.5">
                          <div
                              class="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                            {{ initials(member.name) }}
                          </div>
                          <div class="min-w-0">
                            <p class="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                              {{ member.name }}</p>
                            <p v-if="member.code" class="text-xs text-slate-400">{{ member.code }}</p>
                          </div>
                        </div>
                      </td>
                      <!-- Cellules blocs -->
                      <td v-for="block in section.blocks" :key="block.label"
                          class="px-2 py-2 text-center border-l border-slate-100">
                        <BlockCell :status="section.matrix[member.guid]?.[block.label] ?? 'absent'"/>
                      </td>
                    </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Jour de repos : pas de tableau -->
                <div v-else class="px-4 py-3 text-xs text-slate-400 italic">
                  Aucun employé planifié ce jour.
                </div>
              </div>
            </div>
          </template>

          <!-- ── Vue Programme ──────────────────────────────────────────── -->
          <template v-else>
            <div class="space-y-6">

              <!-- Titre -->
              <div class="flex items-center justify-between flex-wrap gap-2 px-1">
                <h2 class="text-sm font-bold text-slate-800 tracking-wide">{{ programmeTitre }}</h2>
                <p class="text-xs text-slate-400">{{ periodLabel }} · {{ allFlatMembers.length }} employé(s)</p>
              </div>

              <!-- Légende -->
              <div class="flex items-center gap-4 text-xs text-slate-400 px-1">
                <div class="flex items-center gap-1.5">
                  <div class="w-5 h-5 rounded-md bg-blue-100 border border-blue-200 flex items-center justify-center">
                    <div class="w-1.5 h-1.5 rounded-full bg-blue-500"/>
                  </div>
                  <span>Présent</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="w-5 h-5 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center">
                    <span class="text-xs text-amber-500 font-bold">P</span>
                  </div>
                  <span>Pause</span>
                </div>
              </div>

              <!-- Un tableau par jour (tous les membres) -->
              <div
                  v-for="section in programmeDaySections"
                  :key="section.day.iso"
                  class="overflow-hidden border rounded-xl bg-white shadow-sm"
                  :class="section.day.isToday ? 'border-blue-300' : 'border-slate-200'"
              >
                <!-- En-tête jour -->
                <div class="px-4 py-3 border-b flex items-center justify-between"
                     :class="section.day.isToday ? 'bg-blue-50 border-blue-200' : section.day.isWeekend ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-100'">
                  <div class="flex items-center gap-2">
                  <span class="text-xs font-bold uppercase tracking-wide"
                        :class="section.day.isToday ? 'text-blue-600' : 'text-slate-500'">
                    {{ section.day.dayLabel }}
                  </span>
                    <span class="text-sm font-bold"
                          :class="section.day.isToday ? 'text-blue-700' : 'text-slate-800'">
                    {{ section.day.dayNum }}/{{ section.day.monthNum }}
                  </span>
                    <span v-if="section.day.isToday"
                          class="text-xs px-1.5 py-0.5 bg-blue-500 text-white rounded-full font-bold">
                    Aujourd'hui
                  </span>
                  </div>
                  <span v-if="section.blocks.length === 0" class="text-xs text-slate-400 italic">Jour de repos</span>
                  <span v-else class="text-xs text-slate-400">{{
                      section.blocks.length
                    }} bloc(s) · {{ allFlatMembers.length }} employé(s)</span>
                </div>

                <div v-if="section.blocks.length > 0" class="overflow-x-auto">
                  <table class="border-collapse w-full">
                    <thead>
                    <tr class="bg-slate-50 border-b border-slate-100">
                      <th class="px-4 py-2.5 text-left text-xs font-bold text-slate-500 w-52 sticky left-0 bg-slate-50 z-10 border-r border-slate-100">
                        Employé
                      </th>
                      <th class="px-3 py-2.5 text-left text-xs font-bold text-slate-500 w-36 border-l border-slate-100">
                        Groupe
                      </th>
                      <th v-for="block in section.blocks" :key="block.label"
                          class="px-3 py-2.5 text-center text-xs font-bold text-slate-500 min-w-[90px] border-l border-slate-100">
                        {{ block.label }}
                      </th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="member in allFlatMembers" :key="member.guid"
                        class="border-b border-slate-100 last:border-0 bg-white hover:bg-slate-50/40 transition">
                      <td class="px-4 py-2.5 sticky left-0 bg-inherit border-r border-slate-100 z-10">
                        <div class="flex items-center gap-2.5">
                          <div
                              class="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                            {{ initials(member.name) }}
                          </div>
                          <div class="min-w-0">
                            <p class="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[130px]">
                              {{ member.name }}</p>
                            <p v-if="member.code" class="text-xs text-slate-400">{{ member.code }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="px-3 py-2.5 border-l border-slate-100">
                      <span v-if="member.groupName"
                            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold">
                        <IconUsers :size="9"/>
                        {{ member.groupName }}
                      </span>
                        <span v-else class="text-xs text-slate-400 italic">Sans groupe</span>
                      </td>
                      <td v-for="block in section.blocks" :key="block.label"
                          class="px-2 py-2 text-center border-l border-slate-100">
                        <BlockCell :status="section.matrix[member.guid]?.[block.label] ?? 'absent'"/>
                      </td>
                    </tr>
                    </tbody>
                  </table>
                </div>

                <div v-else class="px-4 py-3 text-xs text-slate-400 italic">
                  Aucun employé planifié ce jour.
                </div>
              </div>
            </div>
          </template>

        </template>
      </div>

      <!-- ── Modal désactivation ── -->
      <Teleport to="body">
        <div v-if="deactivateTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/25 backdrop-blur-sm" aria-hidden="true"/>
          <div role="alertdialog" aria-modal="true" aria-labelledby="deactivate-schedule-assignment-title"
               class="relative bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <IconPower :size="18" class="text-amber-500"/>
              </div>
              <div>
                <p id="deactivate-schedule-assignment-title" class="text-slate-800 font-bold text-sm">Désactiver
                  l'affectation</p>
                <p class="text-slate-400 text-xs mt-0.5">L'affectation sera marquée inactive</p>
              </div>
            </div>
            <p class="text-slate-600 text-sm mb-5">
              Désactiver l'affectation de
              <span class="font-semibold text-slate-800">{{ getTargetName(deactivateTarget) }}</span> ?
            </p>
            <div class="flex gap-2">
              <button type="button" @click="deactivateTarget = null" :disabled="actionLoading"
                      class="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition disabled:cursor-not-allowed disabled:opacity-50">
                Annuler
              </button>
              <button @click="doDeactivate" :disabled="actionLoading"
                      class="flex-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition disabled:opacity-60">
                {{ actionLoading ? '...' : 'Désactiver' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <ScheduleAssignmentForm
          v-if="showForm"
          :assignment="editTarget"
          @close="showForm = false"
          @saved="onSaved"
      />

    </div>
  </div>


</template>
<script setup lang="ts">
import {ref, computed, onMounted, onBeforeUnmount, defineComponent, h, watch} from 'vue'
import {useRouter} from 'vue-router'
import {
  IconCalendarStats, IconChevronRight, IconPlus, IconLoader2,
  IconUser, IconUsers, IconFilter, IconSearch, IconArrowRight,
  IconPower, IconAlertTriangle, IconSparkles,
  IconUpload, IconChevronDown, IconTable,
  IconFile, IconFileText,
} from '@tabler/icons-vue'

import ScheduleAssignmentService from '@/service/ScheduleAssignment'
import SessionTemplateService from '@/service/SessionTemplate'
import ScheduleAssignmentForm from './scheduleAssignmentForm.vue'
import {useBodyScrollLock} from '@/views/planning/composables/useBodyScrollLock'
import {
  getTargetName,
  hasTemplateDefinition,
  isGroupAssignment,
  isPlannedRestAssignment,
  isUserAssignment,
  resolveFullTemplate,
} from './type'
import type {
  IScheduleAssignment,
  ISessionTemplateInline,
} from './type'
import {useUserStore} from '@/stores/userStore'
import {exportScheduleCSV, exportScheduleExcel} from '@/utils/exports/scheduleAssignment.export'
import {exportSchedulePDF} from "@/utils/exports/exportSchedulePDF";

const userStore = useUserStore()
const router = useRouter()

// ── Composant inline BlockCell ─────────────────────────────────────────────
const BlockCell = defineComponent({
  props: {status: {type: String as () => 'work' | 'pause' | 'absent', default: 'absent'}},
  setup(props) {
    return () => {
      if (props.status === 'work') {
        return h('div', {
          class: 'w-full px-3 py-1.5 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center gap-1.5',
        }, [
          h('div', {class: 'w-2 h-2 rounded-full bg-green-500 flex-shrink-0'}),
          h('span', {class: 'text-xs font-semibold text-green-700'}, 'Présent'),
        ])
      }
      if (props.status === 'pause') {
        return h('div', {
          class: 'w-full px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center gap-1.5',
        }, [
          h('div', {class: 'w-2 h-2 rounded-full bg-amber-400 flex-shrink-0'}),
          h('span', {class: 'text-xs font-semibold text-amber-600'}, 'Pause'),
        ])
      }
      return h('span', {class: 'text-slate-300 text-sm font-medium'}, '—')
    }
  },
})

// ── Constants ──────────────────────────────────────────────────────────────
const DAY_FR: Record<string, string> = {
  Mon: 'Lun', Tue: 'Mar', Wed: 'Mer', Thu: 'Jeu', Fri: 'Ven', Sat: 'Sam', Sun: 'Dim',
}
const JS_DAY_TO_KEY: Record<number, string> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun',
}

// ── State ──────────────────────────────────────────────────────────────────
const allAssignments = ref<IScheduleAssignment[]>([])
const sessionTemplates = ref<ISessionTemplateInline[]>([])
const loading = ref(false)

const filterType = ref<'user' | 'group'>('user')
const selectedTargetGuid = ref('')
const viewMode = ref<'week' | 'month' | 'programme'>('week')
const advancedFiltersOpen = ref(false)
const filterStatus = ref('active')
const searchQuery = ref('')
const exportDropdownOpen = ref(false)
const exportDropdownRef = ref<HTMLElement | null>(null)
const exportLoading = ref<'pdf' | 'excel' | 'csv' | null>(null)
const employeesPerPage = ref<number>(10)

const today = new Date()
const monday = new Date(today)
monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
const sunday = new Date(monday)
sunday.setDate(monday.getDate() + 6)

const periodFrom = ref(monday.toISOString().split('T')[0])
const periodTo = ref(sunday.toISOString().split('T')[0])

const showForm = ref(false)
const editTarget = ref<IScheduleAssignment | null>(null)
const deactivateTarget = ref<IScheduleAssignment | null>(null)
const actionLoading = ref(false)

const confirmationOpen = computed(() => Boolean(deactivateTarget.value))
useBodyScrollLock(confirmationOpen)

const templatesByGuid = computed<ReadonlyMap<string, ISessionTemplateInline>>(
    () => new Map(
        sessionTemplates.value.map((template) => [template.guid, template]),
    ),
)

watch(
    [periodFrom, periodTo],
    ([from, to]) => {
      if (from && to && from <= to) load()
    },
)

// ── Helpers horaires ───────────────────────────────────────────────────────
function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m ?? 0)
}

function minToTime(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', {day: '2-digit', month: 'short', year: 'numeric'})
}

// ── Computed : jours calendrier ────────────────────────────────────────────
const calendarDays = computed(() => {
  const days: {
    iso: string; dayLabel: string; dayNum: string; monthNum: string
    isWeekend: boolean; isToday: boolean; jsDay: number
  }[] = []
  const cursor = new Date(periodFrom.value)
  const end = new Date(periodTo.value)
  const todayIso = new Date().toISOString().split('T')[0]
  while (cursor <= end) {
    const iso = cursor.toISOString().split('T')[0]
    const jsDay = cursor.getDay()
    days.push({
      iso,
      dayLabel: DAY_FR[JS_DAY_TO_KEY[jsDay]] ?? '',
      dayNum: String(cursor.getDate()).padStart(2, '0'),
      monthNum: String(cursor.getMonth() + 1).padStart(2, '0'),
      isWeekend: jsDay === 0 || jsDay === 6,
      isToday: iso === todayIso,
      jsDay,
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
})

const periodLabel = computed(() => {
  const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
  return `${fmt(periodFrom.value)} → ${fmt(periodTo.value)}`
})

const programmeTitre = computed(() => {
  const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  })
  return `PROGRAMME DU ${fmt(periodFrom.value)} AU ${fmt(periodTo.value)}`
})

// ── Cibles disponibles ─────────────────────────────────────────────────────
function isInActivePeriod(a: IScheduleAssignment): boolean {
  return a.start_date <= periodTo.value
      && (a.end_date === null || a.end_date >= periodFrom.value)
}

const availableTargets = computed(() => {
  // Mode Employé : tous les individus — directs (family:'user') ET membres de groupes (family:'group')
  if (filterType.value === 'user') {
    const map = new Map<string, string>()
    for (const a of allAssignments.value) {
      if (!isInActivePeriod(a)) continue
      if (isUserAssignment(a)) {
        if (!map.has(a.related.guid))
          map.set(a.related.guid, `${a.related.first_name} ${a.related.last_name}`.trim())
      } else if (isGroupAssignment(a)) {
        for (const m of a.related.members.items) {
          if (!map.has(m.user.guid))
            map.set(m.user.guid, `${m.user.first_name} ${m.user.last_name}`.trim())
        }
      }
    }
    return Array.from(map.entries())
        .map(([guid, name]) => ({guid, name}))
        .filter((t) => !searchQuery.value || t.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }

  // Mode Groupe : les groupes + entrée virtuelle "Sans groupe" pour les assignments user
  const groups = new Map<string, string>()  // guid → name
  let hasDirect = false

  for (const a of allAssignments.value) {
    if (!isInActivePeriod(a)) continue
    if (isGroupAssignment(a)) {
      if (!groups.has(a.related.guid)) groups.set(a.related.guid, a.related.name)
    } else if (isUserAssignment(a)) {
      hasDirect = true
    }
  }

  const result = Array.from(groups.entries())
      .map(([guid, name]) => ({guid, name}))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  if (hasDirect) result.push({guid: '__no_group__', name: 'Sans groupe'})

  return result.filter((t) => !searchQuery.value || t.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

// ── Affectations filtrées ──────────────────────────────────────────────────
const filteredAssignments = computed(() => {
  return allAssignments.value.filter((a) => {
    // Filtre statut actif/inactif
    if (filterStatus.value === 'active' && !a.active) return false
    if (filterStatus.value === 'inactive' && a.active) return false

    // Filtre période
    if (!isInActivePeriod(a)) return false

    // Mode EMPLOYÉ — filtre individuel optionnel
    if (filterType.value === 'user') {
      if (!selectedTargetGuid.value) return true  // tout le monde
      // Chercher le guid dans les assignments directs OU dans les membres d'un groupe
      if (isUserAssignment(a)) {
        return a.related.guid === selectedTargetGuid.value
      }
      if (isGroupAssignment(a)) {
        return a.related.members.items.some(m => m.user.guid === selectedTargetGuid.value)
      }
      return false
    }

    // Mode GROUPE — filtre par groupe ou "Sans groupe"
    if (!selectedTargetGuid.value) return true  // tous groupes + directs
    if (selectedTargetGuid.value === '__no_group__') return isUserAssignment(a)
    return isGroupAssignment(a) && a.related.guid === selectedTargetGuid.value
  })
})

const unresolvedTemplateGuids = computed(() => {
  const guids = new Set<string>()

  for (const assignment of filteredAssignments.value) {
    if (isPlannedRestAssignment(assignment)) continue
    if (resolveFullTemplate(assignment, templatesByGuid.value)) continue
    guids.add(assignment.session_template.guid)
  }

  return Array.from(guids).sort()
})

// ── Membres plats et résolution par date ──────────────────────────────────
type ScheduleSlot = {
  work: [string, string]
  pause?: [string, string]
}

interface FlatMember {
  guid: string
  name: string
  code: string
  groupName: string | null

  /** Vérité d'affichage : planning résolu pour chaque date ISO. */
  scheduleByDate: Record<string, ScheduleSlot[]>

  /** Conservé uniquement pour compatibilité avec les exports existants. */
  schedule: Record<string, ScheduleSlot[]>
}

interface MemberAccumulator {
  guid: string
  name: string
  code: string
  groupName: string | null
  directAssignments: IScheduleAssignment[]
  groupAssignments: IScheduleAssignment[]
}

function assignmentCoversIso(assignment: IScheduleAssignment, iso: string): boolean {
  return assignment.start_date <= iso && (assignment.end_date === null || assignment.end_date >= iso)
}

function dayKeyFromIso(iso: string): string {
  return JS_DAY_TO_KEY[new Date(`${iso}T00:00:00.000Z`).getUTCDay()]
}

function assignmentSlotsForIso(
    assignment: IScheduleAssignment,
    iso: string,
): ScheduleSlot[] {
  // Un repos publié est une affectation volontaire sans bloc horaire.
  if (isPlannedRestAssignment(assignment)) return []

  const template = resolveFullTemplate(
      assignment,
      templatesByGuid.value,
  )
  if (!template) return []

  const key = dayKeyFromIso(iso) as keyof typeof template.definition
  const blocks = template.definition[key]
  if (!Array.isArray(blocks)) return []

  return blocks.map((block) => ({
    work: [block.work[0], block.work[1]],
    pause: block.pause ? [block.pause[0], block.pause[1]] : undefined,
  }))
}

function newestApplicableAssignment(
    assignments: IScheduleAssignment[],
    iso: string,
): IScheduleAssignment | null {
  return assignments
      .filter((assignment) => assignmentCoversIso(assignment, iso))
      .sort((a, b) =>
          b.start_date.localeCompare(a.start_date)
          || b.guid.localeCompare(a.guid),
      )[0] ?? null
}

const allFlatMembers = computed<FlatMember[]>(() => {
  const members = new Map<string, MemberAccumulator>()

  const ensureMember = (
      guid: string,
      name: string,
      code: string,
      groupName: string | null,
  ): MemberAccumulator => {
    const existing = members.get(guid)
    if (existing) {
      if (!existing.groupName && groupName) existing.groupName = groupName
      return existing
    }

    const created: MemberAccumulator = {
      guid,
      name,
      code,
      groupName,
      directAssignments: [],
      groupAssignments: [],
    }
    members.set(guid, created)
    return created
  }

  for (const assignment of filteredAssignments.value) {
    if (isUserAssignment(assignment)) {
      const member = ensureMember(
          assignment.related.guid,
          `${assignment.related.first_name} ${assignment.related.last_name}`.trim(),
          assignment.related.employee_code ?? '',
          null,
      )
      member.directAssignments.push(assignment)
      continue
    }

    if (isGroupAssignment(assignment)) {
      for (const groupMember of assignment.related.members.items) {
        if (!groupMember.active) continue
        if (
            filterType.value === 'user'
            && selectedTargetGuid.value
            && groupMember.user.guid !== selectedTargetGuid.value
        ) continue

        const member = ensureMember(
            groupMember.user.guid,
            `${groupMember.user.first_name} ${groupMember.user.last_name}`.trim(),
            groupMember.user.employee_code ?? '',
            assignment.related.name,
        )
        member.groupAssignments.push(assignment)
      }
    }
  }

  const result: FlatMember[] = []

  for (const member of members.values()) {
    const scheduleByDate: Record<string, ScheduleSlot[]> = {}
    const legacySchedule: Record<string, ScheduleSlot[]> = {}

    for (const day of calendarDays.value) {
      // La règle de résolution métier est la même que côté backend :
      // une affectation directe utilisateur gagne sur une affectation de groupe.
      const winner =
          newestApplicableAssignment(member.directAssignments, day.iso)
          ?? newestApplicableAssignment(member.groupAssignments, day.iso)

      if (!winner) continue

      const slots = assignmentSlotsForIso(winner, day.iso)
      scheduleByDate[day.iso] = slots

      // Compatibilité temporaire avec les exports actuels.
      const key = dayKeyFromIso(day.iso)
      if (!(key in legacySchedule)) legacySchedule[key] = slots
    }

    result.push({
      guid: member.guid,
      name: member.name,
      code: member.code,
      groupName: member.groupName,
      scheduleByDate,
      schedule: legacySchedule,
    })
  }

  if (filterType.value === 'user') {
    return result.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }

  return result.sort((a, b) => {
    const groupA = a.groupName ?? '\uFFFF'
    const groupB = b.groupName ?? '\uFFFF'
    if (groupA !== groupB) return groupA.localeCompare(groupB, 'fr')
    return a.name.localeCompare(b.name, 'fr')
  })
})

// Membres affichés dans Semaine/Mois (limités)
const visibleMembers = computed(() => allFlatMembers.value.slice(0, employeesPerPage.value))
const hiddenCount = computed(() => Math.max(0, allFlatMembers.value.length - employeesPerPage.value))
const canExport = computed(() => allFlatMembers.value.length > 0)

// ── Algorithme blocs horaires par jour ────────────────────────────────────
interface TimeBlock {
  start: string;
  end: string;
  label: string
}

function computeDayBlocks(members: FlatMember[], iso: string): TimeBlock[] {
  const points = new Set<number>()
  for (const m of members) {
    const slots = m.scheduleByDate[iso]
    if (!slots) continue
    for (const s of slots) {
      points.add(timeToMin(s.work[0]))
      points.add(timeToMin(s.work[1]))
      if (s.pause) {
        points.add(timeToMin(s.pause[0]))
        points.add(timeToMin(s.pause[1]))
      }
    }
  }
  const sorted = Array.from(points).sort((a, b) => a - b)
  return sorted.slice(0, -1).map((pt, i) => {
    const start = minToTime(pt)
    const end = minToTime(sorted[i + 1])
    return {start, end, label: `${start} – ${end}`}
  })
}

function getMemberBlockStatus(member: FlatMember, iso: string, block: TimeBlock): 'work' | 'pause' | 'absent' {
  const slots = member.scheduleByDate[iso]
  if (!slots) return 'absent'
  const bStart = timeToMin(block.start)
  const bEnd = timeToMin(block.end)
  for (const s of slots) {
    const wStart = timeToMin(s.work[0])
    const wEnd = timeToMin(s.work[1])
    if (wStart < bEnd && wEnd > bStart) {
      if (s.pause) {
        const pStart = timeToMin(s.pause[0])
        const pEnd = timeToMin(s.pause[1])
        if (pStart < bEnd && pEnd > bStart) return 'pause'
      }
      return 'work'
    }
  }
  return 'absent'
}

// ── Sections par jour ──────────────────────────────────────────────────────
interface DaySection {
  day: {
    iso: string;
    dayLabel: string;
    dayNum: string;
    monthNum: string;
    isWeekend: boolean;
    isToday: boolean;
    jsDay: number
  }
  blocks: TimeBlock[]
  matrix: Record<string, Record<string, 'work' | 'pause' | 'absent'>>
}

function buildDaySections(members: FlatMember[]): DaySection[] {
  return calendarDays.value.map((day) => {
    const blocks = computeDayBlocks(members, day.iso)
    const matrix: DaySection['matrix'] = {}
    for (const m of members) {
      matrix[m.guid] = {}
      for (const b of blocks) {
        matrix[m.guid][b.label] = getMemberBlockStatus(m, day.iso, b)
      }
    }
    return {day, blocks, matrix}
  })
}

const daySections = computed(() => buildDaySections(visibleMembers.value))
const programmeDaySections = computed(() => buildDaySections(allFlatMembers.value))

// ── Load ───────────────────────────────────────────────────────────────────
async function load() {
  if (!userStore.user?.guid) return

  try {
    loading.value = true

    const [assignmentResponse, templateResponse] = await Promise.all([
      ScheduleAssignmentService.list(userStore.user.guid, {
        limit: 200,
        date_from: periodFrom.value,
        date_to: periodTo.value,
      }),
      SessionTemplateService.list({
        active: true,
        current: true,
        limit: 250,
      }),
    ])

    allAssignments.value = assignmentResponse?.success
        ? assignmentResponse.data?.schedule_assignments?.items ?? []
        : []

    const rawTemplates = templateResponse?.success
        ? templateResponse.data?.templates?.items
        ?? templateResponse.data?.session_templates?.items
        ?? []
        : []

    sessionTemplates.value = rawTemplates.filter(hasTemplateDefinition)
  } catch (error: unknown) {
    console.error('Impossible de charger le planning standard', error)
    allAssignments.value = []
    sessionTemplates.value = []
  } finally {
    loading.value = false
  }
}

// ── Actions ────────────────────────────────────────────────────────────────
function setTargetType(type: 'user' | 'group') {
  filterType.value = type
  selectedTargetGuid.value = ''
}

function setViewMode(mode: 'week' | 'month' | 'programme') {
  viewMode.value = mode
  const from = new Date(periodFrom.value)
  if (mode === 'week' || mode === 'programme') {
    const end = new Date(from);
    end.setDate(from.getDate() + 6)
    periodTo.value = end.toISOString().split('T')[0]
  } else {
    const end = new Date(from.getFullYear(), from.getMonth() + 1, 0)
    periodTo.value = end.toISOString().split('T')[0]
  }
  load()
}

function resetFilters() {
  filterStatus.value = 'active';
  searchQuery.value = ''
}

function openCreate() {
  editTarget.value = null;
  showForm.value = true
}

function openEdit(item: IScheduleAssignment) {
  editTarget.value = item;
  showForm.value = true
}

function confirmDeactivate(item: IScheduleAssignment) {
  deactivateTarget.value = item
}

async function doDeactivate() {
  if (!deactivateTarget.value) return
  try {
    actionLoading.value = true
    await ScheduleAssignmentService.deactivate(deactivateTarget.value.guid)
    deactivateTarget.value = null
    await load()
  } finally {
    actionLoading.value = false
  }
}

function onSaved() {
  showForm.value = false;
  load()
}

async function handleExportPDF() {
  if (!canExport.value) return
  exportLoading.value = 'pdf';
  exportDropdownOpen.value = false
  try {
    exportSchedulePDF({
      members: allFlatMembers.value,
      periodFrom: periodFrom.value,
      periodTo: periodTo.value,
      generatedBy: `${userStore.user?.first_name} ${userStore.user?.last_name}`.trim(),
      tenantName: userStore.tenant?.name,
    })
  } finally {
    exportLoading.value = null
  }
}

async function handleExportExcel() {
  exportScheduleExcel({
    members: allFlatMembers.value,
    periodFrom: periodFrom.value, periodTo: periodTo.value,
    generatedBy: `${userStore.user?.first_name} ${userStore.user?.last_name}`.trim(),
    tenantName: userStore.tenant?.name,
  })
}

async function handleExportCSV() {
  exportScheduleCSV({
    members: allFlatMembers.value,
    periodFrom: periodFrom.value, periodTo: periodTo.value,
    generatedBy: `${userStore.user?.first_name} ${userStore.user?.last_name}`.trim(),
    tenantName: userStore.tenant?.name,
  })
}

function onDocumentClick(e: MouseEvent) {
  if (exportDropdownRef.value && !exportDropdownRef.value.contains(e.target as Node)) {
    exportDropdownOpen.value = false
  }
}

function openPlanningSuggestionModule(): void {
  router.push({name: 'planning-suggestion-dashboard'})
}

onMounted(() => {
  load();
  document.addEventListener('click', onDocumentClick)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>
<style scoped>
.filter-input {
  @apply px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700
  focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition;
}

.dropdown-enter-active, .dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from, .dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.slide-down-enter-active, .slide-down-leave-active {
  transition: max-height 0.2s ease, opacity 0.2s ease;
  max-height: 100px;
  overflow: hidden;
}

.slide-down-enter-from, .slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>