<template>
  <div class="flex flex-col h-full bg-white/70 px-8 max-w-[1300px]">

    <div class="py-5 flex-shrink-0">
      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-1.5 text-gray-400 text-[11px] mb-1.5 font-medium">
            <IconCalendarStats :size="11" />
            <span>Planning & Rotations</span>
            <IconChevronRight :size="11" />
            <span class="text-gray-800">Planning standard</span>
          </div>
          <h1 class="text-xl font-bold text-gray-900 tracking-tight">Planning standard</h1>
          <p class="text-gray-400 text-sm mt-0.5">
            Exportez le planning standard d'un employé ou d'un groupe sur une période donnée.
          </p>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <div class="relative" ref="exportDropdownRef">
            <button
                @click="exportDropdownOpen = !exportDropdownOpen"
                class="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition"
            >
              <IconUpload :size="14" />
              Exporter
              <IconChevronDown :size="13" class="text-gray-400" />
            </button>
            <Transition name="dropdown">
              <div
                  v-if="exportDropdownOpen"
                  class="absolute right-0 top-full mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden"
              >
                <button
                    @click="handleExportCSV"
                    :disabled="!canExport || exportLoading === 'csv'"
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <IconFileText :size="15" class="text-green-500" />
                  <span>Exporter CSV</span>
                  <IconLoader2 v-if="exportLoading === 'csv'" :size="12" class="ml-auto animate-spin text-gray-400" />
                </button>
                <button
                    @click="handleExportPDF"
                    :disabled="!canExport || exportLoading === 'pdf'"
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <IconFile :size="15" class="text-red-500" />
                  <span>Aperçu PDF</span>
                  <IconLoader2 v-if="exportLoading === 'pdf'" :size="12" class="ml-auto animate-spin text-gray-400" />
                </button>
              </div>
            </Transition>
          </div>

          <button
              @click="handleExportPDF"
              :disabled="!canExport || exportLoading === 'pdf'"
              class="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <IconEye :size="14" class="text-gray-500" />
            Aperçu PDF
            <IconLoader2 v-if="exportLoading === 'pdf'" :size="12" class="animate-spin text-gray-400" />
          </button>

          <button
              @click="handleExportExcel"
              :disabled="!canExport || exportLoading === 'excel'"
              class="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-indigo-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <IconLoader2 v-if="exportLoading === 'excel'" :size="14" class="animate-spin" />
            <IconTable v-else :size="14" />
            Générer Excel
          </button>

          <button
              @click="openCreate"
              class="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-teal-200 transition"
          >
            <IconPlus :size="15" />
            Nouvelle affectation
          </button>
        </div>
      </div>
    </div>

    <div class="bg-white border border-gray-100 px-2 py-3 flex items-center gap-4 flex-wrap flex-shrink-0">

      <div class="flex flex-col gap-1">
        <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Type</span>
        <div class="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
              @click="setTargetType('user')"
              class="px-3 py-1.5 text-xs font-semibold transition"
              :class="filterType === 'user' ? 'bg-teal-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          >Employé</button>
          <button
              @click="setTargetType('group')"
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
          <select
              v-model="selectedTargetGuid"
              class="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700
                   focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition cursor-pointer"
          >
            <option value="">
              {{ filterType === 'group' ? 'Tous les groupes' : 'Tous les employés' }}
            </option>
            <option v-for="t in availableTargets" :key="t.guid" :value="t.guid">{{ t.name }}</option>
          </select>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Période</span>
        <div class="flex items-center gap-1.5">
          <input
              type="date" v-model="periodFrom"
              class="filter-input text-xs py-1.5 cursor-pointer"
          />
          <IconArrowRight :size="12" class="text-gray-300 flex-shrink-0" />
          <input
              type="date" v-model="periodTo" :min="periodFrom"
              class="filter-input text-xs py-1.5 cursor-pointer"
          />
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Vue</span>
        <div class="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
              @click="setViewMode('week')"
              class="px-3 py-1.5 text-xs font-semibold transition"
              :class="viewMode === 'week' ? 'bg-teal-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          >Semaine</button>
          <button
              @click="setViewMode('month')"
              class="px-3 py-1.5 text-xs font-semibold transition border-l border-gray-200"
              :class="viewMode === 'month' ? 'bg-teal-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          >Mois</button>
        </div>
      </div>

      <div class="flex-1" />

      <button
          @click="advancedFiltersOpen = !advancedFiltersOpen"
          class="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-50 transition"
          :class="advancedFiltersOpen ? 'bg-gray-50 border-teal-300 text-teal-600' : ''"
      >
        <IconFilter :size="12" />
        Filtres avancés
      </button>
    </div>

    <Transition name="slide-down">
      <div v-if="advancedFiltersOpen"
           class="bg-white border border-gray-100 px-2 py-3 flex items-center gap-3 flex-shrink-0"
      >
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
            <input
                v-model="searchQuery"
                type="text"
                placeholder="Nom, code..."
                class="filter-input !pl-7 text-base py-1.5 w-44"
            />
          </div>
        </div>
        <button @click="resetFilters" class="text-xs text-purple-500 hover:text-purple-600 font-semibold transition ml-2">
          Réinitialiser
        </button>
      </div>
    </Transition>

    <div class="flex-1 overflow-y-auto py-6 space-y-6">

      <div v-if="loading" class="flex items-center justify-center h-64 gap-2 text-gray-400">
        <IconLoader2 :size="20" class="animate-spin text-teal-500" />
        <span class="text-sm">Chargement du planning...</span>
      </div>

      <div v-else-if="displayGroups.length === 0" class="flex flex-col items-center justify-center h-64 gap-4 text-gray-400">
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
        <div
            v-for="group in displayGroups"
            :key="group.targetGuid"
            class="space-y-4"
        >
          <div class="bg-violet-50 border border-gray-200 rounded-md p-5 flex items-center gap-6 flex-wrap">
            <div
                class="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                :class="filterType === 'group' ? 'bg-violet-100 text-violet-600' : 'bg-teal-100 text-teal-700'"
            >
              <IconUsers v-if="filterType === 'group'" :size="22" />
              <IconUser  v-else                         :size="22" />
            </div>

            <div class="flex-1 min-w-0">
              <p class="text-base font-bold text-gray-800">{{ group.targetName }}</p>
              <p class="text-xs text-gray-400 mt-0.5">
                <template v-if="filterType === 'group' && group.primaryAssignment && isGroupAssignment(group.primaryAssignment)">
                  Manager : {{ managerLabel(group.primaryAssignment) }}
                  &nbsp;·&nbsp; {{ group.primaryAssignment.related.members.count }} membre(s)
                </template>
                <template v-else-if="group.primaryAssignment && isUserAssignment(group.primaryAssignment)">
                  {{ group.primaryAssignment.related.job_title ?? '' }}
                  <template v-if="group.primaryAssignment.related.department">
                    &nbsp;·&nbsp; {{ group.primaryAssignment.related.department }}
                  </template>
                </template>
              </p>
            </div>

            <div v-if="group.primaryAssignment" class="flex items-center gap-6 text-sm flex-shrink-0 flex-wrap">
              <div>
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Type d'assignation</p>
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold">
                  <IconCalendarEvent :size="11" />
                  Schedule (Standard)
                </span>
              </div>
              <div>
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Template</p>
                <p class="text-xs font-semibold text-gray-700">{{ group.resolvedTemplate?.name ?? '—' }}</p>
              </div>
              <div>
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Depuis le</p>
                <p class="text-xs font-semibold text-gray-700">{{ formatDate(group.primaryAssignment.start_date) }}</p>
              </div>
              <div>
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Raison</p>
                <p class="text-xs font-semibold text-gray-700">{{ group.primaryAssignment.reason ?? '—' }}</p>
              </div>
              <div v-if="filterType === 'group' && isGroupAssignment(group.primaryAssignment)">
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Membres</p>
                <p class="text-lg font-bold text-gray-800">{{ group.primaryAssignment.related.members.count }}</p>
              </div>
            </div>
          </div>

          <div class="overflow-hidden">
            <div class="flex items-center justify-between px-2 py-4 border-gray-100">
              <div class="flex items-center gap-2">
                <h2 class="text-base font-bold text-gray-700">Aperçu du planning</h2>
                <span class="text-[11px] font-medium text-gray-500">{{ periodLabel }}</span>
              </div>
              <div class="flex items-center gap-4 text-[11px] text-gray-500">
                <div class="flex items-center gap-1.5">
                  <div class="w-3 h-3 rounded-sm bg-blue-100 border border-blue-200" />
                  <span>Heures de travail</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="w-3 h-3 rounded-sm bg-amber-100 border border-amber-200" />
                  <span>Pause</span>
                </div>
              </div>
            </div>

            <div class="overflow-x-auto border rounded-md bg-white">
              <table class="border-collapse" style="min-width: 100%">
                <thead>
                <tr class="bg-blue-50 border-b border-gray-100">
                  <th class="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 w-44 sticky left-0 bg-gray-50 z-10 border-r border-gray-100">
                    Membre
                  </th>
                  <th
                      v-for="day in calendarDays"
                      :key="day.iso"
                      class="px-2 py-2 text-center min-w-[88px]"
                      :class="[
                        day.isWeekend ? 'bg-gray-100/60' : '',
                        day.isToday   ? 'bg-teal-50'     : ''
                      ]"
                  >
                    <p class="text-[10px] font-bold text-gray-400 uppercase">{{ day.dayLabel }}</p>
                    <p
                        class="text-xs font-semibold mt-0.5"
                        :class="day.isToday ? 'text-teal-600' : 'text-gray-600'"
                    >{{ day.dayNum }}/{{ day.monthNum }}</p>
                  </th>
                </tr>
                </thead>
                <tbody>
                <tr
                    v-for="member in group.members"
                    :key="member.guid"
                    class="border-b border-gray-100 hover:bg-gray-50/50 transition bg-white"
                >
                  <td class="px-4 py-3 sticky left-0 bg-white border-r border-gray-100 z-10">
                    <div class="flex items-center gap-2.5">
                      <div class="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-[10px] font-bold text-teal-700 flex-shrink-0">
                        {{ initials(member.name) }}
                      </div>
                      <div class="min-w-0">
                        <p class="text-xs font-semibold text-gray-800 leading-tight truncate max-w-[100px]">{{ member.name }}</p>
                        <p class="text-[10px] text-gray-400 truncate">{{ member.code }}</p>
                      </div>
                    </div>
                  </td>

                  <td
                      v-for="day in calendarDays"
                      :key="day.iso"
                      class="p-1.5 text-center align-middle"
                      :class="day.isWeekend ? 'bg-gray-50/50' : ''"
                  >
                    <PlanningCell :data="group.cellMap[day.iso]" />
                  </td>
                </tr>
                </tbody>
              </table>
            </div>

            <div v-if="group.primaryAssignment" class="px-5 py-3 border-t border-gray-100 bg-blue-50/40">
              <div class="flex items-center gap-2 text-xs text-blue-600">
                <IconInfoCircle :size="13" class="flex-shrink-0" />
                <span>
                  Horaires basés sur le template :
                  <strong>{{ group.resolvedTemplate?.name }}</strong>
                  &nbsp;({{ templateSummaryFull(group.resolvedTemplate) }})
                </span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">

            <div class="bg-white border border-gray-200 rounded-2xl p-5">
              <div class="flex items-center gap-2 mb-4">
                <div class="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <IconLayoutGrid :size="14" class="text-indigo-500" />
                </div>
                <h3 class="text-sm font-bold text-gray-800">Détails du template appliqué</h3>
              </div>
              <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-xs" v-if="group.primaryAssignment">
                <div>
                  <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Template</p>
                  <p class="font-semibold text-gray-700">{{ group.resolvedTemplate?.name ?? '—' }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Modèle de session</p>
                  <p class="font-semibold text-gray-700">{{ group.resolvedTemplate?.session_model?.name ?? '—' }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Heures de travail</p>
                  <p class="font-semibold text-gray-700">{{ templateWorkHours(group.resolvedTemplate) }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Pause</p>
                  <p class="font-semibold text-gray-700">{{ templatePauseHours(group.resolvedTemplate) }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Jours travaillés</p>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span
                        v-for="d in workDays(group.resolvedTemplate)"
                        :key="d"
                        class="px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded text-[10px] font-bold"
                    >{{ d }}</span>
                  </div>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Jours de repos</p>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span
                        v-for="d in restDays(group.resolvedTemplate)"
                        :key="d"
                        class="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold"
                    >{{ d }}</span>
                  </div>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Tolérance</p>
                  <p class="font-semibold text-gray-700">{{ templateTolerance(group.resolvedTemplate) }}</p>
                </div>
              </div>
            </div>

            <div class="bg-white border border-gray-200 rounded-2xl p-5">
              <div class="flex items-center gap-2 mb-4">
                <div class="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <IconChartBar :size="14" class="text-emerald-500" />
                </div>
                <h3 class="text-sm font-bold text-gray-800">Récapitulatif période</h3>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div
                    v-for="kpi in buildKPIs(group)"
                    :key="kpi.label"
                    class="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50"
                >
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" :class="kpi.bg">
                    <component :is="kpi.icon" :size="15" :class="kpi.color" />
                  </div>
                  <div>
                    <p class="text-[10px] text-gray-400 font-medium leading-tight">{{ kpi.label }}</p>
                    <p class="text-sm font-bold text-gray-800">{{ kpi.value }}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div class="bg-white border border-gray-200 rounded-2xl px-6 py-4 flex items-center justify-between shadow-sm">
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <span>Afficher</span>
            <select v-model="perPage" class="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:border-teal-500">
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>
            <span>sur {{ totalItems }} résultats</span>
          </div>

          <div class="flex items-center gap-1">
            <button
                @click="currentPage = 1"
                :disabled="currentPage === 1"
                class="p-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:hover:bg-white"
            >
              «
            </button>
            <button
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="p-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:hover:bg-white"
            >
              ‹
            </button>

            <span class="px-4 text-sm font-semibold text-gray-700">
              Page {{ currentPage }} / {{ totalPages }}
            </span>

            <button
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="p-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:hover:bg-white"
            >
              ›
            </button>
            <button
                @click="currentPage = totalPages"
                :disabled="currentPage === totalPages"
                class="p-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:hover:bg-white"
            >
              »
            </button>
          </div>
        </div>
      </template>
    </div>

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
            <span class="font-semibold text-gray-800">{{ getTargetName(deactivateTarget) }}</span>
            sur <span class="font-semibold text-gray-800">{{ deactivateTarget.session_template?.name ?? '—' }}</span> ?
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, defineComponent, h, watch } from 'vue'
import {
  IconCalendarStats, IconChevronRight, IconPlus, IconLoader2,
  IconUser, IconUsers, IconFilter, IconSearch, IconArrowRight,
  IconCalendarEvent, IconInfoCircle, IconPower,
  IconAlertTriangle, IconLayoutGrid, IconChartBar,
  IconUpload, IconChevronDown, IconEye, IconTable,
  IconFile, IconFileText, IconClock, IconCoffee,
} from '@tabler/icons-vue'

import ScheduleAssignmentService from '@/service/ScheduleAssignment'
import ScheduleAssignmentForm    from './scheduleAssignmentForm.vue'
import {
  isGroupAssignment, isUserAssignment, getTargetName, resolveFullTemplate,
} from './type'
import type { IScheduleAssignment, ISessionTemplateInline } from './type'
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()

// ── Composant inline PlanningCell ──────────────────────────────────────────
interface CellData { hasWork: boolean; work: string; pause?: string }

const PlanningCell = defineComponent({
  props: { data: { type: Object as () => CellData | null, default: null } },
  setup(props) {
    return () => {
      const d = props.data
      if (!d || !d.hasWork) {
        return h('span', { class: 'text-gray-300 text-xs' }, '—')
      }
      return h('div', { class: 'flex flex-col gap-0.5' }, [
        h('span', {
          class: 'inline-block text-[11px] font-semibold text-blue-700 bg-blue-50 rounded px-1 py-2 leading-tight',
        }, d.work),
        d.pause
            ? h('span', {
              class: 'inline-block text-[11px] font-medium text-amber-600 bg-amber-50 rounded px-1 py-2 leading-tight',
            }, d.pause)
            : null,
      ])
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
const allAssignments    = ref<IScheduleAssignment[]>([])
const loading           = ref(false)

const filterType          = ref<'user' | 'group'>('user')
const selectedTargetGuid  = ref('')   // '' = tous
const viewMode            = ref<'week' | 'month'>('week')
const advancedFiltersOpen = ref(false)
const filterStatus        = ref('')
const searchQuery         = ref('')
const exportDropdownOpen  = ref(false)
const exportDropdownRef   = ref<HTMLElement | null>(null)
const exportLoading       = ref<'pdf' | 'excel' | 'csv' | null>(null)

// ── État de la Pagination ──
const currentPage = ref(1)
const perPage     = ref(1)

// Période : semaine courante par défaut
const today     = new Date()
const monday    = new Date(today)
monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
const sunday    = new Date(monday)
sunday.setDate(monday.getDate() + 6)

const periodFrom = ref(monday.toISOString().split('T')[0])
const periodTo   = ref(sunday.toISOString().split('T')[0])

const showForm         = ref(false)
const editTarget       = ref<IScheduleAssignment | null>(null)
const deactivateTarget = ref<IScheduleAssignment | null>(null)
const actionLoading    = ref(false)

// ── Watcher Pagination (Déplacé après l'initialisation du State) ──
watch(
    [filterType, selectedTargetGuid, filterStatus, searchQuery, periodFrom, periodTo, perPage],
    () => {
      currentPage.value = 1
    }
)

// ── Computed : jours calendrier ───────────────────────────────────────────
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
  const fmt = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${fmt(periodFrom.value)} → ${fmt(periodTo.value)}`
})

// ── Computed : cibles disponibles ─────────────────────────────────────────
const availableTargets = computed(() => {
  const map = new Map<string, string>()
  for (const a of allAssignments.value) {
    if (a.family !== filterType.value) continue
    const guid = a.related.guid
    if (!map.has(guid)) map.set(guid, getTargetName(a))
  }
  return Array.from(map.entries())
      .map(([guid, name]) => ({ guid, name }))
      .filter((t) => !searchQuery.value || t.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
})

// ── Computed : affectations filtrées ──────────────────────────────────────
const filteredAssignments = computed(() => {
  return allAssignments.value.filter((a) => {
    if (a.family !== filterType.value) return false
    if (selectedTargetGuid.value && a.related.guid !== selectedTargetGuid.value) return false
    if (filterStatus.value === 'active'   && !a.active) return false
    if (filterStatus.value === 'inactive' &&  a.active) return false

    // Chevauchement période
    const aStart = new Date(a.start_date)
    const aEnd   = a.end_date ? new Date(a.end_date) : new Date('2099-12-31')
    const pFrom  = new Date(periodFrom.value)
    const pTo    = new Date(periodTo.value)
    return aStart <= pTo && aEnd >= pFrom
  })
})

interface DisplayGroup {
  targetGuid:        string
  targetName:        string
  primaryAssignment: IScheduleAssignment | null
  resolvedTemplate:  ISessionTemplateInline | undefined  // ← ajouter
  assignments:       IScheduleAssignment[]
  members:           { guid: string; name: string; code: string }[]
  cellMap:           Record<string, CellData>
}

const allDisplayGroups = computed<DisplayGroup[]>(() => {
  // Grouper par cible
  const byTarget = new Map<string, IScheduleAssignment[]>()
  for (const a of filteredAssignments.value) {
    const guid = a.related.guid
    if (!byTarget.has(guid)) byTarget.set(guid, [])
    byTarget.get(guid)!.push(a)
  }

  const groups: DisplayGroup[] = []

  for (const [targetGuid, assignments] of byTarget.entries()) {
    const primary = assignments[0]
    // const tpl     = primary.session_template
    const tpl = resolveFullTemplate(primary)

    // Membres
    let members: DisplayGroup['members'] = []
    if (isGroupAssignment(primary)) {
      members = primary.related.members.items.map((m) => ({
        guid: m.user.guid,
        name: `${m.user.first_name} ${m.user.last_name}`.trim(),
        code: m.user.employee_code ?? '',
      }))
    } else if (isUserAssignment(primary)) {
      members = [{
        guid: primary.related.guid,
        name: `${primary.related.first_name} ${primary.related.last_name}`.trim(),
        code: primary.related.employee_code ?? '',
      }]
    }

    // CellMap : une clé par iso
    const cellMap: Record<string, CellData> = {}
    for (const day of calendarDays.value) {
      const key    = JS_DAY_TO_KEY[day.jsDay] as keyof ISessionTemplateInline['definition']
      const blocks = tpl?.definition?.[key]
      if (blocks && Array.isArray(blocks) && blocks.length > 0) {
        const b = blocks[0]
        cellMap[day.iso] = {
          hasWork: true,
          work:    `${b.work[0]} - ${b.work[1]}`,
          pause:   b.pause ? `${b.pause[0]} - ${b.pause[1]}` : undefined,
        }
      } else {
        cellMap[day.iso] = { hasWork: false, work: '' }
      }
    }

    groups.push({
      targetGuid,
      targetName:        getTargetName(primary),
      primaryAssignment: primary,
      resolvedTemplate:  tpl,   // ← stocker ici
      assignments,
      members,
      cellMap,
    })
  }

  return groups
})

// ── Computeds de Pagination (Placés APRÈS allDisplayGroups) ──
const totalItems = computed(() => allDisplayGroups.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / perPage.value) || 1)

const displayGroups = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  const end   = start + perPage.value
  return allDisplayGroups.value.slice(start, end)
})

const canExport = computed(() => allDisplayGroups.value.length > 0)

// ── Helpers template ───────────────────────────────────────────────────────
function workDays(tpl?: ISessionTemplateInline): string[] {
  if (!tpl?.definition) return []
  return DAY_ORDER.filter((d) => {
    const b = tpl.definition[d]
    return b && Array.isArray(b) && b.length > 0
  }).map((d) => DAY_FR[d])
}

function restDays(tpl?: ISessionTemplateInline): string[] {
  if (!tpl?.definition) return []
  return DAY_ORDER.filter((d) => {
    const b = tpl.definition[d]
    return !b || !Array.isArray(b) || b.length === 0
  }).map((d) => DAY_FR[d])
}

function templateWorkHours(tpl?: ISessionTemplateInline): string {
  if (!tpl?.definition) return '—'
  for (const d of DAY_ORDER) {
    const b = tpl.definition[d]
    if (b && Array.isArray(b) && b.length > 0) return `${b[0].work[0]} - ${b[0].work[1]}`
  }
  return '—'
}

function templatePauseHours(tpl?: ISessionTemplateInline): string {
  if (!tpl?.definition) return '—'
  for (const d of DAY_ORDER) {
    const b = tpl.definition[d]
    if (b && Array.isArray(b) && b.length > 0 && b[0].pause)
      return `${b[0].pause[0]} - ${b[0].pause[1]}`
  }
  return '—'
}

function templateTolerance(tpl?: ISessionTemplateInline): string {
  if (!tpl?.definition) return '—'
  for (const d of DAY_ORDER) {
    const b = tpl.definition[d]
    if (b && Array.isArray(b) && b.length > 0) return `${b[0].tolerance} min`
  }
  return '—'
}

function templateSummaryFull(tpl?: ISessionTemplateInline): string {
  const days  = workDays(tpl).join(' - ')
  const work  = templateWorkHours(tpl)
  const pause = templatePauseHours(tpl)
  return `${days} : ${work}${pause !== '—' ? `, Pause : ${pause}` : ''}`
}

function managerLabel(a: IScheduleAssignment): string {
  if (!isGroupAssignment(a)) return '—'
  const m = a.related.manager
  return m ? `${m.first_name} ${m.last_name}`.trim() : '—'
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function timeToHours(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h + (m ?? 0) / 60
}

function formatHours(h: number): string {
  const hh = Math.floor(h)
  const mm  = Math.round((h - hh) * 60)
  return `${String(hh).padStart(2, '0')}h${mm > 0 ? String(mm).padStart(2, '0') : '00'}`
}

// ── KPIs par groupe ────────────────────────────────────────────────────────
function buildKPIs(group: DisplayGroup) {
  const tpl = group.primaryAssignment?.session_template

  const workedDays = calendarDays.value.filter((d) => {
    const key    = JS_DAY_TO_KEY[d.jsDay] as keyof ISessionTemplateInline['definition']
    const blocks = tpl?.definition?.[key]
    return blocks && Array.isArray(blocks) && blocks.length > 0
  })

  let workH = 0
  let pauseH = 0
  if (tpl?.definition) {
    for (const d of DAY_ORDER) {
      const b = tpl.definition[d]
      if (b && Array.isArray(b) && b.length > 0) {
        workH  = timeToHours(b[0].work[1])  - timeToHours(b[0].work[0])
        pauseH = b[0].pause
            ? timeToHours(b[0].pause[1]) - timeToHours(b[0].pause[0])
            : 0
        break
      }
    }
  }

  return [
    { label: 'Jours travaillés', value: `${workedDays.length} jours`,                    icon: IconClock,  bg: 'bg-teal-50',   color: 'text-teal-500'   },
    { label: 'Heures totales',   value: formatHours(workedDays.length * workH),           icon: IconClock,  bg: 'bg-blue-50',   color: 'text-blue-500'   },
    { label: 'Heures de pause',  value: formatHours(workedDays.length * pauseH),          icon: IconCoffee, bg: 'bg-amber-50',  color: 'text-amber-500'  },
    { label: 'Membres concernés',value: String(group.members.length),                     icon: IconUsers,  bg: 'bg-violet-50', color: 'text-violet-500' },
  ]
}

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
    if (res?.success) {
      allAssignments.value = res.data.schedule_assignments.items
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// ── Actions filtres ────────────────────────────────────────────────────────
function setTargetType(type: 'user' | 'group') {
  filterType.value        = type
  selectedTargetGuid.value = ''
}

function setViewMode(mode: 'week' | 'month') {
  viewMode.value = mode
  const from = new Date(periodFrom.value)
  if (mode === 'week') {
    const end = new Date(from)
    end.setDate(from.getDate() + 6)
    periodTo.value = end.toISOString().split('T')[0]
  } else {
    const end = new Date(from.getFullYear(), from.getMonth() + 1, 0)
    periodTo.value = end.toISOString().split('T')[0]
  }
  load()
}

function resetFilters() {
  filterStatus.value = ''
  searchQuery.value  = ''
}

// ── CRUD ───────────────────────────────────────────────────────────────────
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
  } finally {
    actionLoading.value = false
  }
}

function onSaved() { showForm.value = false; load() }

// ── Export handlers ────────────────────────────────────────────────────────
async function handleExportPDF() {
  if (!canExport.value) return
  exportLoading.value      = 'pdf'
  exportDropdownOpen.value = false
  try {
    await ScheduleAssignmentService.exportPDF({
      targetGuid:     selectedTargetGuid.value,
      targetType:     filterType.value,
      periodFrom:     periodFrom.value,
      periodTo:       periodTo.value,
      assignmentGuid: displayGroups.value[0]?.primaryAssignment?.guid ?? '',
    })
  } finally {
    exportLoading.value = null
  }
}

async function handleExportExcel() {
  if (!canExport.value) return
  exportLoading.value      = 'excel'
  exportDropdownOpen.value = false
  try {
    await ScheduleAssignmentService.exportExcel({
      targetGuid:     selectedTargetGuid.value,
      targetType:     filterType.value,
      periodFrom:     periodFrom.value,
      periodTo:       periodTo.value,
      assignmentGuid: displayGroups.value[0]?.primaryAssignment?.guid ?? '',
    })
  } finally {
    exportLoading.value = null
  }
}

async function handleExportCSV() {
  if (!canExport.value) return
  exportLoading.value      = 'csv'
  exportDropdownOpen.value = false
  try {
    await ScheduleAssignmentService.exportCSV({
      targetGuid:     selectedTargetGuid.value,
      targetType:     filterType.value,
      periodFrom:     periodFrom.value,
      periodTo:       periodTo.value,
      assignmentGuid: displayGroups.value[0]?.primaryAssignment?.guid ?? '',
    })
  } finally {
    exportLoading.value = null
  }
}

// ── Fermer dropdown au clic extérieur ──────────────────────────────────────
function onDocumentClick(e: MouseEvent) {
  if (exportDropdownRef.value && !exportDropdownRef.value.contains(e.target as Node)) {
    exportDropdownOpen.value = false
  }
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