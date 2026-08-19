<template>
  <div class="mx-auto w-full max-w-[1500px] py-6 flex justify-end">
    <RouterLink
        :to="{ name: 'planning-menu' }"
        class="inline-flex items-center gap-2 bg-slate-50/15 rounded-md hover:bg-slate-50/30 p-1 text-sm font-semibold text-slate-600 no-underline transition hover:text-blue-700"
    >
      <IconArrowLeft :size="18"/>
      Retour aux outils de planification
    </RouterLink>
  </div>

  <div class="mx-auto flex h-full w-full max-w-[1500px] flex-col bg-slate-50 px-4 sm:px-6 lg:px-8">
    <!-- ── Header ── -->
    <div class="py-5 flex-shrink-0">
      <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
            <IconRotate :size="20" class="text-violet-600"/>
          </div>
          <div>
            <div class="flex items-center gap-1.5 text-slate-400 text-xs mb-1 font-medium">
              <IconCalendarStats :size="11"/>
              <span>Planning & Rotations</span>
              <IconChevronRight :size="11"/>
              <span class="text-slate-800">Rotations</span>
            </div>
            <h1 class="text-xl font-bold text-slate-900 tracking-tight">Export des rotations</h1>
            <p class="text-slate-400 text-sm mt-0.5">Visualisez et exportez les rotations appliquées sur une période
              donnée.</p>
          </div>
        </div>

        <!-- Actions export -->
        <div class="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          <!-- Exporter dropdown -->
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

          <!-- Imprimer -->
          <button @click="handlePrint" :disabled="!canExport"
                  class="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed">
            <IconPrinter :size="14" class="text-slate-500"/>
            Imprimer
          </button>

          <button @click="handleExportExcel" :disabled="!canExport || exportLoading === 'excel'"
                  class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-200 transition disabled:opacity-40 disabled:cursor-not-allowed">
            <IconLoader2 v-if="exportLoading === 'excel'" :size="14" class="animate-spin"/>
            <IconTable v-else :size="14"/>
            Exporter Excel
          </button>

          <!-- Nouvelle assignation -->
          <button @click="openCreate"
                  class="flex items-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-violet-200 transition">
            <IconPlus :size="15"/>
            Nouvelle assignation
          </button>
        </div>
      </div>
    </div>

    <!-- ── Filters bar ── -->
    <div
        class="bg-white border border-slate-100 px-4 py-3 flex items-center gap-4 flex-wrap flex-shrink-0 rounded-xl mb-4">

      <!-- Rotation Group -->
      <div class="flex flex-col gap-1 min-w-[200px]">
        <span class="text-xs text-slate-400 font-bold uppercase tracking-wide">Rotation Group</span>
        <div class="relative">
          <IconRotate :size="13" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
          <select v-model="selectedRotationGroupGuid"
                  class="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700
                   focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition cursor-pointer">
            <option value="">Tous les groupes</option>
            <option v-for="rg in availableRotationGroups" :key="rg.guid" :value="rg.guid">
              {{ rg.name }}
              <span v-if="rg.templateCount"> · {{ rg.templateCount }} templates</span>
            </option>
          </select>
        </div>
      </div>

      <!-- Période -->
      <div class="flex flex-col gap-1">
        <span class="text-xs text-slate-400 font-bold uppercase tracking-wide">Période</span>
        <div class="flex items-center gap-1.5">
          <input type="date" v-model="periodFrom" @change="load"
                 class="filter-input text-xs py-1.5 cursor-pointer"/>
          <IconArrowRight :size="12" class="text-slate-300 flex-shrink-0"/>
          <input type="date" v-model="periodTo" :min="periodFrom" @change="load"
                 class="filter-input text-xs py-1.5 cursor-pointer"/>
        </div>
      </div>

      <!-- Vue -->
      <div class="flex flex-col gap-1">
        <span class="text-xs text-slate-400 font-bold uppercase tracking-wide">Vue</span>
        <div class="flex rounded-lg border border-slate-200 overflow-hidden">
          <button @click="setViewMode('calendar')"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition"
                  :class="viewMode === 'calendar' ? 'bg-violet-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'">
            <IconCalendar :size="11"/>
            Calendrier
          </button>
          <button @click="setViewMode('list')"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition border-l border-slate-200"
                  :class="viewMode === 'list' ? 'bg-violet-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'">
            <IconList :size="11"/>
            Liste
          </button>
          <button @click="setViewMode('timeline')"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition border-l border-slate-200"
                  :class="viewMode === 'timeline' ? 'bg-violet-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'">
            <IconTimeline :size="11"/>
            Timeline
          </button>
        </div>
      </div>

      <!-- Membres concernés -->
      <div class="flex flex-col gap-1 min-w-[200px]">
        <span class="text-xs text-slate-400 font-bold uppercase tracking-wide">
          Membres concernés
          <span v-if="allMembers.length" class="normal-case font-normal text-slate-400">({{ allMembers.length }})</span>
        </span>
        <div class="relative">
          <IconUsers :size="13" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
          <select v-model="selectedMemberGuid"
                  class="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700
                   focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition cursor-pointer">
            <option value="">Tous les membres</option>
            <option v-for="m in allMembers" :key="m.guid" :value="m.guid">
              {{ m.name }}{{ m.code ? ' · ' + m.code : '' }}{{ m.groupName ? ' (' + m.groupName + ')' : '' }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex-1"/>

      <!-- Filtres avancés -->
      <button @click="advancedOpen = !advancedOpen"
              class="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
              :class="advancedOpen ? 'border-violet-300 text-violet-600 bg-slate-50' : ''">
        <IconFilter :size="12"/>
        Filtres avancés
      </button>
    </div>

    <!-- ── Advanced filters ── -->
    <Transition name="slide-down">
      <div v-if="advancedOpen"
           class="bg-white border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap flex-shrink-0 mb-4">
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500 font-medium">Statut :</span>
          <select v-model="filterStatus" class="filter-input text-xs py-1.5 cursor-pointer">
            <option value="">Tous</option>
            <option value="active">Actif uniquement</option>
            <option value="inactive">Inactif uniquement</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500 font-medium">Manager :</span>
          <select v-model="filterManagerGuid" class="filter-input text-xs py-1.5 cursor-pointer">
            <option value="">Tous les managers</option>
            <option v-for="m in availableManagers" :key="m.guid" :value="m.guid">{{ m.name }}</option>
          </select>
        </div>
        <button @click="resetFilters"
                class="text-xs text-violet-500 hover:text-violet-600 font-semibold transition ml-2">
          Réinitialiser
        </button>
      </div>
    </Transition>

    <!-- ── Main content ── -->
    <div class="flex-1 overflow-y-auto space-y-4 pb-6">

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center h-64 gap-2 text-slate-400">
        <IconLoader2 :size="20" class="animate-spin text-violet-500"/>
        <span class="text-sm">Chargement des rotations...</span>
      </div>

      <!-- Empty -->
      <div v-else-if="filteredAssignments.length === 0"
           class="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
        <div class="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center">
          <IconRotate :size="28" class="text-violet-600"/>
        </div>
        <div class="text-center">
          <p class="text-sm font-semibold text-slate-600">Aucune assignation de rotation</p>
          <p class="text-xs text-slate-400 mt-0.5">Aucune rotation trouvée sur la période sélectionnée.</p>
        </div>
        <button @click="openCreate" class="text-base font-medium text-blue-600 hover:text-blue-700 transition">
          + Créer une assignation
        </button>
      </div>

      <template v-else>

        <!-- ── Info card rotation ── -->
        <div v-if="primaryGroupAssignment && resolvedRotationGroup"
             class="bg-gradient-to-r from-blue-900 via-blue-900/90 to-blue-900 border border-blue-100 rounded-2xl p-5 flex items-start gap-6 flex-wrap m-auto">
          <!-- Icône + nom -->
          <div class="flex items-start gap-3 min-w-0 flex-1">
            <div class="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
              <IconRotate :size="22" class="text-violet-700"/>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs text-violet-300 font-bold uppercase tracking-wide">
                Rotation
              </p>
              <p class="text-base font-bold text-white break-words">
                {{ resolvedRotationGroup.name }}
              </p>
              <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
              <span class="whitespace-nowrap">
               Cycle :
              {{ resolvedRotationGroup.cycle_length }}
              {{ resolvedRotationGroup.cycle_unit === 'day' ? 'jour(s)' : 'semaine(s)' }}
              </span>
                <span class="whitespace-nowrap">
              Direction :
                  {{ resolvedRotationGroup.direction === 'forward' ? 'Avant' : 'Arrière' }}
              </span>
                <span class="whitespace-nowrap">
                Rotation step :
              {{ resolvedRotationGroup.rotation_step }}
              </span>
                <span class="whitespace-nowrap">
              Auto-avance :
           {{ resolvedRotationGroup.auto_advance ? 'Oui' : 'Non' }}
              </span>
              </div>
            </div>
          </div>

          <!-- Début de rotation -->
          <div class="flex flex-col gap-0.5">
            <p class="text-xs text-slate-400 font-bold uppercase tracking-wide">Début de rotation</p>
            <p class="text-lg font-bold text-white">{{ formatDate(resolvedRotationGroup.start_date) }}</p>
            <div class="flex items-center gap-1.5 mt-1">
              <div class="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                <IconUser :size="10" class="text-violet-600"/>
              </div>
              <p class="text-xs text-slate-300">
                Assignée par <strong>{{ primaryGroupAssignment.assigned_by.name }}</strong>
              </p>
            </div>
          </div>

          <!-- Période sélectionnée -->
          <div class="flex flex-col gap-0.5">
            <p class="text-xs text-slate-400 font-bold uppercase tracking-wide">Période sélectionnée</p>
            <p class="text-lg font-bold text-green-400">{{ periodDays }} jours</p>
            <p class="text-xs text-slate-400">{{ periodLabel }}</p>
          </div>

          <!-- Templates du cycle -->
          <div class="flex flex-col gap-1 flex-1 min-w-0">
            <p class="text-xs text-slate-400 font-bold uppercase tracking-wide">Templates du cycle</p>
            <div class="flex items-center gap-2 flex-wrap">
              <div v-for="ct in resolvedRotationGroup.cycle_templates" :key="ct.guid"
                   class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-green-50 shadow-sm">
                <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      :class="TEMPLATE_COLORS[ct.position % TEMPLATE_COLORS.length].badge">
                  {{ ct.position + 1 }}
                </span>
                <div>
                  <p class="text-xs font-bold text-slate-700">{{ ct.template_snapshot.name }}</p>
                  <p class="text-xs text-slate-400">{{ templateWorkSummary(ct.template_snapshot) }}</p>
                </div>
              </div>
              <div class="flex items-center gap-1 text-xs text-slate-300 italic">
                <IconRefresh :size="11"/>
                Répétition infinie ({{ resolvedRotationGroup.direction === 'forward' ? 'Forward' : 'Backward' }})
              </div>
            </div>
          </div>

          <!-- Membres -->
          <div class="flex flex-col gap-0.5 flex-shrink-0">
            <p class="text-xs text-slate-300 font-bold uppercase tracking-wide">Membres</p>
            <p class="text-2xl font-bold text-green-400">{{ allMembers.length }}</p>
            <p class="text-xs text-slate-400">{{ primaryGroupName }}</p>
          </div>
        </div>

        <!-- ── Aperçu du cycle ── -->
        <div v-if="resolvedRotationGroup" class="bg-white border border-slate-200 rounded-2xl px-5 py-4">
          <div class="flex items-center gap-2 mb-3">
            <p class="text-sm font-bold text-slate-700">
              Aperçu du cycle ({{ resolvedRotationGroup.cycle_length }}
              {{ resolvedRotationGroup.cycle_unit === 'day' ? 'jours' : 'semaines' }})
            </p>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <div v-for="(ct, idx) in resolvedRotationGroup.cycle_templates" :key="ct.guid"
                 class="flex items-center gap-2">
              <div class="flex items-center gap-2 px-3 py-2 rounded-xl border"
                   :class="TEMPLATE_COLORS[ct.position % TEMPLATE_COLORS.length].card">
                <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      :class="TEMPLATE_COLORS[ct.position % TEMPLATE_COLORS.length].badge">
                  {{ ct.position + 1 }}
                </span>
                <div>
                  <p class="text-xs font-bold">{{ ct.template_snapshot.name }}</p>
                  <p class="text-xs text-slate-500">{{ templateWorkSummary(ct.template_snapshot) }}</p>
                </div>
              </div>
              <IconArrowRight v-if="idx < resolvedRotationGroup.cycle_templates.length - 1"
                              :size="14" class="text-slate-300 flex-shrink-0"/>
            </div>
            <div class="flex items-center gap-1 text-xs text-slate-400">
              <IconArrowRight :size="12"/>
              <IconRefresh :size="12"/>
              <span class="italic">Répétition infinie ({{
                  resolvedRotationGroup.direction === 'forward' ? 'Backward' : 'Forward'
                }})</span>
            </div>
          </div>

          <!-- Offset info -->
          <div v-if="primaryGroupAssignment"
               class="mt-3 flex items-center gap-2 p-2.5 bg-violet-50 rounded-lg border border-violet-100">
            <IconInfoCircle :size="13" class="text-violet-500 flex-shrink-0"/>
            <p class="text-xs text-violet-700">
              <strong>Offset appliqué : {{ primaryGroupAssignment.offset }}</strong>
              — Le cycle démarre au template
              <strong>
                {{
                  resolvedRotationGroup.cycle_templates.find(ct => ct.position === primaryGroupAssignment!.offset - 1)?.template_snapshot.name ?? '?'
                }}
              </strong>
            </p>
          </div>
        </div>

        <!-- ── Vue Calendrier ── -->
        <template v-if="viewMode === 'calendar'">
          <div class="flex gap-4">

            <!-- Sidebar membres -->
            <div class="w-64 flex-shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div class="px-4 py-3 border-b border-slate-100">
                <p class="text-xs font-bold text-slate-700">Membres du groupe ({{ displayedMembers.length }})</p>
              </div>
              <div class="px-3 py-2 border-b border-slate-100">
                <div class="relative">
                  <IconSearch :size="12"
                              class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                  <input v-model="memberSearch" type="text" placeholder="Rechercher un membre..."
                         class="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700
                           placeholder-slate-400 focus:outline-none focus:border-violet-400 transition"/>
                </div>
              </div>
              <div class="overflow-y-auto max-h-96">
                <button v-for="m in displayedMembers" :key="m.guid"
                        @click="selectedMemberGuid = selectedMemberGuid === m.guid ? '' : m.guid"
                        class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition text-left border-b border-slate-50"
                        :class="selectedMemberGuid === m.guid ? 'bg-violet-50' : ''">
                  <div class="relative flex-shrink-0">
                    <div
                        class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                      {{ initials(m.name) }}
                    </div>
                    <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white"
                          :class="m.active ? 'bg-emerald-400' : 'bg-slate-300'"/>
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-slate-800 truncate">{{ m.name }}</p>
                    <p class="text-xs text-slate-400 truncate">{{ m.code }}</p>
                  </div>
                </button>
              </div>

              <!-- Offset info dans la sidebar -->
              <div v-if="primaryGroupAssignment" class="px-4 py-3 border-t border-slate-100 bg-violet-50/50">
                <div class="flex items-start gap-2">
                  <IconInfoCircle :size="13" class="text-violet-500 flex-shrink-0 mt-0.5"/>
                  <div>
                    <p class="text-xs font-bold text-violet-700">Offset appliqué : {{
                        primaryGroupAssignment.offset
                      }}</p>
                    <p class="text-xs text-violet-500 mt-0.5">
                      Le cycle démarre au template
                      <strong>{{
                          resolvedRotationGroup?.cycle_templates.find(ct => ct.position === primaryGroupAssignment!.offset - 1)?.template_snapshot.name ?? '?'
                        }}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Grille calendrier rotation -->
            <div class="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div class="flex items-center gap-2">
                  <h2 class="text-sm font-bold text-slate-700">Rotation appliquée sur la période</h2>
                  <span class="text-xs font-medium text-slate-500">{{ periodLabel }}</span>
                </div>
                <!-- Légende templates -->
                <div class="flex items-center gap-3">
                  <div v-for="ct in resolvedRotationGroup?.cycle_templates ?? []" :key="ct.guid"
                       class="flex items-center gap-1.5 text-xs text-slate-500">
                    <div class="w-2.5 h-2.5 rounded-full"
                         :class="TEMPLATE_COLORS[ct.position % TEMPLATE_COLORS.length].dot"/>
                    <span>{{ ct.template_snapshot.name }}</span>
                  </div>
                </div>
              </div>

              <div class="overflow-x-auto">
                <table class="border-collapse" style="min-width: 100%">
                  <thead>
                  <tr class="bg-violet-50/50 border-b border-slate-100">
                    <th class="px-4 py-2.5 text-left text-xs font-bold text-slate-500 w-40 sticky left-0 bg-white z-10 border-r border-slate-100">
                      Membre
                    </th>
                    <th v-for="day in calendarDays" :key="day.iso"
                        class="px-1.5 py-2 text-center min-w-[76px]"
                        :class="[day.isWeekend ? 'bg-slate-100/60' : '', day.isToday ? 'bg-blue-50' : '']">
                      <p class="text-xs font-bold text-slate-400 uppercase">{{ day.dayLabel }}</p>
                      <p class="text-xs font-semibold mt-0.5"
                         :class="day.isToday ? 'text-blue-600' : 'text-slate-600'">
                        {{ day.dayNum }}/{{ day.monthNum }}
                      </p>
                    </th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="member in displayedMembers" :key="member.guid"
                      class="border-b border-slate-100 hover:bg-slate-50/50 transition bg-white"
                      :class="selectedMemberGuid === member.guid ? 'bg-violet-50/30' : ''">

                    <!-- Membre -->
                    <td class="px-4 py-2.5 sticky left-0 bg-white border-r border-slate-100 z-10">
                      <div class="flex items-center gap-2">
                        <div
                            class="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                          {{ initials(member.name) }}
                        </div>
                        <div class="min-w-0">
                          <p class="text-xs font-semibold text-slate-800 truncate max-w-[96px]">{{ member.name }}</p>
                          <p class="text-xs text-slate-400">{{ member.code }}</p>
                        </div>
                      </div>
                    </td>

                    <!-- Cellule par jour -->
                    <td v-for="day in calendarDays" :key="day.iso"
                        class="p-1 text-center align-middle"
                        :class="day.isWeekend ? 'bg-slate-50/50' : ''">
                      <RotationCell :data="getRotationCell(day, member)"/>
                      <!--                      <RotationCell :data="getRotationCell(day)" />-->
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </template>

        <!-- ── Vue Liste ── -->
        <template v-else-if="viewMode === 'list'">
          <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 class="text-sm font-bold text-slate-700">
                Assignations de rotation
                <span class="ml-2 text-xs font-normal text-slate-400">({{
                    filteredAssignments.length
                  }} résultat{{ filteredAssignments.length > 1 ? 's' : '' }})</span>
              </h2>
            </div>
            <table class="w-full border-collapse">
              <thead>
              <tr class="bg-slate-50 text-xs font-bold tracking-widest uppercase text-slate-400 border-b border-slate-200">
                <th class="px-4 py-2.5 text-left">Cible</th>
                <th class="px-4 py-2.5 text-left">Type</th>
                <th class="px-4 py-2.5 text-left">Rotation Group</th>
                <th class="px-4 py-2.5 text-left">Offset</th>
                <th class="px-4 py-2.5 text-left">Assignée par</th>
                <th class="px-4 py-2.5 text-left">Date d'assignation</th>
                <th class="px-4 py-2.5 text-left">Statut</th>
                <th class="px-4 py-2.5 text-right">Actions</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="item in paginatedAssignments" :key="item.guid"
                  class="border-b border-slate-100 hover:bg-slate-50/50 transition"
                  :class="{ 'opacity-60': !item.active }">

                <!-- Cible -->
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                         :class="item.family === 'group' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-700'">
                      {{ initials(getRotationTargetName(item)) }}
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-slate-800 leading-tight">{{
                          getRotationTargetName(item)
                        }}</p>
                      <p v-if="item.family === 'group' && isGroupRotationAssignment(item)"
                         class="text-xs text-slate-400">
                        {{ item.related.members.count }} membres
                      </p>
                    </div>
                  </div>
                </td>

                <!-- Type -->
                <td class="px-4 py-3">
                    <span class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                          :class="item.family === 'group' ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600'">
                      <IconUsers v-if="item.family === 'group'" :size="10"/>
                      <IconUser v-else :size="10"/>
                      {{ item.family === 'group' ? 'Groupe' : 'Employé' }}
                    </span>
                </td>

                <!-- Rotation Group -->
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                      <IconRotate :size="12" class="text-violet-500"/>
                    </div>
                    <p class="text-sm font-medium text-slate-700">{{ item.rotation_group.name }}</p>
                  </div>
                </td>

                <!-- Offset -->
                <td class="px-4 py-3">
                    <span
                        class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">
                      <IconHash :size="10"/>
                      {{ item.offset }}
                    </span>
                </td>

                <!-- Assignée par -->
                <td class="px-4 py-3">
                  <p class="text-xs text-slate-600 font-medium">{{ item.assigned_by.name }}</p>
                </td>

                <!-- Date d'assignation -->
                <td class="px-4 py-3">
                  <p class="text-xs text-slate-600">{{ formatDatetime(item.assigned_at) }}</p>
                </td>

                <!-- Statut -->
                <td class="px-4 py-3">
                    <span class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                          :class="item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'">
                      <span class="w-1.5 h-1.5 rounded-full"
                            :class="item.active ? 'bg-emerald-500' : 'bg-slate-300'"/>
                      {{ item.active ? 'Active' : 'Inactive' }}
                    </span>
                </td>

                <!-- Actions -->
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-1">
                    <button @click="openEdit(item)" title="Modifier"
                            class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-violet-500 hover:bg-violet-50 transition">
                      <IconPencil :size="13"/>
                    </button>
                    <button v-if="item.active" @click="confirmDeactivate(item)" title="Désactiver"
                            class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition">
                      <IconPower :size="13"/>
                    </button>
                    <button @click="confirmDelete(item)" title="Supprimer"
                            class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition">
                      <IconTrash :size="13"/>
                    </button>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>

            <!-- Pagination liste -->
            <div class="bg-white border-t border-slate-100 px-5 py-3 flex items-center justify-between">
              <span class="text-xs text-slate-500">
                {{ listRangeStart }}–{{ listRangeEnd }} sur
                <span class="font-semibold text-slate-700">{{
                    filteredAssignments.length
                  }}</span> résultat{{ filteredAssignments.length > 1 ? 's' : '' }}
              </span>
              <div class="flex items-center gap-1">
                <button @click="listPage = 1" :disabled="listPage === 1" class="pg-btn">«</button>
                <button @click="listPage--" :disabled="listPage === 1" class="pg-btn">‹</button>
                <span class="px-3 text-xs font-semibold text-slate-600">{{ listPage }} / {{ listTotalPages }}</span>
                <button @click="listPage++" :disabled="listPage === listTotalPages" class="pg-btn">›</button>
                <button @click="listPage = listTotalPages" :disabled="listPage === listTotalPages" class="pg-btn">»
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- ── Vue Timeline ── -->
        <template v-else-if="viewMode === 'timeline'">
          <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-100">
              <h2 class="text-sm font-bold text-slate-700">Timeline des assignations</h2>
            </div>
            <div class="px-5 py-4 space-y-4">
              <div v-for="item in filteredAssignments" :key="item.guid"
                   class="flex items-start gap-4">
                <div class="flex flex-col items-center flex-shrink-0">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                       :class="item.family === 'group' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-700'">
                    {{ initials(getRotationTargetName(item)) }}
                  </div>
                  <div class="w-px flex-1 bg-slate-200 mt-1"/>
                </div>
                <div class="flex-1 pb-4">
                  <div class="flex items-center gap-2 mb-1">
                    <p class="text-sm font-bold text-slate-800">{{ getRotationTargetName(item) }}</p>
                    <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                          :class="item.family === 'group' ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600'">
                      {{ item.family === 'group' ? 'Groupe' : 'Employé' }}
                    </span>
                    <span :class="item.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'"
                          class="text-xs font-bold px-2 py-0.5 rounded-full">
                      {{ item.active ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                  <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-4 gap-3 text-xs">
                    <div>
                      <p class="text-xs text-slate-400 font-bold uppercase tracking-wide mb-0.5">Rotation</p>
                      <p class="font-semibold text-slate-700">{{ item.rotation_group.name }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-slate-400 font-bold uppercase tracking-wide mb-0.5">Offset</p>
                      <p class="font-semibold text-blue-600"># {{ item.offset }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-slate-400 font-bold uppercase tracking-wide mb-0.5">Assignée par</p>
                      <p class="font-semibold text-slate-700">{{ item.assigned_by.name }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-slate-400 font-bold uppercase tracking-wide mb-0.5">Le</p>
                      <p class="font-semibold text-slate-700">{{ formatDatetime(item.assigned_at) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- ── Détails templates + KPIs ── -->
        <div v-if="resolvedRotationGroup" class="grid grid-cols-2 gap-4">

          <!-- Détails des templates -->
          <div class="bg-white border border-slate-200 rounded-2xl p-5">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <IconLayoutGrid :size="14" class="text-blue-500"/>
              </div>
              <h3 class="text-sm font-bold text-slate-800">Détails des templates</h3>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div v-for="ct in resolvedRotationGroup.cycle_templates" :key="ct.guid"
                   class="p-3 rounded-xl border"
                   :class="TEMPLATE_COLORS[ct.position % TEMPLATE_COLORS.length].card">
                <div class="flex items-center gap-2 mb-2">
                  <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        :class="TEMPLATE_COLORS[ct.position % TEMPLATE_COLORS.length].badge">
                    {{ ct.position + 1 }}
                  </span>
                  <p class="text-xs font-bold text-slate-800">{{ ct.template_snapshot.name }}</p>
                </div>
                <div class="space-y-1 text-xs">
                  <div class="flex justify-between">
                    <span class="text-slate-400">Heures de travail</span>
                    <span class="font-semibold text-slate-700">{{ templateWorkHours(ct.template_snapshot) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">Pause</span>
                    <span class="font-semibold text-slate-700">{{ templatePauseHours(ct.template_snapshot) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">Tolérance</span>
                    <span class="font-semibold text-slate-700">{{ templateTolerance(ct.template_snapshot) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Récapitulatif période -->
          <div class="bg-white border border-slate-200 rounded-2xl p-5">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <IconChartBar :size="14" class="text-emerald-500"/>
              </div>
              <h3 class="text-sm font-bold text-slate-800">Récapitulatif période</h3>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div v-for="kpi in periodKPIs" :key="kpi.label"
                   class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" :class="kpi.bg">
                  <component :is="kpi.icon" :size="15" :class="kpi.color"/>
                </div>
                <div>
                  <p class="text-xs text-slate-400 font-medium leading-tight">{{ kpi.label }}</p>
                  <p class="text-sm font-bold text-slate-800">{{ kpi.value }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </template>
    </div>

    <!-- ── Deactivate confirm ── -->
    <Teleport to="body">
      <div v-if="deactivateTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/25 backdrop-blur-sm" aria-hidden="true"/>
        <div role="alertdialog" aria-modal="true" aria-labelledby="deactivate-rotation-assignment-title"
             class="relative bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <IconPower :size="18" class="text-amber-500"/>
            </div>
            <div>
              <p id="deactivate-rotation-assignment-title" class="text-slate-800 font-bold text-sm">Désactiver
                l'assignation</p>
              <p class="text-slate-400 text-xs mt-0.5">L'assignation sera marquée inactive</p>
            </div>
          </div>
          <p class="text-slate-600 text-sm mb-5">
            Désactiver l'assignation de
            <span class="font-semibold text-slate-800">{{ getRotationTargetName(deactivateTarget) }}</span>
            sur <span class="font-semibold text-slate-800">{{ deactivateTarget.rotation_group.name }}</span> ?
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

    <!-- ── Delete confirm ── -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/25 backdrop-blur-sm" aria-hidden="true"/>
        <div role="alertdialog" aria-modal="true" aria-labelledby="delete-rotation-assignment-title"
             class="relative bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <IconAlertTriangle :size="18" class="text-red-500"/>
            </div>
            <div>
              <p id="delete-rotation-assignment-title" class="text-slate-800 font-bold text-sm">Supprimer
                l'assignation</p>
              <p class="text-slate-400 text-xs mt-0.5">Cette action est irréversible</p>
            </div>
          </div>
          <p class="text-slate-600 text-sm mb-5">
            Supprimer l'assignation de
            <span class="font-semibold text-slate-800">{{ getRotationTargetName(deleteTarget) }}</span> ?
          </p>
          <div class="flex gap-2">
            <button type="button" @click="deleteTarget = null" :disabled="actionLoading"
                    class="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition disabled:cursor-not-allowed disabled:opacity-50">
              Annuler
            </button>
            <button @click="doDelete" :disabled="actionLoading"
                    class="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition disabled:opacity-60">
              {{ actionLoading ? '...' : 'Supprimer' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Form ── -->
    <RotationAssignmentForm
        v-if="showForm"
        :assignment="editTarget"
        @close="showForm = false"
        @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import {ref, computed, onMounted, onBeforeUnmount, defineComponent, h} from 'vue'
import {
  IconCalendarStats, IconChevronRight, IconPlus, IconLoader2,
  IconUser, IconUsers, IconFilter, IconSearch, IconArrowRight,
  IconInfoCircle, IconPower, IconAlertTriangle, IconLayoutGrid,
  IconChartBar, IconUpload, IconChevronDown, IconTable, IconFile,
  IconFileText, IconClock, IconCoffee, IconRotate, IconCalendar,
  IconList, IconRefresh, IconPencil, IconTrash, IconHash, IconPrinter, IconArrowLeft,
} from '@tabler/icons-vue'

// Icône Timeline (non dispo dans toutes versions de tabler, fallback sur IconGitBranch)
import {IconGitBranch as IconTimeline} from '@tabler/icons-vue'

import RotationAssignmentService from '@/service/RotationAssignment'
import RotationAssignmentForm from './rotationAssignmentForm.vue'
import {useBodyScrollLock} from '@/views/planning/composables/useBodyScrollLock'
import {
  isGroupRotationAssignment, isUserRotationAssignment,
  getRotationTargetName, resolveRotationGroup, resolveTemplatePosition,
} from './type'
import type {
  IRotationAssignment, IRotationGroupFull, IRotationTemplateSnapshot,
} from './type'
import {useUserStore} from '@/stores/userStore'

import {exportRotationCSV, exportRotationExcel} from '@/utils/exports/rotationAssignment.export'
import {exportRotationPDF} from "@/utils/exports/exportRotationPDF";

const userStore = useUserStore()

// ── Composant inline RotationCell ─────────────────────────────────────────────
interface RotationCellData {
  templateName: string
  work: string
  pause?: string
  colorIndex: number
  isEmpty: boolean   // jour non travaillé selon la definition
  isOffDay: boolean   // jour sans aucun bloc (repos)
}

const TEMPLATE_COLORS = [
  {
    dot: 'bg-violet-400',
    badge: 'bg-violet-100 text-violet-700',
    card: 'bg-violet-50 border-violet-100',
    cell: 'bg-violet-50 text-violet-700 border-violet-100'
  },
  {
    dot: 'bg-blue-400',
    badge: 'bg-blue-100 text-blue-700',
    card: 'bg-blue-50 border-blue-100',
    cell: 'bg-blue-50 text-blue-700 border-blue-100'
  },
  {
    dot: 'bg-blue-400',
    badge: 'bg-blue-100 text-blue-700',
    card: 'bg-blue-50 border-blue-100',
    cell: 'bg-blue-50 text-blue-700 border-blue-100'
  },
  {
    dot: 'bg-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    card: 'bg-amber-50 border-amber-100',
    cell: 'bg-amber-50 text-amber-700 border-amber-100'
  },
]

const RotationCell = defineComponent({
  props: {data: {type: Object as () => RotationCellData | null, default: null}},
  setup(props) {
    return () => {
      const d = props.data
      if (!d || d.isOffDay) {
        return h('span', {class: 'text-slate-300 text-xs'}, '—')
      }
      if (d.isEmpty) {
        return h('span', {class: 'text-slate-300 text-xs'}, '·')
      }
      const colorCls = TEMPLATE_COLORS[d.colorIndex % TEMPLATE_COLORS.length].cell
      return h('div', {class: 'flex flex-col gap-0.5'}, [
        h('span', {class: `inline-block text-xs font-bold rounded px-1 py-2 leading-tight border ${colorCls}`},
            d.work),
        d.pause
            ? h('span', {class: 'inline-block text-xs font-medium text-amber-600 bg-amber-50 rounded px-1 py-2 leading-tight border border-amber-100'},
                d.pause)
            : null,
      ])
    }
  },
})

// ── Constants ─────────────────────────────────────────────────────────────────
const DAY_FR: Record<string, string> = {
  Mon: 'Lun', Tue: 'Mar', Wed: 'Mer', Thu: 'Jeu', Fri: 'Ven', Sat: 'Sam', Sun: 'Dim',
}
const JS_DAY_TO_KEY: Record<number, string> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun',
}
const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const LIST_PER_PAGE = 20

// ── State ─────────────────────────────────────────────────────────────────────
const allAssignments = ref<IRotationAssignment[]>([])
const loading = ref(false)

const selectedRotationGroupGuid = ref('')
const selectedMemberGuid = ref('')
const viewMode = ref<'calendar' | 'list' | 'timeline'>('calendar')
const advancedOpen = ref(false)
const filterStatus = ref('')
const filterManagerGuid = ref('')
const memberSearch = ref('')
const exportDropdownOpen = ref(false)
const exportDropdownRef = ref<HTMLElement | null>(null)
const exportLoading = ref<'pdf' | 'excel' | 'csv' | null>(null)
const listPage = ref(1)

const showForm = ref(false)
const editTarget = ref<IRotationAssignment | null>(null)
const deactivateTarget = ref<IRotationAssignment | null>(null)
const deleteTarget = ref<IRotationAssignment | null>(null)
const actionLoading = ref(false)

const confirmationOpen = computed(() => Boolean(deactivateTarget.value || deleteTarget.value))
useBodyScrollLock(confirmationOpen)

// Période : semaine courante
const today = new Date()
const monday = new Date(today)
monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
const sunday = new Date(monday)
sunday.setDate(monday.getDate() + 6)
const periodFrom = ref(monday.toISOString().split('T')[0])
const periodTo = ref(sunday.toISOString().split('T')[0])

// ── Computed : groupes de rotation disponibles (pour le filtre) ───────────────
const availableRotationGroups = computed(() => {
  const map = new Map<string, { guid: string; name: string; templateCount: number }>()
  for (const a of allAssignments.value) {
    const guid = a.rotation_group.guid
    if (!map.has(guid)) {
      const full = resolveRotationGroup(a)
      map.set(guid, {guid, name: a.rotation_group.name, templateCount: full?.cycle_templates.length ?? 0})
    }
  }
  return Array.from(map.values())
})

// ── Computed : managers disponibles ──────────────────────────────────────────
const availableManagers = computed(() => {
  const map = new Map<string, { guid: string; name: string }>()
  for (const a of allAssignments.value) {
    const guid = a.assigned_by.guid
    if (!map.has(guid)) map.set(guid, {guid, name: a.assigned_by.name})
  }
  return Array.from(map.values())
})

// ── Computed : assignations filtrées ─────────────────────────────────────────
// const filteredAssignments = computed(() => {
//   return allAssignments.value.filter((a) => {
//     if (selectedRotationGroupGuid.value && a.rotation_group.guid !== selectedRotationGroupGuid.value) return false
//     if (filterStatus.value === 'active'   && !a.active) return false
//     if (filterStatus.value === 'inactive' &&  a.active) return false
//     if (filterManagerGuid.value && a.assigned_by.guid !== filterManagerGuid.value) return false
//     return true
//   })
// })

const filteredAssignments = computed(() => {
  // Réinitialiser la pagination à chaque changement de filtre
  listPage.value = 1

  const pTo = new Date(periodTo.value)

  return allAssignments.value.filter((a) => {
    if (selectedRotationGroupGuid.value && a.rotation_group.guid !== selectedRotationGroupGuid.value) return false
    if (filterStatus.value === 'active' && !a.active) return false
    if (filterStatus.value === 'inactive' && a.active) return false
    if (filterManagerGuid.value && a.assigned_by.guid !== filterManagerGuid.value) return false

    // Filtre période : l'assignation doit avoir été faite avant la fin de la période
    // Les rotations n'ont pas de end_date — on inclut si assigned_at <= periodTo
    if (a.assigned_at) {
      const assignedAt = new Date(a.assigned_at)
      if (assignedAt > pTo) return false
    }

    return true
  })
})

// ── Computed : assignation groupe principale (pour la grille) ─────────────────
const primaryGroupAssignment = computed<IRotationAssignment | null>(() => {
  return filteredAssignments.value.find((a) => a.family === 'group') ?? null
})

const resolvedRotationGroup = computed<IRotationGroupFull | null>(() => {
  if (!primaryGroupAssignment.value) return null
  return resolveRotationGroup(primaryGroupAssignment.value)
})

const primaryGroupName = computed(() => {
  if (!primaryGroupAssignment.value || !isGroupRotationAssignment(primaryGroupAssignment.value)) return ''
  return primaryGroupAssignment.value.related.name
})

// ── Computed : tous les membres ───────────────────────────────────────────────
const allMembers = computed<{ guid: string; name: string; code: string; active: boolean; groupName: string }[]>(() => {
  const seen = new Set<string>()
  const result: { guid: string; name: string; code: string; active: boolean; groupName: string }[] = []

  for (const a of filteredAssignments.value) {
    if (isGroupRotationAssignment(a)) {
      for (const m of a.related.members.items) {
        if (!seen.has(m.user.guid)) {
          seen.add(m.user.guid)
          result.push({
            guid: m.user.guid,
            name: `${m.user.first_name} ${m.user.last_name}`.trim(),
            code: m.user.employee_code ?? '',
            active: m.user.active,
            groupName: a.related.name,
          })
        }
      }
    } else if (isUserRotationAssignment(a)) {
      if (!seen.has(a.related.guid)) {
        seen.add(a.related.guid)
        result.push({
          guid: a.related.guid,
          name: `${a.related.first_name} ${a.related.last_name}`.trim(),
          code: a.related.employee_code ?? '',
          active: a.related.active,
          groupName: '',
        })
      }
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
})


// Membres filtrés par recherche + sélection
const displayedMembers = computed(() => {
  let list = allMembers.value
  if (memberSearch.value) {
    const q = memberSearch.value.toLowerCase()
    list = list.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.groupName.toLowerCase().includes(q)
    )
  }
  if (selectedMemberGuid.value) {
    list = list.filter((m) => m.guid === selectedMemberGuid.value)
  }
  return list
})

// ── Computed : jours calendrier ───────────────────────────────────────────────
const calendarDays = computed(() => {
  const days: {
    iso: string;
    dayLabel: string;
    dayNum: string;
    monthNum: string;
    isWeekend: boolean;
    isToday: boolean;
    jsDay: number
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

// ── Computed : labels ─────────────────────────────────────────────────────────
const periodLabel = computed(() => {
  const fmt = (s: string) => new Date(s).toLocaleDateString('fr-FR', {day: '2-digit', month: 'short', year: 'numeric'})
  return `${fmt(periodFrom.value)} → ${fmt(periodTo.value)}`
})

const periodDays = computed(() => {
  const ms = new Date(periodTo.value).getTime() - new Date(periodFrom.value).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1
})

const canExport = computed(() => filteredAssignments.value.length > 0)

// ── Pagination liste ──────────────────────────────────────────────────────────
const listTotalPages = computed(() => Math.ceil(filteredAssignments.value.length / LIST_PER_PAGE) || 1)
const paginatedAssignments = computed(() => {
  const start = (listPage.value - 1) * LIST_PER_PAGE
  return filteredAssignments.value.slice(start, start + LIST_PER_PAGE)
})
const listRangeStart = computed(() => filteredAssignments.value.length === 0 ? 0 : (listPage.value - 1) * LIST_PER_PAGE + 1)
const listRangeEnd = computed(() => Math.min(listPage.value * LIST_PER_PAGE, filteredAssignments.value.length))

// ── Computed : KPIs ───────────────────────────────────────────────────────────
const periodKPIs = computed(() => {
  if (!resolvedRotationGroup.value) return []
  const rg = resolvedRotationGroup.value

  // Compter les jours travaillés / off sur la période via la grille
  let workedDays = 0;
  let offDays = 0
  for (const day of calendarDays.value) {
    const cell = getRotationCell(day)
    if (cell && !cell.isOffDay && !cell.isEmpty) workedDays++
    else offDays++
  }

  // Estimation heures : on fait la moyenne des templates
  const totalWorkH = rg.cycle_templates.reduce((acc, ct) => {
    let h = 0
    for (const d of DAY_ORDER) {
      const b = ct.template_snapshot.definition[d]
      if (b && Array.isArray(b) && b.length > 0) {
        h = timeToHours(b[0].work[1]) - timeToHours(b[0].work[0]);
        break
      }
    }
    return acc + h
  }, 0)
  const avgH = totalWorkH / (rg.cycle_templates.length || 1)

  return [
    {
      label: 'Jours travaillés (au moins 1 shift)',
      value: String(workedDays),
      icon: IconClock,
      bg: 'bg-blue-50',
      color: 'text-blue-500'
    },
    {
      label: 'Jours off (aucun shift)',
      value: String(offDays),
      icon: IconCoffee,
      bg: 'bg-red-50',
      color: 'text-red-400'
    },
    {
      label: 'Heures totales (Estimation)',
      value: formatHours(workedDays * avgH),
      icon: IconClock,
      bg: 'bg-blue-50',
      color: 'text-blue-500'
    },
    {
      label: 'Moyenne / jour (Estimation)',
      value: formatHours(avgH),
      icon: IconChartBar,
      bg: 'bg-violet-50',
      color: 'text-violet-500'
    },
  ]
})

function getRotationCell(
    day: { iso: string; jsDay: number },
    member: { guid: string } | null = null,
): RotationCellData | null {
  // Trouver l'assignation du membre (user direct ou via groupe)
  let a: IRotationAssignment | null = null
  let rg: IRotationGroupFull | null = null

  if (member) {
    // Chercher d'abord une assignation user directe pour ce membre
    const userAssignment = filteredAssignments.value.find(
        (x) => x.family === 'user' && isUserRotationAssignment(x) && x.related.guid === member.guid
    )
    if (userAssignment) {
      a = userAssignment
      rg = resolveRotationGroup(userAssignment)
    } else {
      // Chercher dans les assignations groupe dont ce membre fait partie
      const groupAssignment = filteredAssignments.value.find(
          (x) => x.family === 'group'
              && isGroupRotationAssignment(x)
              && x.related.members.items.some((m) => m.user.guid === member.guid)
      )
      if (groupAssignment) {
        a = groupAssignment
        rg = resolveRotationGroup(groupAssignment)
      }
    }
  } else {
    // Fallback : utiliser primaryGroupAssignment (vue sans membre sélectionné)
    a = primaryGroupAssignment.value
    rg = resolvedRotationGroup.value
  }

  if (!rg || !a) return null

  // Garde contre start_date absent ou invalide
  if (!rg.start_date || isNaN(new Date(rg.start_date).getTime())) {
    return {templateName: '—', work: '', colorIndex: 0, isEmpty: true, isOffDay: true}
  }

  const position = resolveTemplatePosition(
      rg.start_date, day.iso, a.offset, rg.cycle_length, rg.direction, rg.rotation_step
  )

  if (isNaN(position)) {
    return {templateName: '—', work: '', colorIndex: 0, isEmpty: true, isOffDay: true}
  }

  const ct = rg.cycle_templates.find((t) => t.position === position)
  if (!ct) return {templateName: '', work: '', colorIndex: 0, isEmpty: true, isOffDay: true}

  const key = JS_DAY_TO_KEY[day.jsDay] as keyof typeof ct.template_snapshot.definition
  const blocks = ct.template_snapshot.definition[key]

  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return {templateName: ct.template_snapshot.name, work: '', colorIndex: ct.position, isEmpty: false, isOffDay: true}
  }

  const b = blocks[0]
  return {
    templateName: ct.template_snapshot.name,
    work: `${b.work[0]}\n${b.work[1]}`,
    pause: b.pause ? `${b.pause[0]}-${b.pause[1]}` : undefined,
    colorIndex: ct.position,
    isEmpty: false,
    isOffDay: false,
  }
}

// ── Helpers template ──────────────────────────────────────────────────────────
function templateWorkSummary(tpl: IRotationTemplateSnapshot): string {
  for (const d of DAY_ORDER) {
    const b = tpl.definition[d]
    if (b && Array.isArray(b) && b.length > 0) return `${b[0].work[0]} - ${b[0].work[1]}${b[0].pause ? ` (${b[0].pause[0]} - ${b[0].pause[1]})` : ' (Sans pause)'}`
  }
  return '—'
}

function templateWorkHours(tpl: IRotationTemplateSnapshot): string {
  for (const d of DAY_ORDER) {
    const b = tpl.definition[d]
    if (b && Array.isArray(b) && b.length > 0) return `${b[0].work[0]} - ${b[0].work[1]}`
  }
  return '—'
}

function templatePauseHours(tpl: IRotationTemplateSnapshot): string {
  for (const d of DAY_ORDER) {
    const b = tpl.definition[d]
    if (b && Array.isArray(b) && b.length > 0 && b[0].pause) return `${b[0].pause[0]} - ${b[0].pause[1]}`
  }
  return '—'
}

function templateTolerance(tpl: IRotationTemplateSnapshot): string {
  for (const d of DAY_ORDER) {
    const b = tpl.definition[d]
    if (b && Array.isArray(b) && b.length > 0) return `${b[0].tolerance} min`
  }
  return '—'
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', {day: '2-digit', month: 'short', year: 'numeric'})
}

function formatDatetime(d?: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function timeToHours(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h + (m ?? 0) / 60
}

function formatHours(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${String(hh).padStart(2, '0')}h${mm > 0 ? String(mm).padStart(2, '0') : '00'}`
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function load() {
  if (!userStore.user?.guid) return
  try {
    loading.value = true
    const filters: Record<string, any> = {
      limit: 200,
      date_from: periodFrom.value,
      date_to: periodTo.value,
    }
    if (selectedRotationGroupGuid.value) filters.rotation_group = selectedRotationGroupGuid.value
    const res = await RotationAssignmentService.list(userStore.user.guid, filters)
    if (res?.success) {
      allAssignments.value = res.data.rotation_assignments.items
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────
function setViewMode(mode: 'calendar' | 'list' | 'timeline') {
  viewMode.value = mode
}

function resetFilters() {
  filterStatus.value = ''
  filterManagerGuid.value = ''
}

function openCreate() {
  editTarget.value = null;
  showForm.value = true
}

function openEdit(item: IRotationAssignment) {
  editTarget.value = item;
  showForm.value = true
}

function confirmDeactivate(item: IRotationAssignment) {
  deactivateTarget.value = item
}

function confirmDelete(item: IRotationAssignment) {
  deleteTarget.value = item
}

async function doDeactivate() {
  if (!deactivateTarget.value) return
  try {
    actionLoading.value = true
    await RotationAssignmentService.deactivate(deactivateTarget.value.guid)
    deactivateTarget.value = null;
    await load()
  } finally {
    actionLoading.value = false
  }
}

async function doDelete() {
  if (!deleteTarget.value) return
  try {
    actionLoading.value = true
    await RotationAssignmentService.delete(deleteTarget.value.guid)
    deleteTarget.value = null;
    await load()
  } finally {
    actionLoading.value = false
  }
}

function onSaved() {
  showForm.value = false;
  load()
}

// ── Export ────────────────────────────────────────────────────────────────────
// async function handleExportPDF() {
//   if (!canExport.value) return
//   exportLoading.value = 'pdf'; exportDropdownOpen.value = false
//   try {
//     await RotationAssignmentService.exportPDF({
//       targetGuid: selectedMemberGuid.value,
//       targetType: 'group',
//       periodFrom: periodFrom.value,
//       periodTo:   periodTo.value,
//       rotationGroupGuid: selectedRotationGroupGuid.value,
//     })
//   } finally { exportLoading.value = null }
// }

async function handleExportPDF() {
  if (!canExport.value) return
  exportLoading.value = 'pdf';
  exportDropdownOpen.value = false
  try {
    exportRotationPDF({
      assignments: filteredAssignments.value,
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
  exportRotationExcel({
    assignments: filteredAssignments.value,
    periodFrom: periodFrom.value,
    periodTo: periodTo.value,
    generatedBy: `${userStore.user?.first_name} ${userStore.user?.last_name}`.trim(),
    tenantName: userStore.tenant?.name,
  })
}

async function handleExportCSV() {
  exportRotationCSV({
    assignments: filteredAssignments.value,
    periodFrom: periodFrom.value,
    periodTo: periodTo.value,
    generatedBy: `${userStore.user?.first_name} ${userStore.user?.last_name}`.trim(),
    tenantName: userStore.tenant?.name,
  })
}

// function handlePrint() {
//   RotationAssignmentService.printCurrent()
// }
function handlePrint() {
  window.print()
}

function onDocumentClick(e: MouseEvent) {
  if (exportDropdownRef.value && !exportDropdownRef.value.contains(e.target as Node)) {
    exportDropdownOpen.value = false
  }
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
  @apply px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700
  focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition;
}

.pg-btn {
  @apply h-7 px-2.5 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500
  bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs;
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