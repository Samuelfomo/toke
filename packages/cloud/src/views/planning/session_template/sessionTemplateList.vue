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
  <div class="mx-auto flex h-full w-full max-w-[1500px] flex-col bg-slate-50">
<!--  <div class="flex h-full flex-col bg-slate-50">-->
    <header class="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-5 sm:px-8">
      <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div class="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
            <IconCalendarEvent :size="12"/>
            <span>Planning et rotations</span>
            <IconChevronRight :size="12"/>
            <span class="font-medium text-slate-600">Modèles d’horaires</span>
          </div>
          <h1 class="text-xl font-bold text-slate-800">Modèles d’horaires</h1>
          <p class="mt-0.5 text-sm text-slate-400">
            Configurez les horaires réutilisables affectés aux employés et aux rotations.
          </p>
        </div>

        <button
            type="button"
            class="flex flex-shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
            @click="openCreate"
        >
          <IconPlus :size="15"/>
          Créer un horaire
        </button>
      </div>
    </header>

    <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-8">
      <!-- Indicateurs -->
      <section class="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <article class="metric-card">
          <div class="metric-icon bg-blue-50 text-blue-600">
            <IconCalendarEvent :size="17"/>
          </div>
          <div>
            <p class="metric-label">Total des modèles</p>
            <p class="metric-value">{{ pagination.count }}</p>
            <p class="metric-hint">dans les résultats</p>
          </div>
        </article>

        <article class="metric-card">
          <div class="metric-icon bg-emerald-50 text-emerald-600">
            <IconCircleCheck :size="17"/>
          </div>
          <div>
            <p class="metric-label">Modèles actifs</p>
            <p class="metric-value">{{ activeCount }}</p>
            <p class="metric-hint">{{ metricScopeLabel }}</p>
          </div>
        </article>

        <article class="metric-card">
          <div class="metric-icon bg-violet-50 text-violet-600">
            <IconRefresh :size="17"/>
          </div>
          <div>
            <p class="metric-label">Pour rotation</p>
            <p class="metric-value">{{ rotationCount }}</p>
            <p class="metric-hint">{{ metricScopeLabel }}</p>
          </div>
        </article>

        <article class="metric-card">
          <div class="metric-icon bg-amber-50 text-amber-600">
            <IconStar :size="17"/>
          </div>
          <div>
            <p class="metric-label">Par défaut</p>
            <p class="metric-value">{{ defaultCount }}</p>
            <p class="metric-hint">{{ metricScopeLabel }}</p>
          </div>
        </article>
      </section>

      <!-- Filtres -->
      <section class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div class="flex flex-wrap items-center gap-3">
          <div class="relative min-w-[210px] flex-1 sm:max-w-sm">
            <button
                type="button"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-600"
                @click="applySearch"
            >
              <IconSearch :size="14"/>
            </button>
            <input
                v-model="searchInput"
                type="text"
                placeholder="Rechercher un modèle…"
                class="input-base w-full !pl-9 !pr-8"
                @keyup.enter="applySearch"
            />
            <button
                v-if="searchInput"
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                @click="clearSearch"
            >
              <IconX :size="13"/>
            </button>
          </div>

          <select v-model="filterModel" class="input-base w-auto cursor-pointer" @change="resetAndLoad">
            <option value="">Toutes les normes</option>
            <option v-for="model in sessionModels" :key="model.guid" :value="model.guid">
              {{ model.name }}
            </option>
          </select>

          <select v-model="filterActive" class="input-base w-auto cursor-pointer" @change="resetAndLoad">
            <option value="">Tous les statuts</option>
            <option value="true">Actifs</option>
            <option value="false">Inactifs</option>
          </select>

          <select v-model="filterRotation" class="input-base w-auto cursor-pointer" @change="resetAndLoad">
            <option value="">Tous les usages</option>
            <option value="true">Pour rotation</option>
            <option value="false">Standard</option>
          </select>

          <button
              v-if="hasActiveFilters"
              type="button"
              class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
              @click="resetFilters"
          >
            <IconFilterOff :size="14"/>
            Réinitialiser
          </button>

          <div class="flex-1"/>

          <div class="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
            <span>Lignes :</span>
            <select
                :value="pagination.limit"
                class="input-base w-auto cursor-pointer py-1.5 text-xs"
                @change="changePerPage(Number(($event.target as HTMLSelectElement).value))"
            >
              <option v-for="value in [5, 10, 20, 50]" :key="value" :value="value">{{ value }}</option>
            </select>
          </div>
        </div>
      </section>

      <div
          v-if="loadError"
          class="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <div class="flex items-start gap-2">
          <IconAlertTriangle :size="16" class="mt-0.5 flex-shrink-0"/>
          <span>{{ loadError }}</span>
        </div>
        <button type="button" class="text-xs font-semibold underline" @click="load">Réessayer</button>
      </div>

      <!-- Tableau desktop -->
      <section class="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
            <tr class="border-b border-slate-100 text-xs font-bold uppercase tracking-widest text-slate-400">
              <th class="px-5 py-3 text-left">Modèle</th>
              <th class="px-4 py-3 text-left">Norme</th>
              <th class="px-4 py-3 text-left">Semaine</th>
              <th class="px-4 py-3 text-left">Horaires configurés</th>
              <th class="px-4 py-3 text-left">Utilisation</th>
              <th class="px-4 py-3 text-left">Statut</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
            </thead>

            <tbody v-if="loading">
            <tr>
              <td colspan="7" class="py-20 text-center">
                <div class="flex items-center justify-center gap-2 text-slate-400">
                  <IconLoader2 :size="18" class="animate-spin"/>
                  <span class="text-sm">Chargement…</span>
                </div>
              </td>
            </tr>
            </tbody>

            <tbody v-else-if="items.length === 0">
            <tr>
              <td colspan="7" class="py-20 text-center">
                <EmptyState
                    :filtered="hasActiveFilters"
                    @create="openCreate"
                    @reset="resetFilters"
                />
              </td>
            </tr>
            </tbody>

            <tbody v-else>
            <tr
                v-for="item in items"
                :key="item.guid"
                class="border-b border-slate-50 transition last:border-0 hover:bg-slate-50"
            >
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-2.5">
                  <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <IconCalendarEvent :size="14" class="text-blue-600"/>
                  </div>
                  <div class="min-w-0">
                    <p class="max-w-[220px] truncate text-sm font-semibold text-slate-800">{{ item.name }}</p>
                    <div class="mt-1 flex flex-wrap gap-1">
                      <span v-if="isDefault(item)" class="badge bg-amber-50 text-amber-700">Par défaut</span>
                      <span v-if="item.for_rotation" class="badge bg-violet-50 text-violet-700">Rotation</span>
                    </div>
                  </div>
                </div>
              </td>

              <td class="px-4 py-3.5">
                  <span
                      class="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    <IconShieldCheck :size="11" class="text-slate-400"/>
                    {{ sessionModelName(item) }}
                  </span>
              </td>

              <td class="px-4 py-3.5">
                <div class="flex flex-wrap gap-1">
                    <span
                        v-for="day in DAY_ORDER"
                        :key="`${item.guid}-${day}`"
                        class="flex h-6 w-7 items-center justify-center rounded-md text-xs font-semibold"
                        :class="dayBadgeClass(item.definition, day)"
                        :title="dayTitle(item.definition, day)"
                    >
                      {{ DAY_FR[day] }}
                    </span>
                </div>
              </td>

              <td class="max-w-[270px] px-4 py-3.5">
                <p class="line-clamp-2 text-xs leading-5 text-slate-600" :title="fullScheduleSummary(item.definition)">
                  {{ fullScheduleSummary(item.definition) }}
                </p>
              </td>

              <td class="px-4 py-3.5">
                <button
                    type="button"
                    class="group inline-flex items-center gap-2 text-left"
                    @click="openUsage(item)"
                >
                    <span
                        class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600">
                      <IconUsers :size="14"/>
                    </span>
                  <span>
                      <span class="block text-xs font-semibold text-slate-700">{{ usageLabel(item) }}</span>
                      <span class="block text-xs text-slate-400">Voir le détail</span>
                    </span>
                </button>
              </td>

              <td class="px-4 py-3.5">
                  <span
                      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                      :class="isCurrent(item) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'"
                  >
                    <span class="h-1.5 w-1.5 rounded-full"
                          :class="isCurrent(item) ? 'bg-emerald-500' : 'bg-slate-300'"/>
                    {{ isCurrent(item) ? 'Actif' : 'Inactif' }}
                  </span>
              </td>

              <td class="relative px-4 py-3.5 text-right">
                <button
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    title="Actions"
                    @click.stop="toggleMenu(item.guid)"
                >
                  <IconDotsVertical :size="16"/>
                </button>

                <div
                    v-if="openMenuGuid === item.guid"
                    class="absolute right-4 top-11 z-20 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl"
                    @click.stop
                >
                  <button type="button" class="menu-item" @click="openDetail(item)">
                    <IconEye :size="14"/>
                    Consulter
                  </button>
                  <button type="button" class="menu-item" @click="openEdit(item)">
                    <IconPencil :size="14"/>
                    Modifier
                  </button>
                  <button type="button" class="menu-item" @click="openDuplicate(item)">
                    <IconCopy :size="14"/>
                    Dupliquer
                  </button>
                  <button type="button" class="menu-item" @click="openUsage(item)">
                    <IconUsers :size="14"/>
                    Voir les utilisations
                  </button>
                  <button type="button" class="menu-item" @click="toggleCurrent(item)">
                    <IconPower :size="14"/>
                    {{ isCurrent(item) ? 'Désactiver' : 'Activer' }}
                  </button>
                  <div class="my-1 border-t border-slate-100"/>
                  <button type="button" class="menu-item !text-red-600 hover:!bg-red-50" @click="confirmDelete(item)">
                    <IconTrash :size="14"/>
                    Supprimer
                  </button>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Cartes mobile -->
      <section class="space-y-3 md:hidden">
        <div v-if="loading" class="flex items-center justify-center gap-2 py-16 text-slate-400">
          <IconLoader2 :size="18" class="animate-spin"/>
          <span class="text-sm">Chargement…</span>
        </div>

        <EmptyState
            v-else-if="items.length === 0"
            :filtered="hasActiveFilters"
            @create="openCreate"
            @reset="resetFilters"
        />

        <template v-else>
          <article
              v-for="item in items"
              :key="item.guid"
              class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-2.5">
                <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <IconCalendarEvent :size="16" class="text-blue-600"/>
                </div>
                <button type="button" class="min-w-0 text-left" @click="openDetail(item)">
                  <p class="truncate text-sm font-semibold text-slate-800">{{ item.name }}</p>
                  <p class="mt-0.5 truncate text-xs text-slate-400">{{ sessionModelName(item) }}</p>
                </button>
              </div>
              <span
                  class="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="isCurrent(item) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'"
              >
              {{ isCurrent(item) ? 'Actif' : 'Inactif' }}
            </span>
            </div>

            <div class="mt-4 flex flex-wrap gap-1">
            <span
                v-for="day in DAY_ORDER"
                :key="`${item.guid}-mobile-${day}`"
                class="flex h-7 w-8 items-center justify-center rounded-lg text-xs font-semibold"
                :class="dayBadgeClass(item.definition, day)"
            >
              {{ DAY_FR[day] }}
            </span>
            </div>

            <div class="mt-3 rounded-xl bg-slate-50 p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Horaires configurés</p>
              <p class="mt-1 text-xs leading-5 text-slate-600">{{ fullScheduleSummary(item.definition) }}</p>
            </div>

            <div class="mt-3 flex items-center justify-between gap-3 text-xs">
              <button type="button" class="inline-flex items-center gap-1.5 text-slate-500" @click="openUsage(item)">
                <IconUsers :size="14"/>
                {{ usageLabel(item) }}
              </button>
              <div class="flex gap-1">
                <span v-if="isDefault(item)" class="badge bg-amber-50 text-amber-700">Par défaut</span>
                <span v-if="item.for_rotation" class="badge bg-violet-50 text-violet-700">Rotation</span>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-4 gap-2 border-t border-slate-100 pt-3">
              <button type="button" class="mobile-action text-blue-600" @click="openEdit(item)">
                <IconPencil :size="13"/>
                Modifier
              </button>
              <button type="button" class="mobile-action text-violet-600" @click="openDuplicate(item)">
                <IconCopy :size="13"/>
                Dupliquer
              </button>
              <button type="button" class="mobile-action text-slate-600" @click="toggleCurrent(item)">
                <IconPower :size="13"/>
                {{ isCurrent(item) ? 'Désact.' : 'Activer' }}
              </button>
              <button type="button" class="mobile-action text-red-600" @click="confirmDelete(item)">
                <IconTrash :size="13"/>
                Supprimer
              </button>
            </div>
          </article>
        </template>
      </section>

      <!-- Pagination -->
      <section
          v-if="pagination.count > 0"
          class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"
      >
        <span>
          {{ rangeStart }}–{{ rangeEnd }} sur
          <strong class="text-slate-700">{{ pagination.count }}</strong>
          résultat{{ pagination.count > 1 ? 's' : '' }}
        </span>

        <div class="flex items-center gap-1">
          <button type="button" class="pg-btn" :disabled="currentPage === 1" @click="goToPage(1)">
            <IconChevronsLeft :size="13"/>
          </button>
          <button type="button" class="pg-btn" :disabled="currentPage === 1" @click="prevPage">
            <IconChevronLeft :size="13"/>
          </button>

          <template v-for="page in visiblePages" :key="`page-${page}`">
            <span v-if="page === '...'" class="select-none px-1.5 text-slate-300">…</span>
            <button
                v-else
                type="button"
                class="pg-btn min-w-[30px]"
                :class="currentPage === Number(page) ? '!border-blue-600 !bg-blue-600 !text-white' : ''"
                @click="goToPage(Number(page))"
            >
              {{ page }}
            </button>
          </template>

          <button type="button" class="pg-btn" :disabled="currentPage === totalPages" @click="nextPage">
            <IconChevronRight :size="13"/>
          </button>
          <button type="button" class="pg-btn" :disabled="currentPage === totalPages" @click="goToPage(totalPages)">
            <IconChevronsRight :size="13"/>
          </button>
        </div>
      </section>
    </div>

    <!-- Suppression -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true"/>
        <section role="alertdialog" aria-modal="true" aria-labelledby="delete-session-template-title" class="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <div class="mb-4 flex items-center gap-3">
            <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-50">
              <IconAlertTriangle :size="20" class="text-red-500"/>
            </div>
            <div>
              <p id="delete-session-template-title" class="text-sm font-semibold text-slate-800">Supprimer le modèle</p>
              <p class="mt-0.5 text-xs text-slate-400">Cette action est irréversible.</p>
            </div>
          </div>

          <p class="mb-6 text-sm leading-6 text-slate-600">
            Voulez-vous supprimer <strong class="text-slate-800">« {{ deleteTarget.name }} »</strong> ?
            Vérifiez d’abord qu’il n’est plus utilisé dans un planning.
          </p>

          <div class="flex gap-3">
            <button type="button" class="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="deleteLoading" @click="deleteTarget = null">
              Annuler
            </button>
            <button
                type="button"
                class="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                :disabled="deleteLoading"
                @click="doDelete"
            >
              {{ deleteLoading ? 'Suppression…' : 'Supprimer' }}
            </button>
          </div>
        </section>
      </div>
    </Teleport>

    <!-- Consultation -->
    <Teleport to="body">
      <div v-if="detailTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true"/>
        <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-template-detail-title"
            class="relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 id="session-template-detail-title" class="text-base font-semibold text-slate-800">{{ detailTarget.name }}</h3>
                <span v-if="isDefault(detailTarget)" class="badge bg-amber-50 text-amber-700">Par défaut</span>
                <span v-if="detailTarget.for_rotation" class="badge bg-violet-50 text-violet-700">Rotation</span>
              </div>
              <p class="mt-1 text-xs text-slate-400">{{ sessionModelName(detailTarget) }}</p>
            </div>
            <button type="button" class="text-slate-400 hover:text-slate-700" @click="detailTarget = null">
              <IconX :size="17"/>
            </button>
          </div>

          <div class="mt-5 grid gap-3 sm:grid-cols-3">
            <div class="usage-stat">
              <IconCircleCheck :size="17" class="text-emerald-600"/>
              <strong>{{ isCurrent(detailTarget) ? 'Actif' : 'Inactif' }}</strong>
              <span>Statut</span>
            </div>
            <div class="usage-stat">
              <IconCalendarEvent :size="17" class="text-blue-600"/>
              <strong>{{ workedDays(detailTarget.definition).length }}</strong>
              <span>Jours travaillés</span>
            </div>
            <div class="usage-stat">
              <IconUsers :size="17" class="text-violet-600"/>
              <strong>{{ usageDetails(detailTarget).total ?? '—' }}</strong>
              <span>Utilisations</span>
            </div>
          </div>

          <div class="mt-5 rounded-xl border border-slate-200 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</p>
            <p class="mt-2 text-sm leading-6 text-slate-600">
              {{ detailTarget.description || 'Aucune description renseignée.' }}</p>
          </div>

          <div class="mt-4 rounded-xl border border-slate-200 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Semaine configurée</p>
            <div class="mt-3 space-y-2">
              <div
                  v-for="day in DAY_ORDER"
                  :key="`detail-${day}`"
                  class="flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-2"
              >
                <span class="w-9 text-xs font-bold text-slate-500">{{ DAY_FR[day] }}</span>
                <span class="min-w-0 flex-1 text-xs leading-5 text-slate-600">{{
                    dayTitle(detailTarget.definition, day)
                  }}</span>
              </div>
            </div>
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600"
                    @click="detailTarget = null">
              Fermer
            </button>
            <button type="button" class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                    @click="editDetailTarget">
              Modifier
            </button>
          </div>
        </section>
      </div>
    </Teleport>

    <!-- Utilisations -->
    <Teleport to="body">
      <div v-if="usageTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true"/>
        <section role="dialog" aria-modal="true" aria-labelledby="session-template-usage-title" class="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 id="session-template-usage-title" class="text-sm font-semibold text-slate-800">Utilisations du modèle</h3>
              <p class="mt-1 text-xs text-slate-400">{{ usageTarget.name }}</p>
            </div>
            <button type="button" class="text-slate-400 hover:text-slate-700" @click="usageTarget = null">
              <IconX :size="17"/>
            </button>
          </div>

          <div class="mt-5 grid grid-cols-3 gap-3">
            <div class="usage-stat">
              <IconUsers :size="17" class="text-blue-600"/>
              <strong>{{ usageDetails(usageTarget).employees ?? '—' }}</strong>
              <span>Employés</span>
            </div>
            <div class="usage-stat">
              <IconUsersGroup :size="17" class="text-violet-600"/>
              <strong>{{ usageDetails(usageTarget).groups ?? '—' }}</strong>
              <span>Groupes</span>
            </div>
            <div class="usage-stat">
              <IconCalendarEvent :size="17" class="text-emerald-600"/>
              <strong>{{ usageDetails(usageTarget).total ?? '—' }}</strong>
              <span>Total</span>
            </div>
          </div>

          <div
              v-if="usageDetails(usageTarget).total === null"
              class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-700"
          >
            L’API de liste ne retourne pas encore les compteurs d’utilisation. L’interface est prête à les afficher via
            <code>usage.total</code>, <code>usage.employees</code> et <code>usage.groups</code>.
          </div>

          <button
              type="button"
              class="mt-5 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              @click="usageTarget = null"
          >
            Fermer
          </button>
        </section>
      </div>
    </Teleport>

    <SessionTemplateForm
        v-if="showForm"
        :template="formTarget"
        :session-models="sessionModels"
        :mode="formMode"
        @close="closeForm"
        @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import {computed, defineComponent, h, onBeforeUnmount, onMounted, ref} from 'vue'
import {
  IconAlertTriangle, IconArrowLeft,
  IconCalendarEvent,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheck,
  IconCopy,
  IconDotsVertical,
  IconEye,
  IconFilterOff,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconPower,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
  IconStar,
  IconTrash,
  IconUsers,
  IconUsersGroup,
  IconX,
} from '@tabler/icons-vue'
import SessionTemplateService from '@/service/SessionTemplate'
import SessionModelService from '@/service/SessionModelService'
import SessionTemplateForm from './sessionTemplateForm.vue'
import {useBodyScrollLock} from '@/views/planning/composables/useBodyScrollLock'
import type {IDayBlock, IDefinition, ISessionTemplate} from './type'
import type {IPagination} from '../session_model/type'

type FormMode = 'create' | 'edit' | 'duplicate'
type ListSummary = { active?: number; rotation?: number; default?: number }
type SessionModelOption = {
  guid: string
  name: string
  workday: string[]
  pause_allowed: boolean
  rotation_allowed: boolean
  [key: string]: unknown
}

const DAY_FR: Record<string, string> = {
  Mon: 'Lun', Tue: 'Mar', Wed: 'Mer', Thu: 'Jeu', Fri: 'Ven', Sat: 'Sam', Sun: 'Dim',
}
const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const EmptyState = defineComponent({
  props: {filtered: Boolean},
  emits: ['create', 'reset'],
  setup(props, {emit}) {
    return () => h('div', {class: 'flex flex-col items-center gap-3 py-10 text-center text-slate-400'}, [
      h(IconCalendarEvent, {size: 38, class: 'opacity-20'}),
      h('div', {}, [
        h('p', {class: 'text-sm font-medium text-slate-600'}, props.filtered ? 'Aucun modèle ne correspond aux filtres' : 'Aucun modèle d’horaires créé'),
        h('p', {class: 'mt-1 text-xs text-slate-400'}, props.filtered
            ? 'Modifiez ou réinitialisez les critères de recherche.'
            : 'Créez votre premier horaire réutilisable.'),
      ]),
      h('button', {
        type: 'button',
        class: 'text-xs font-semibold text-blue-600 hover:text-blue-700',
        onClick: () => emit(props.filtered ? 'reset' : 'create'),
      }, props.filtered ? 'Réinitialiser les filtres' : 'Créer le premier horaire →'),
    ])
  },
})

const items = ref<ISessionTemplate[]>([])
const sessionModels = ref<SessionModelOption[]>([])
const loading = ref(false)
const loadError = ref('')
const listSummary = ref<ListSummary | null>(null)

const searchInput = ref('')
const searchActive = ref('')
const filterModel = ref('')
const filterActive = ref('')
const filterRotation = ref('')
const pagination = ref<IPagination>({offset: 0, limit: 10, count: 0})

const showForm = ref(false)
const formMode = ref<FormMode>('create')
const formTarget = ref<ISessionTemplate | null>(null)
const deleteTarget = ref<ISessionTemplate | null>(null)
const deleteLoading = ref(false)
const usageTarget = ref<ISessionTemplate | null>(null)
const detailTarget = ref<ISessionTemplate | null>(null)

const inlineOverlayOpen = computed(() => Boolean(deleteTarget.value || detailTarget.value || usageTarget.value))
useBodyScrollLock(inlineOverlayOpen)
const openMenuGuid = ref<string | null>(null)

const currentPage = computed(() => Math.floor(pagination.value.offset / pagination.value.limit) + 1)
const totalPages = computed(() => Math.max(1, Math.ceil(pagination.value.count / pagination.value.limit)))
const rangeStart = computed(() => pagination.value.count === 0 ? 0 : pagination.value.offset + 1)
const rangeEnd = computed(() => Math.min(pagination.value.offset + pagination.value.limit, pagination.value.count))
const visiblePages = computed<(number | '...')[]>(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 7) return Array.from({length: total}, (_, index) => index + 1)

  const result: (number | '...')[] = [1]
  if (current > 3) result.push('...')
  for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page++) result.push(page)
  if (current < total - 2) result.push('...')
  result.push(total)
  return result
})

const hasActiveFilters = computed(() => Boolean(
    searchActive.value || searchInput.value || filterModel.value || filterActive.value || filterRotation.value,
))
const metricScopeLabel = computed(() => listSummary.value ? 'au total' : 'sur cette page')
const activeCount = computed(() => listSummary.value?.active ?? items.value.filter(isCurrent).length)
const rotationCount = computed(() => listSummary.value?.rotation ?? items.value.filter((item) => item.for_rotation).length)
const defaultCount = computed(() => listSummary.value?.default ?? items.value.filter(isDefault).length)

function isCurrent(item: ISessionTemplate): boolean {
  return item.current ?? item.is_current ?? false
}

function isDefault(item: ISessionTemplate): boolean {
  return item.default ?? item.is_default ?? false
}

function sessionModelName(item: ISessionTemplate): string {
  if (!item.session_model) return '—'
  return typeof item.session_model === 'string' ? item.session_model : item.session_model.name ?? '—'
}

function workedDays(definition: IDefinition): string[] {
  return DAY_ORDER.filter((day) => Array.isArray(definition[day]) && (definition[day] as IDayBlock[]).length > 0)
}

function dayBadgeClass(definition: IDefinition, day: string): string {
  const value = definition[day]
  if (Array.isArray(value) && value.length > 0) return 'bg-blue-50 text-blue-600'
  if (Array.isArray(value) && value.length === 0) return 'bg-amber-50 text-amber-600'
  if (value === null) return 'bg-slate-200 text-slate-500'
  return 'bg-slate-100 text-slate-300'
}

function dayTitle(definition: IDefinition, day: string): string {
  const value = definition[day]
  if (Array.isArray(value) && value.length > 0) {
    return value.map((block) => `${block.work[0]}–${block.work[1]}`).join(', ')
  }
  if (Array.isArray(value)) return 'Repos'
  if (value === null) return 'Fermé'
  return 'Non configuré'
}

function fullScheduleSummary(definition: IDefinition): string {
  const groups = new Map<string, string[]>()

  for (const day of DAY_ORDER) {
    const value = definition[day]
    let label = 'Non configuré'
    if (Array.isArray(value) && value.length > 0) {
      label = value.map((block) => `${block.work[0]}–${block.work[1]}`).join(' + ')
    } else if (Array.isArray(value)) {
      label = 'Repos'
    } else if (value === null) {
      label = 'Fermé'
    }

    const days = groups.get(label) ?? []
    days.push(DAY_FR[day])
    groups.set(label, days)
  }

  return Array.from(groups.entries())
      .map(([schedule, days]) => `${days.join(', ')} : ${schedule}`)
      .join(' · ')
}

function usageDetails(item: ISessionTemplate): {
  total: number | null;
  employees: number | null;
  groups: number | null
} {
  const usage = item.usage
  const employees = usage?.employees ?? item.employee_count ?? null
  const groups = usage?.groups ?? item.group_count ?? null
  const total = usage?.total ?? item.usage_count ?? (
      employees !== null || groups !== null ? (employees ?? 0) + (groups ?? 0) : null
  )
  return {total, employees, groups}
}

function usageLabel(item: ISessionTemplate): string {
  const total = usageDetails(item).total
  if (total === null) return 'Utilisation non renseignée'
  if (total === 0) return 'Non utilisé'
  return `${total} utilisation${total > 1 ? 's' : ''}`
}

function normalizeListData(response: any): {
  items: ISessionTemplate[];
  pagination: Partial<IPagination>;
  summary: ListSummary | null
} {
  const data = response?.data ?? {}
  const sessionTemplates = data.session_templates ?? {}
  const templates = data.templates ?? {}
  const rawItems = sessionTemplates.items ?? templates.items ?? []

  return {
    items: Array.isArray(rawItems) ? rawItems : [],
    pagination: sessionTemplates.pagination ?? templates.pagination ?? {},
    summary: data.summary ?? sessionTemplates.summary ?? templates.summary ?? null,
  }
}

async function load() {
  loading.value = true
  loadError.value = ''

  try {
    const filters: Record<string, any> = {
      offset: pagination.value.offset,
      limit: pagination.value.limit,
    }
    if (searchActive.value) filters.search = searchActive.value
    if (filterModel.value) filters.session_model = filterModel.value
    if (filterActive.value) filters.active = filterActive.value === 'true'
    if (filterRotation.value) filters.for_rotation = filterRotation.value === 'true'

    const response = await SessionTemplateService.list(filters)
    if (!response?.success) {
      throw new Error(response?.error?.message ?? 'Impossible de charger les modèles d’horaires.')
    }

    const normalized = normalizeListData(response)
    items.value = normalized.items
    pagination.value = {...pagination.value, ...normalized.pagination}
    listSummary.value = normalized.summary
  } catch (error: any) {
    items.value = []
    loadError.value = error?.message ?? 'Impossible de charger les modèles d’horaires.'
  } finally {
    loading.value = false
  }
}

async function loadSessionModels() {
  try {
    const response = await SessionModelService.list({active: true, limit: 100})
    if (response?.success) sessionModels.value = response.data?.session_models?.items ?? []
  } catch (error) {
    console.error('Unable to load session models', error)
  }
}

function applySearch() {
  searchActive.value = searchInput.value.trim()
  pagination.value.offset = 0
  load()
}

function clearSearch() {
  searchInput.value = ''
  searchActive.value = ''
  pagination.value.offset = 0
  load()
}

function resetFilters() {
  searchInput.value = ''
  searchActive.value = ''
  filterModel.value = ''
  filterActive.value = ''
  filterRotation.value = ''
  pagination.value.offset = 0
  load()
}

function resetAndLoad() {
  pagination.value.offset = 0
  load()
}

function changePerPage(value: number) {
  pagination.value.limit = value
  pagination.value.offset = 0
  load()
}

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  pagination.value.offset = (page - 1) * pagination.value.limit
  load()
}

function prevPage() {
  goToPage(currentPage.value - 1)
}

function nextPage() {
  goToPage(currentPage.value + 1)
}

function openCreate() {
  formMode.value = 'create'
  formTarget.value = null
  showForm.value = true
  openMenuGuid.value = null
}

function openEdit(item: ISessionTemplate) {
  formMode.value = 'edit'
  formTarget.value = item
  showForm.value = true
  detailTarget.value = null
  openMenuGuid.value = null
}

function openDuplicate(item: ISessionTemplate) {
  formMode.value = 'duplicate'
  formTarget.value = item
  showForm.value = true
  detailTarget.value = null
  openMenuGuid.value = null
}

function closeForm() {
  showForm.value = false
  formTarget.value = null
}

function confirmDelete(item: ISessionTemplate) {
  deleteTarget.value = item
  openMenuGuid.value = null
}

function openDetail(item: ISessionTemplate) {
  detailTarget.value = item
  openMenuGuid.value = null
}

function editDetailTarget() {
  if (detailTarget.value) openEdit(detailTarget.value)
}

function openUsage(item: ISessionTemplate) {
  usageTarget.value = item
  openMenuGuid.value = null
}

function toggleMenu(guid: string) {
  openMenuGuid.value = openMenuGuid.value === guid ? null : guid
}

async function toggleCurrent(item: ISessionTemplate) {
  openMenuGuid.value = null
  const next = !isCurrent(item)

  try {
    const response = await SessionTemplateService.update(item.guid, {current: next})
    if (!response?.success) throw new Error(response?.error?.message ?? 'La mise à jour du statut a échoué.')
    await load()
  } catch (error: any) {
    loadError.value = error?.message ?? 'La mise à jour du statut a échoué.'
  }
}

async function doDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true

  try {
    const response = await SessionTemplateService.delete(deleteTarget.value.guid)
    if (!response?.success) throw new Error(response?.error?.message ?? 'La suppression a échoué.')
    deleteTarget.value = null
    await load()
  } catch (error: any) {
    loadError.value = error?.message ?? 'La suppression a échoué.'
  } finally {
    deleteLoading.value = false
  }
}

function onSaved() {
  closeForm()
  load()
}

function closeMenus() {
  openMenuGuid.value = null
}

onMounted(() => {
  document.addEventListener('click', closeMenus)
  loadSessionModels()
  load()
})

onBeforeUnmount(() => document.removeEventListener('click', closeMenus))
</script>

<style scoped>
.input-base {
  @apply rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400
  transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100;
}

.metric-card {
  @apply flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm;
}

.metric-icon {
  @apply flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl;
}

.metric-label {
  @apply text-xs font-semibold uppercase tracking-wide text-slate-400;
}

.metric-value {
  @apply mt-0.5 text-xl font-bold text-slate-800;
}

.metric-hint {
  @apply text-xs text-slate-400;
}

.badge {
  @apply inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold;
}

.menu-item {
  @apply flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-600 transition hover:bg-slate-50 hover:text-slate-800;
}

.mobile-action {
  @apply flex items-center justify-center gap-1 rounded-lg bg-slate-50 px-2 py-2 text-xs font-semibold;
}

.usage-stat {
  @apply flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50 p-3 text-center;
}

.usage-stat strong {
  @apply mt-1 text-lg font-bold text-slate-800;
}

.usage-stat span {
  @apply text-xs text-slate-400;
}

.pg-btn {
  @apply flex h-7 min-w-[28px] items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-semibold
  text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30;
}
</style>
