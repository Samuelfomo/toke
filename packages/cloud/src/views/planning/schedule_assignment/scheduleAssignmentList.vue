<template>
  <div class="flex flex-col h-full overflow-hidden bg-white/70 pb-5 px-4 sm:px-8">

    <!-- ── En-tête ── -->
    <div class="py-5 flex-shrink-0">
      <div class="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <div class="flex items-center gap-1.5 text-gray-400 text-[11px] mb-1.5 font-medium">
            <IconCalendarStats :size="11" />
            <span>Planning & Rotations</span>
            <IconChevronRight :size="11" />
            <span class="text-gray-800">Planning standard</span>
          </div>
          <h1 class="text-xl font-bold text-gray-900 tracking-tight">Planning standard</h1>
          <p class="text-gray-400 text-sm mt-0.5">Visualisez le planning par blocs horaires sur la période sélectionnée.</p>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <div class="relative" ref="exportDropdownRef">
            <button @click="exportDropdownOpen = !exportDropdownOpen"
                    class="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition">
              <IconUpload :size="14" />
              Exporter
              <IconChevronDown :size="13" class="text-gray-400" />
            </button>
            <Transition name="dropdown">
              <div v-if="exportDropdownOpen"
                   class="absolute right-0 top-full mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                <button @click="handleExportCSV" :disabled="!canExport || exportLoading === 'csv'"
                        class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed">
                  <IconFileText :size="15" class="text-green-500" />
                  <span>Exporter CSV</span>
                  <IconLoader2 v-if="exportLoading === 'csv'" :size="12" class="ml-auto animate-spin text-gray-400" />
                </button>
                <button @click="handleExportPDF" :disabled="!canExport || exportLoading === 'pdf'"
                        class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed">
                  <IconFile :size="15" class="text-red-500" />
                  <span>Aperçu PDF</span>
                  <IconLoader2 v-if="exportLoading === 'pdf'" :size="12" class="ml-auto animate-spin text-gray-400" />
                </button>
              </div>
            </Transition>
          </div>

          <button @click="handleExportExcel" :disabled="!canExport || exportLoading === 'excel'"
                  class="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-indigo-200 transition disabled:opacity-40 disabled:cursor-not-allowed">
            <IconLoader2 v-if="exportLoading === 'excel'" :size="14" class="animate-spin" />
            <IconTable v-else :size="14" />
            Générer Excel
          </button>

          <button @click="openCreate"
                  class="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-teal-200 transition">
            <IconPlus :size="15" />
            Nouvelle affectation
          </button>
        </div>
      </div>
    </div>

    <!-- Contenu : grille OU suggestion -->
    <SuggestionPreview
        v-if="activeSuggestion"
        :suggestion="activeSuggestion"
        :calendar-days="calendarDays"
        :available-templates="availableTemplates"
        @close="activeSuggestion = null"
        @approved="onSuggestionApproved"
        @rejected="onSuggestionRejected"
        @regenerate="onRegenerateSuggestion"
        @item-patched="onSuggestionItemPatched"
    />

    <div v-else class="flex-1 min-h-0 overflow-y-auto">

      <div class="w-full pb-4 flex lg:justify-end items-center flex-shrink-0">
        <button
            @click="handleGenerateSuggestion"
            :disabled="suggestionLoading"
            class="flex items-center gap-2 px-4 py-2.5 bg-[#004aad] hover:bg-[#003a8c] text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-200 transition disabled:opacity-50"
        >
          <IconLoader2 v-if="suggestionLoading" :size="14" class="animate-spin" />
          <IconSparkles v-else :size="14" />
          Générer suggestion
        </button>
      </div>

    <!-- ── Barre de filtres ── -->
    <div class="bg-white border border-gray-100 px-2 py-3 flex items-center gap-4 flex-wrap flex-shrink-0">

      <div class="flex flex-col gap-1">
        <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Type</span>
        <div class="flex rounded-lg border border-gray-200 overflow-hidden">
          <button @click="setTargetType('user')"
                  class="px-3 py-1.5 text-xs font-semibold transition"
                  :class="filterType === 'user' ? 'bg-teal-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          >Employé</button>
          <button @click="setTargetType('group')"
                  class="px-3 py-1.5 text-xs font-semibold transition border-l border-gray-200"
                  :class="filterType === 'group' ? 'bg-teal-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          >Groupe</button>
        </div>
      </div>

      <div class="flex flex-col gap-1 min-w-[220px]">
        <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
          {{ filterType === 'group' ? 'Groupe' : 'Employé' }}
        </span>
        <div class="relative">
          <IconUsers v-if="filterType === 'group'" :size="13" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <IconUser  v-else                         :size="13" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select v-model="selectedTargetGuid"
                  class="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition cursor-pointer">
            <option value="">{{ filterType === 'group' ? 'Tous les groupes' : 'Tous les employés' }}</option>
            <option v-for="t in availableTargets" :key="t.guid" :value="t.guid">{{ t.name }}</option>
          </select>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Période</span>
        <div class="flex items-center gap-1.5">
          <input type="date" v-model="periodFrom" class="filter-input text-xs py-1.5 cursor-pointer" />
          <IconArrowRight :size="12" class="text-gray-300 flex-shrink-0" />
          <input type="date" v-model="periodTo" :min="periodFrom" class="filter-input text-xs py-1.5 cursor-pointer" />
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Vue</span>
        <div class="flex rounded-lg border border-gray-200 overflow-hidden">
          <button @click="setViewMode('week')"
                  class="px-3 py-1.5 text-xs font-semibold transition"
                  :class="viewMode === 'week' ? 'bg-teal-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          >Semaine</button>
          <button @click="setViewMode('month')"
                  class="px-3 py-1.5 text-xs font-semibold transition border-l border-gray-200"
                  :class="viewMode === 'month' ? 'bg-teal-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          >Mois</button>
          <button @click="setViewMode('programme')"
                  class="px-3 py-1.5 text-xs font-semibold transition border-l border-gray-200"
                  :class="viewMode === 'programme' ? 'bg-teal-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          >Programme</button>
        </div>
      </div>

      <!-- Sélecteur nb employés (masqué en vue programme) -->
      <div v-if="viewMode !== 'programme'" class="flex flex-col gap-1">
        <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Afficher</span>
        <select v-model="employeesPerPage"
                class="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-teal-400 transition cursor-pointer">
          <option :value="10">10 employés</option>
          <option :value="15">15 employés</option>
          <option :value="25">25 employés</option>
          <option :value="50">50 employés</option>
        </select>
      </div>

      <div class="flex-1" />

      <button @click="advancedFiltersOpen = !advancedFiltersOpen"
              class="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-50 transition"
              :class="advancedFiltersOpen ? 'bg-gray-50 border-teal-300 text-teal-600' : ''">
        <IconFilter :size="12" />
        Filtres avancés
      </button>
    </div>

    <!-- ── Filtres avancés ── -->
    <Transition name="slide-down">
      <div v-if="advancedFiltersOpen"
           class="bg-white border border-gray-100 px-2 py-3 flex items-center gap-3 flex-shrink-0">
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 font-medium">Statut :</span>
          <select v-model="filterStatus" class="filter-input text-xs py-1.5 cursor-pointer">
            <option value="">Tous</option>
            <option value="active">Actif uniquement</option>
            <option value="inactive">Inactif uniquement</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 font-medium">Recherche :</span>
          <div class="relative">
            <IconSearch :size="12" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input v-model="searchQuery" type="text" placeholder="Nom, code..."
                   class="filter-input !pl-7 text-base py-1.5 w-44" />
          </div>
        </div>
        <button @click="resetFilters" class="text-xs text-purple-500 hover:text-purple-600 font-semibold transition ml-2">
          Réinitialiser
        </button>
      </div>
    </Transition>

    <!-- ── Contenu principal ── -->
    <div class="flex-1 overflow-y-auto py-6">

      <div v-if="loading" class="flex items-center justify-center h-64 gap-2 text-gray-400">
        <IconLoader2 :size="20" class="animate-spin text-teal-500" />
        <span class="text-sm">Chargement du planning...</span>
      </div>

      <div v-else-if="allFlatMembers.length === 0" class="flex flex-col items-center justify-center h-64 gap-4 text-gray-400">
        <div class="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
          <IconAlertTriangle :size="28" class="text-amber-500" />
        </div>
        <div class="text-center">
          <p class="text-sm font-semibold text-gray-600">Aucune affectation active</p>
          <p class="text-xs text-gray-400 mt-0.5">Aucun planning standard trouvé sur la période sélectionnée.</p>
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
              <IconChevronDown :size="14" />
              {{ hiddenCount }} employé(s) supplémentaire(s) non affiché(s). Augmentez la limite d'affichage pour les voir.
            </div>

            <!-- Légende -->
            <div class="flex items-center gap-4 text-[11px] text-gray-400 px-1">
              <div class="flex items-center gap-1.5">
                <div class="w-5 h-5 rounded-md bg-green-100 border border-green-200 flex items-center justify-center">
                  <div class="w-1.5 h-1.5 rounded-full bg-green-500" />
                </div>
                <span>Présent</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="w-5 h-5 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center">
<!--                  <span class="text-[9px] text-amber-500 font-bold">P</span>-->
                  <div class="w-1.5 h-1.5 rounded-full bg-amber-500" />
                </div>
                <span>Pause</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="w-5 h-5 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center">
                  <span class="text-gray-400 text-sm font-medium">—</span>
                </div>
                <span>Absent / repos</span>
              </div>
            </div>

            <!-- Un tableau par jour -->
              <div
                  v-for="section in daySections"
                  :key="section.day.iso"
                  class="overflow-hidden border rounded-xl bg-white shadow-sm"
                  :class="section.day.isToday ? 'border-teal-300' : 'border-gray-200'"
              >
                <!-- En-tête jour -->
                <div class="px-4 py-3 border-b flex items-center justify-between"
                     :class="section.day.isToday ? 'bg-teal-50 border-teal-200' : section.day.isWeekend ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100'">
                  <div class="flex items-center gap-2">
                  <span class="text-xs font-bold uppercase tracking-wide"
                        :class="section.day.isToday ? 'text-teal-600' : 'text-gray-500'">
                    {{ section.day.dayLabel }}
                  </span>
                    <span class="text-sm font-bold"
                          :class="section.day.isToday ? 'text-teal-700' : 'text-gray-800'">
                    {{ section.day.dayNum }}/{{ section.day.monthNum }}
                  </span>
                    <span v-if="section.day.isToday"
                          class="text-[10px] px-1.5 py-0.5 bg-teal-500 text-white rounded-full font-bold">
                    Aujourd'hui
                  </span>
                    <span v-if="section.day.isWeekend && !section.day.isToday"
                          class="text-[10px] text-gray-400 italic">Week-end</span>
                  </div>
                  <span v-if="section.blocks.length === 0" class="text-[11px] text-gray-400 italic">Jour de repos</span>
                  <span v-else class="text-[11px] text-gray-400">{{ section.blocks.length }} bloc(s) horaire(s)</span>
                </div>

                <!-- Tableau blocs si des blocs existent -->
                <div v-if="section.blocks.length > 0" class="overflow-x-auto">
                  <table class="border-collapse w-full">
                    <thead>
                    <tr class="bg-gray-50 border-b border-gray-100">
                      <!-- Colonne employé -->
                      <th class="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 w-48 sticky left-0 bg-gray-50 z-10 border-r border-gray-100">
                        Employé
                      </th>
                      <!-- Colonnes blocs horaires -->
                      <th v-for="block in section.blocks" :key="block.label"
                          class="px-3 py-2.5 text-center text-[11px] font-bold text-gray-500 min-w-[90px] border-l border-gray-100">
                        {{ block.label }}
                      </th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="member in visibleMembers" :key="member.guid"
                        class="border-b border-gray-100 last:border-0 bg-white hover:bg-gray-50/40 transition">
                      <!-- Colonne employé -->
                      <td class="px-4 py-2.5 sticky left-0 bg-inherit border-r border-gray-100 z-10">
                        <div class="flex items-center gap-2.5">
                          <div class="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-[10px] font-bold text-teal-700 flex-shrink-0">
                            {{ initials(member.name) }}
                          </div>
                          <div class="min-w-0">
                            <p class="text-xs font-semibold text-gray-800 leading-tight truncate max-w-[120px]">{{ member.name }}</p>
                            <p v-if="member.code" class="text-[10px] text-gray-400">{{ member.code }}</p>
                          </div>
                        </div>
                      </td>
                      <!-- Cellules blocs -->
                      <td v-for="block in section.blocks" :key="block.label"
                          class="px-2 py-2 text-center border-l border-gray-100">
                        <BlockCell :status="section.matrix[member.guid]?.[block.label] ?? 'absent'" />
                      </td>
                    </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Jour de repos : pas de tableau -->
                <div v-else class="px-4 py-3 text-xs text-gray-400 italic">
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
              <h2 class="text-sm font-bold text-gray-800 tracking-wide">{{ programmeTitre }}</h2>
              <p class="text-[11px] text-gray-400">{{ periodLabel }} · {{ allFlatMembers.length }} employé(s)</p>
            </div>

            <!-- Légende -->
            <div class="flex items-center gap-4 text-[11px] text-gray-400 px-1">
              <div class="flex items-center gap-1.5">
                <div class="w-5 h-5 rounded-md bg-blue-100 border border-blue-200 flex items-center justify-center">
                  <div class="w-1.5 h-1.5 rounded-full bg-blue-500" />
                </div>
                <span>Présent</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="w-5 h-5 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <span class="text-[9px] text-amber-500 font-bold">P</span>
                </div>
                <span>Pause</span>
              </div>
            </div>

            <!-- Un tableau par jour (tous les membres) -->
            <div
                v-for="section in programmeDaySections"
                :key="section.day.iso"
                class="overflow-hidden border rounded-xl bg-white shadow-sm"
                :class="section.day.isToday ? 'border-teal-300' : 'border-gray-200'"
            >
              <!-- En-tête jour -->
              <div class="px-4 py-3 border-b flex items-center justify-between"
                   :class="section.day.isToday ? 'bg-teal-50 border-teal-200' : section.day.isWeekend ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100'">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold uppercase tracking-wide"
                        :class="section.day.isToday ? 'text-teal-600' : 'text-gray-500'">
                    {{ section.day.dayLabel }}
                  </span>
                  <span class="text-sm font-bold"
                        :class="section.day.isToday ? 'text-teal-700' : 'text-gray-800'">
                    {{ section.day.dayNum }}/{{ section.day.monthNum }}
                  </span>
                  <span v-if="section.day.isToday"
                        class="text-[10px] px-1.5 py-0.5 bg-teal-500 text-white rounded-full font-bold">
                    Aujourd'hui
                  </span>
                </div>
                <span v-if="section.blocks.length === 0" class="text-[11px] text-gray-400 italic">Jour de repos</span>
                <span v-else class="text-[11px] text-gray-400">{{ section.blocks.length }} bloc(s) · {{ allFlatMembers.length }} employé(s)</span>
              </div>

              <div v-if="section.blocks.length > 0" class="overflow-x-auto">
                <table class="border-collapse w-full">
                  <thead>
                  <tr class="bg-gray-50 border-b border-gray-100">
                    <th class="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 w-52 sticky left-0 bg-gray-50 z-10 border-r border-gray-100">
                      Employé
                    </th>
                    <th class="px-3 py-2.5 text-left text-[11px] font-bold text-gray-500 w-36 border-l border-gray-100">
                      Groupe
                    </th>
                    <th v-for="block in section.blocks" :key="block.label"
                        class="px-3 py-2.5 text-center text-[11px] font-bold text-gray-500 min-w-[90px] border-l border-gray-100">
                      {{ block.label }}
                    </th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="member in allFlatMembers" :key="member.guid"
                      class="border-b border-gray-100 last:border-0 bg-white hover:bg-gray-50/40 transition">
                    <td class="px-4 py-2.5 sticky left-0 bg-inherit border-r border-gray-100 z-10">
                      <div class="flex items-center gap-2.5">
                        <div class="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-[10px] font-bold text-teal-700 flex-shrink-0">
                          {{ initials(member.name) }}
                        </div>
                        <div class="min-w-0">
                          <p class="text-xs font-semibold text-gray-800 leading-tight truncate max-w-[130px]">{{ member.name }}</p>
                          <p v-if="member.code" class="text-[10px] text-gray-400">{{ member.code }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-3 py-2.5 border-l border-gray-100">
                      <span v-if="member.groupName"
                            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[10px] font-semibold">
                        <IconUsers :size="9" />
                        {{ member.groupName }}
                      </span>
                      <span v-else class="text-[10px] text-gray-400 italic">Sans groupe</span>
                    </td>
                    <td v-for="block in section.blocks" :key="block.label"
                        class="px-2 py-2 text-center border-l border-gray-100">
                      <BlockCell :status="section.matrix[member.guid]?.[block.label] ?? 'absent'" />
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>

              <div v-else class="px-4 py-3 text-xs text-gray-400 italic">
                Aucun employé planifié ce jour.
              </div>
            </div>
          </div>
        </template>

      </template>
    </div>

    <!-- ── Modal désactivation ── -->
    <Teleport to="body">
      <div v-if="deactivateTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="deactivateTarget = null">
        <div class="absolute inset-0 bg-black/25 backdrop-blur-sm" />
        <div class="relative bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <IconPower :size="18" class="text-amber-500" />
            </div>
            <div>
              <p class="text-gray-800 font-bold text-sm">Désactiver l'affectation</p>
              <p class="text-gray-400 text-xs mt-0.5">L'affectation sera marquée inactive</p>
            </div>
          </div>
          <p class="text-gray-600 text-sm mb-5">
            Désactiver l'affectation de
            <span class="font-semibold text-gray-800">{{ getTargetName(deactivateTarget) }}</span> ?
          </p>
          <div class="flex gap-2">
            <button @click="deactivateTarget = null"
                    class="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition">
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
import { ref, computed, onMounted, onBeforeUnmount, defineComponent, h, watch } from 'vue'
import {
  IconCalendarStats, IconChevronRight, IconPlus, IconLoader2,
  IconUser, IconUsers, IconFilter, IconSearch, IconArrowRight,
  IconPower, IconAlertTriangle, IconSparkles,
  IconUpload, IconChevronDown, IconEye, IconTable,
  IconFile, IconFileText, IconClock,
} from '@tabler/icons-vue'

import ScheduleAssignmentService from '@/service/ScheduleAssignment'
import ScheduleAssignmentForm    from './scheduleAssignmentForm.vue'
import {
  isGroupAssignment, isUserAssignment, getTargetName, resolveFullTemplate,
} from './type'
import type { IScheduleAssignment } from './type'
import { useUserStore } from '@/stores/userStore'
import { exportScheduleCSV, exportScheduleExcel } from '@/utils/exports/scheduleAssignment.export'
import {exportSchedulePDF} from "@/utils/exports/exportSchedulePDF";
import SuggestionPreview from './suggestionPreview.vue'
import ScheduleSuggestionService from '@/service/ScheduleSuggestionService'
import type { ISuggestion, ISuggestionItem } from '@/service/ScheduleSuggestionService'
import SessionTemplateService from '@/service/SessionTemplate'

const userStore = useUserStore()

// ── Composant inline BlockCell ─────────────────────────────────────────────
const BlockCell = defineComponent({
  props: { status: { type: String as () => 'work' | 'pause' | 'absent', default: 'absent' } },
  setup(props) {
    return () => {
      if (props.status === 'work') {
        return h('div', {
          class: 'w-full px-3 py-1.5 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center gap-1.5',
        }, [
          h('div', { class: 'w-2 h-2 rounded-full bg-green-500 flex-shrink-0' }),
          h('span', { class: 'text-[11px] font-semibold text-green-700' }, 'Présent'),
        ])
      }
      if (props.status === 'pause') {
        return h('div', {
          class: 'w-full px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center gap-1.5',
        }, [
          h('div', { class: 'w-2 h-2 rounded-full bg-amber-400 flex-shrink-0' }),
          h('span', { class: 'text-[11px] font-semibold text-amber-600' }, 'Pause'),
        ])
      }
      return h('span', { class: 'text-gray-300 text-sm font-medium' }, '—')
    }
  },
})

// ── Constants ──────────────────────────────────────────────────────────────
const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const DAY_FR: Record<string, string> = {
  Mon: 'Lun', Tue: 'Mar', Wed: 'Mer', Thu: 'Jeu', Fri: 'Ven', Sat: 'Sam', Sun: 'Dim',
}
const JS_DAY_TO_KEY: Record<number, string> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun',
}

// ── State ──────────────────────────────────────────────────────────────────
const allAssignments   = ref<IScheduleAssignment[]>([])
const loading          = ref(false)

const filterType          = ref<'user' | 'group'>('user')
const selectedTargetGuid  = ref('')
const viewMode            = ref<'week' | 'month' | 'programme'>('week')
const advancedFiltersOpen = ref(false)
const filterStatus        = ref('')
const searchQuery         = ref('')
const exportDropdownOpen  = ref(false)
const exportDropdownRef   = ref<HTMLElement | null>(null)
const exportLoading       = ref<'pdf' | 'excel' | 'csv' | null>(null)
const employeesPerPage    = ref<number>(10)

const today  = new Date()
const monday = new Date(today)
monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
const sunday = new Date(monday)
sunday.setDate(monday.getDate() + 6)

const periodFrom = ref(monday.toISOString().split('T')[0])
const periodTo   = ref(sunday.toISOString().split('T')[0])

const showForm         = ref(false)
const editTarget       = ref<IScheduleAssignment | null>(null)
const deactivateTarget = ref<IScheduleAssignment | null>(null)
const actionLoading    = ref(false)

watch(
    [filterType, selectedTargetGuid, filterStatus, searchQuery, periodFrom, periodTo, employeesPerPage],
    () => { /* filters changed */ }
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
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Computed : jours calendrier ────────────────────────────────────────────
const calendarDays = computed(() => {
  const days: {
    iso: string; dayLabel: string; dayNum: string; monthNum: string
    isWeekend: boolean; isToday: boolean; jsDay: number
  }[] = []
  const cursor   = new Date(periodFrom.value)
  const end      = new Date(periodTo.value)
  const todayIso = new Date().toISOString().split('T')[0]
  while (cursor <= end) {
    const iso   = cursor.toISOString().split('T')[0]
    const jsDay = cursor.getDay()
    days.push({
      iso,
      dayLabel:  DAY_FR[JS_DAY_TO_KEY[jsDay]] ?? '',
      dayNum:    String(cursor.getDate()).padStart(2, '0'),
      monthNum:  String(cursor.getMonth() + 1).padStart(2, '0'),
      isWeekend: jsDay === 0 || jsDay === 6,
      isToday:   iso === todayIso,
      jsDay,
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
})

const periodLabel = computed(() => {
  const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${fmt(periodFrom.value)} → ${fmt(periodTo.value)}`
})

const programmeTitre = computed(() => {
  const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  return `PROGRAMME DU ${fmt(periodFrom.value)} AU ${fmt(periodTo.value)}`
})

// ── Cibles disponibles ─────────────────────────────────────────────────────
// const availableTargets = computed(() => {
//   const map = new Map<string, string>()
//   for (const a of allAssignments.value) {
//     if (a.family !== filterType.value) continue
//     if (!map.has(a.related.guid)) map.set(a.related.guid, getTargetName(a))
//   }
//   return Array.from(map.entries())
//       .map(([guid, name]) => ({ guid, name }))
//       .filter((t) => !searchQuery.value || t.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
//       .sort((a, b) => a.name.localeCompare(b.name))
// })

function isInActivePeriod(a: IScheduleAssignment): boolean {
  const aStart = new Date(a.start_date)
  const aEnd   = a.end_date ? new Date(a.end_date) : new Date('2099-12-31')
  const pFrom  = new Date(periodFrom.value)
  const pTo    = new Date(periodTo.value)
  return aStart <= pTo && aEnd >= pFrom
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
        .map(([guid, name]) => ({ guid, name }))
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
      .map(([guid, name]) => ({ guid, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  if (hasDirect) result.push({ guid: '__no_group__', name: 'Sans groupe' })

  return result.filter((t) => !searchQuery.value || t.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

// ── Affectations filtrées ──────────────────────────────────────────────────
// const filteredAssignments = computed(() => {
//   return allAssignments.value.filter((a) => {
//     if (a.family !== filterType.value) return false
//     if (selectedTargetGuid.value && a.related.guid !== selectedTargetGuid.value) return false
//     if (filterStatus.value === 'active'   && !a.active) return false
//     if (filterStatus.value === 'inactive' &&  a.active) return false
//     const aStart = new Date(a.start_date)
//     const aEnd   = a.end_date ? new Date(a.end_date) : new Date('2099-12-31')
//     const pFrom  = new Date(periodFrom.value)
//     const pTo    = new Date(periodTo.value)
//     return aStart <= pTo && aEnd >= pFrom
//   })
// })
const filteredAssignments = computed(() => {
  return allAssignments.value.filter((a) => {
    // Filtre statut actif/inactif
    if (filterStatus.value === 'active'   && !a.active) return false
    if (filterStatus.value === 'inactive' &&  a.active) return false

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

// ── Membres plats ──────────────────────────────────────────────────────────
interface FlatMember {
  guid:      string
  name:      string
  code:      string
  groupName: string | null   // null = employé direct, sinon nom du groupe
  schedule:  Record<string, { work: [string, string]; pause?: [string, string] }[]>
}

// const allFlatMembers = computed<FlatMember[]>(() => {
//   const result: FlatMember[] = []
//   const seen = new Set<string>()
//
//   for (const a of filteredAssignments.value) {
//     const tpl = resolveFullTemplate(a)
//     const schedule: FlatMember['schedule'] = {}
//     if (tpl?.definition) {
//       for (const key of DAY_ORDER) {
//         const blocks = tpl.definition[key]
//         if (blocks && Array.isArray(blocks) && blocks.length > 0) {
//           schedule[key] = blocks.map((b: any) => ({
//             work:  [b.work[0], b.work[1]] as [string, string],
//             pause: b.pause ? [b.pause[0], b.pause[1]] as [string, string] : undefined,
//           }))
//         }
//       }
//     }
//
//     if (isGroupAssignment(a)) {
//       for (const m of a.related.members.items) {
//         if (!seen.has(m.user.guid)) {
//           seen.add(m.user.guid)
//           result.push({
//             guid: m.user.guid,
//             name: `${m.user.first_name} ${m.user.last_name}`.trim(),
//             code: m.user.employee_code ?? '',
//             groupName: a.related.name,
//             schedule,
//           })
//         }
//       }
//     } else if (isUserAssignment(a)) {
//       if (!seen.has(a.related.guid)) {
//         seen.add(a.related.guid)
//         result.push({
//           guid: a.related.guid,
//           name: `${a.related.first_name} ${a.related.last_name}`.trim(),
//           code: a.related.employee_code ?? '',
//           groupName: null,
//           schedule,
//         })
//       }
//     }
//   }
//   return result.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
// })

const allFlatMembers = computed<FlatMember[]>(() => {
  const result: FlatMember[] = []
  const seen = new Set<string>()

  // Helper : construire le schedule depuis le template d'un assignment
  function buildSchedule(a: IScheduleAssignment): FlatMember['schedule'] {
    const tpl = resolveFullTemplate(a)
    const schedule: FlatMember['schedule'] = {}
    if (tpl?.definition) {
      for (const key of DAY_ORDER) {
        const blocks = tpl.definition[key as keyof typeof tpl.definition]
        if (blocks && Array.isArray(blocks) && blocks.length > 0) {
          schedule[key] = blocks.map((b: any) => ({
            work:  [b.work[0], b.work[1]] as [string, string],
            pause: b.pause ? [b.pause[0], b.pause[1]] as [string, string] : undefined,
          }))
        }
      }
    }
    return schedule
  }

  for (const a of filteredAssignments.value) {
    if (isGroupAssignment(a)) {
      // En mode Employé avec filtre individuel : n'inclure que le membre ciblé
      const schedule = buildSchedule(a)
      for (const m of a.related.members.items) {
        if (filterType.value === 'user' && selectedTargetGuid.value && m.user.guid !== selectedTargetGuid.value) continue
        if (seen.has(m.user.guid)) continue
        seen.add(m.user.guid)
        result.push({
          guid:      m.user.guid,
          name:      `${m.user.first_name} ${m.user.last_name}`.trim(),
          code:      m.user.employee_code ?? '',
          groupName: a.related.name,   // toujours renseigné, même en mode Employé
          schedule,
        })
      }
    } else if (isUserAssignment(a)) {
      if (seen.has(a.related.guid)) continue
      seen.add(a.related.guid)
      result.push({
        guid:      a.related.guid,
        name:      `${a.related.first_name} ${a.related.last_name}`.trim(),
        code:      a.related.employee_code ?? '',
        groupName: null,   // "Sans groupe"
        schedule:  buildSchedule(a),
      })
    }
  }

  // Tri :
  // - Mode Employé → alphabétique simple
  // - Mode Groupe  → grouper par groupe (alphabétique), "Sans groupe" en dernier, puis alpha dans chaque groupe
  if (filterType.value === 'user') {
    return result.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }

  // Mode Groupe : tri par groupName (null = "Sans groupe" → dernier), puis par name
  return result.sort((a, b) => {
    const ga = a.groupName ?? '\uFFFF'  // null → "Sans groupe" → sort en dernier
    const gb = b.groupName ?? '\uFFFF'
    if (ga !== gb) return ga.localeCompare(gb, 'fr')
    return a.name.localeCompare(b.name, 'fr')
  })
})

// Membres affichés dans Semaine/Mois (limités)
const visibleMembers = computed(() => allFlatMembers.value.slice(0, employeesPerPage.value))
const hiddenCount    = computed(() => Math.max(0, allFlatMembers.value.length - employeesPerPage.value))
const canExport      = computed(() => allFlatMembers.value.length > 0)

// ── Algorithme blocs horaires par jour ────────────────────────────────────
interface TimeBlock { start: string; end: string; label: string }

function computeDayBlocks(members: FlatMember[], dayKey: string): TimeBlock[] {
  const points = new Set<number>()
  for (const m of members) {
    const slots = m.schedule[dayKey]
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
    const end   = minToTime(sorted[i + 1])
    return { start, end, label: `${start} – ${end}` }
  })
}

function getMemberBlockStatus(member: FlatMember, dayKey: string, block: TimeBlock): 'work' | 'pause' | 'absent' {
  const slots = member.schedule[dayKey]
  if (!slots) return 'absent'
  const bStart = timeToMin(block.start)
  const bEnd   = timeToMin(block.end)
  for (const s of slots) {
    const wStart = timeToMin(s.work[0])
    const wEnd   = timeToMin(s.work[1])
    if (wStart < bEnd && wEnd > bStart) {
      if (s.pause) {
        const pStart = timeToMin(s.pause[0])
        const pEnd   = timeToMin(s.pause[1])
        if (pStart < bEnd && pEnd > bStart) return 'pause'
      }
      return 'work'
    }
  }
  return 'absent'
}

// ── Sections par jour ──────────────────────────────────────────────────────
interface DaySection {
  day:    { iso: string; dayLabel: string; dayNum: string; monthNum: string; isWeekend: boolean; isToday: boolean; jsDay: number }
  blocks: TimeBlock[]
  matrix: Record<string, Record<string, 'work' | 'pause' | 'absent'>>
}

function buildDaySections(members: FlatMember[]): DaySection[] {
  return calendarDays.value.map((day) => {
    const dayKey = JS_DAY_TO_KEY[day.jsDay]
    const blocks = computeDayBlocks(members, dayKey)
    const matrix: DaySection['matrix'] = {}
    for (const m of members) {
      matrix[m.guid] = {}
      for (const b of blocks) {
        matrix[m.guid][b.label] = getMemberBlockStatus(m, dayKey, b)
      }
    }
    return { day, blocks, matrix }
  })
}

const daySections          = computed(() => buildDaySections(visibleMembers.value))
const programmeDaySections = computed(() => buildDaySections(allFlatMembers.value))

// ── Load ───────────────────────────────────────────────────────────────────
async function load() {
  if (!userStore.user?.guid) return
  try {
    loading.value = true
    const res = await ScheduleAssignmentService.list(userStore.user.guid, {
      limit:     200,
      date_from: periodFrom.value,
      date_to:   periodTo.value,
    })
    if (res?.success) allAssignments.value = res.data.schedule_assignments.items
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// ── Actions ────────────────────────────────────────────────────────────────
function setTargetType(type: 'user' | 'group') {
  filterType.value         = type
  selectedTargetGuid.value = ''
}

function setViewMode(mode: 'week' | 'month' | 'programme') {
  viewMode.value = mode
  const from = new Date(periodFrom.value)
  if (mode === 'week' || mode === 'programme') {
    const end = new Date(from); end.setDate(from.getDate() + 6)
    periodTo.value = end.toISOString().split('T')[0]
  } else {
    const end = new Date(from.getFullYear(), from.getMonth() + 1, 0)
    periodTo.value = end.toISOString().split('T')[0]
  }
  load()
}

function resetFilters() { filterStatus.value = ''; searchQuery.value = '' }

function openCreate() { editTarget.value = null; showForm.value = true }
function openEdit(item: IScheduleAssignment) { editTarget.value = item; showForm.value = true }
function confirmDeactivate(item: IScheduleAssignment) { deactivateTarget.value = item }

async function doDeactivate() {
  if (!deactivateTarget.value) return
  try {
    actionLoading.value = true
    await ScheduleAssignmentService.deactivate(deactivateTarget.value.guid)
    deactivateTarget.value = null
    await load()
  } finally { actionLoading.value = false }
}

function onSaved() { showForm.value = false; load() }

// async function handleExportPDF() {
//   if (!canExport.value) return
//   exportLoading.value = 'pdf'; exportDropdownOpen.value = false
//   try {
//     await ScheduleAssignmentService.exportPDF({
//       targetGuid: selectedTargetGuid.value, targetType: filterType.value,
//       periodFrom: periodFrom.value, periodTo: periodTo.value,
//       assignmentGuid: filteredAssignments.value[0]?.guid ?? '',
//     })
//   } finally { exportLoading.value = null }
// }

async function handleExportPDF() {
  if (!canExport.value) return
  exportLoading.value = 'pdf'; exportDropdownOpen.value = false
  try {
    exportSchedulePDF({
      members:     allFlatMembers.value,
      periodFrom:  periodFrom.value,
      periodTo:    periodTo.value,
      generatedBy: `${userStore.user?.first_name} ${userStore.user?.last_name}`.trim(),
      tenantName:  userStore.tenant?.name,
    })
  } finally {
    exportLoading.value = null
  }
}

async function handleExportExcel() {
  exportScheduleExcel({
    members:    allFlatMembers.value,
    periodFrom: periodFrom.value, periodTo: periodTo.value,
    generatedBy: `${userStore.user?.first_name} ${userStore.user?.last_name}`.trim(),
    tenantName: userStore.tenant?.name,
  })
}

async function handleExportCSV() {
  exportScheduleCSV({
    members:    allFlatMembers.value,
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

// Suggestion add
const activeSuggestion    = ref<ISuggestion | null>(null)
const suggestionLoading   = ref(false)
const availableTemplates  = ref<{ guid: string; name: string, definition?: any }[]>([])

async function handleGenerateSuggestion() {
  if (!userStore.user?.guid) return
  suggestionLoading.value = true
  try {
    // Charger les templates disponibles si pas encore chargés
    if (!availableTemplates.value.length) {
      const tRes = await SessionTemplateService.list()
      if (tRes?.success) {
        availableTemplates.value = tRes.data.templates.items.map((t: any) => ({
          guid: t.guid, name: t.name, definition: t.definition ?? null,
        }))
      }
    }
    const res = await ScheduleSuggestionService.generate(userStore.user.guid, {
      period_from: periodFrom.value,
      period_to:   periodTo.value,
    })
    if (res?.success) activeSuggestion.value = res.data.suggestion
  } finally {
    suggestionLoading.value = false
  }
}

function onSuggestionItemPatched(updatedItem: ISuggestionItem) {
  if (!activeSuggestion.value?.items) return
  const idx = activeSuggestion.value.items.findIndex((i) => i.guid === updatedItem.guid)
  if (idx !== -1) activeSuggestion.value.items[idx] = updatedItem
}

async function onRegenerateSuggestion() {
  if (!activeSuggestion.value) return
  await ScheduleSuggestionService.delete(activeSuggestion.value.guid)
  activeSuggestion.value = null
  await handleGenerateSuggestion()
}

function onSuggestionApproved() {
  activeSuggestion.value = null
  load() // recharge la grille avec les nouveaux assignments
}

function onSuggestionRejected() {
  activeSuggestion.value = null
}

onMounted(() => { load(); document.addEventListener('click', onDocumentClick) })
onBeforeUnmount(() => { document.removeEventListener('click', onDocumentClick) })
</script>
<style scoped>
.filter-input {
  @apply px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700
  focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition;
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