<template>
  <div class="flex min-h-screen flex-col bg-gradient-to-r from-[#d0e8f7] via-[#f0e4f5] to-[#d0e8f7]">
<!--  <div class="flex min-h-screen flex-col bg-slate-50">-->
    <Header />

    <main class="flex-1">
      <div class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Mon espace</p>
            <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Paramètres</h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Consultez les informations liées à votre compte, à votre organisation et à votre accès à Toké.
            </p>
          </div>

          <button
            type="button"
            class="inline-flex shrink-0 items-center justify-center gap-2 rounded-full md:rounded-l-full md:rounded-r-none border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            @click="goBack"
          >
            <IconArrowLeft :size="17" />
            Retour
          </button>
        </div>

        <div class="grid min-w-0 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside class="min-w-0">
            <nav
              class="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm lg:sticky lg:top-4 lg:flex-col lg:overflow-visible"
              aria-label="Sections des paramètres"
            >
              <button
                v-for="tab in tabs"
                :key="tab.id"
                type="button"
                class="group flex min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:min-w-0"
                :class="activeTab === tab.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
                :aria-current="activeTab === tab.id ? 'page' : undefined"
                @click="activeTab = tab.id"
              >
                <span
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition"
                  :class="activeTab === tab.id
                    ? 'border-indigo-200 bg-white text-indigo-600'
                    : 'border-slate-200 bg-white text-slate-500 group-hover:text-slate-700'"
                >
                  <component :is="tab.icon" :size="17" />
                </span>
                <span>{{ tab.label }}</span>
              </button>
            </nav>
          </aside>

          <div class="min-w-0 space-y-5">
            <template v-if="activeTab === 'account'">
              <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-100 px-5 py-5 sm:px-6">
                  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex min-w-0 items-center gap-4">
                      <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-lg font-bold text-slate-700">
                        <img
                          v-if="userStore.user?.avatar_url"
                          :src="userStore.user.avatar_url"
                          :alt="`Photo de ${userStore.fullName}`"
                          class="h-full w-full object-cover"
                        />
                        <span v-else>{{ userStore.userInitials }}</span>
                      </div>

                      <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2">
                          <h2 class="truncate text-lg font-bold text-slate-950">
                            {{ userStore.fullName || 'Utilisateur Toké' }}
                          </h2>
                          <span
                            class="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold"
                            :class="userStore.user?.active
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-rose-200 bg-rose-50 text-rose-700'"
                          >
                            {{ userStore.user?.active ? 'Compte actif' : 'Compte inactif' }}
                          </span>
                        </div>
                        <p class="mt-1 truncate text-sm text-slate-500">
                          {{ userStore.user?.email || 'Email non renseigné' }}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                      @click="openProfile"
                    >
                      <IconUserEdit :size="17" />
                      Ouvrir mon profil
                    </button>
                  </div>
                </div>

                <div class="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-4">
                  <div class="bg-white px-5 py-4">
                    <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Poste</p>
                    <p class="mt-1.5 text-sm font-semibold text-slate-800">{{ userStore.jobTitle || 'Non renseigné' }}</p>
                  </div>
                  <div class="bg-white px-5 py-4">
                    <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Département</p>
                    <p class="mt-1.5 text-sm font-semibold text-slate-800">{{ userStore.department || 'Non renseigné' }}</p>
                  </div>
                  <div class="bg-white px-5 py-4">
                    <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Matricule</p>
                    <p class="mt-1.5 text-sm font-semibold text-slate-800">{{ userStore.employeeCode || 'Non renseigné' }}</p>
                  </div>
                  <div class="bg-white px-5 py-4">
                    <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Dernière connexion</p>
                    <p class="mt-1.5 text-sm font-semibold text-slate-800">{{ formattedLastLogin }}</p>
                  </div>
                </div>
              </section>

              <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div class="flex items-start gap-3">
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <IconBuildingCommunity :size="20" />
                  </span>
                  <div class="min-w-0">
                    <h2 class="text-base font-bold text-slate-950">Données professionnelles</h2>
                    <p class="mt-1 text-sm leading-6 text-slate-600">
                      Le poste, le département, le matricule et la date d'embauche font partie de votre rattachement professionnel. Ils ne sont pas modifiables depuis votre profil personnel.
                    </p>
                  </div>
                </div>

                <div class="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3.5">
                  <IconLock :size="18" class="mt-0.5 shrink-0 text-amber-700" />
                  <p class="text-sm leading-6 text-amber-900">
                    Ces informations sont gérées par le service RH afin de préserver la cohérence de la structure de l'organisation.
                  </p>
                </div>
              </section>
            </template>

            <template v-else-if="activeTab === 'organization'">
              <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-100 px-5 py-5 sm:px-6">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p class="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Organisation</p>
                      <h2 class="mt-1 text-xl font-bold text-slate-950">{{ tenantName }}</h2>
                      <p class="mt-1 text-sm text-slate-500">Informations générales de votre organisation Toké.</p>
                    </div>
                    <span
                      class="inline-flex self-start items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold"
                      :class="tenantIsActive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-rose-200 bg-rose-50 text-rose-700'"
                    >
                      <span
                        class="h-2 w-2 rounded-full"
                        :class="tenantIsActive ? 'bg-emerald-500' : 'bg-rose-500'"
                      />
                      {{ tenantIsActive ? 'Organisation active' : 'Organisation inactive' }}
                    </span>
                  </div>
                </div>

                <dl class="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
                  <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <dt class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Nom court</dt>
                    <dd class="mt-1.5 text-sm font-semibold text-slate-800">{{ tenant?.short_name || 'Non renseigné' }}</dd>
                  </div>
                  <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <dt class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Pays</dt>
                    <dd class="mt-1.5 text-sm font-semibold text-slate-800">{{ tenant?.country || 'Non renseigné' }}</dd>
                  </div>
                  <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <dt class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Devise</dt>
                    <dd class="mt-1.5 text-sm font-semibold text-slate-800">{{ tenant?.currency || 'Non renseignée' }}</dd>
                  </div>
                  <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <dt class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Langue</dt>
                    <dd class="mt-1.5 text-sm font-semibold text-slate-800">{{ tenant?.language || 'Non renseignée' }}</dd>
                  </div>
                  <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <dt class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Fuseau horaire</dt>
                    <dd class="mt-1.5 break-words text-sm font-semibold text-slate-800">{{ tenant?.timezone || 'Non renseigné' }}</dd>
                  </div>
                  <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <dt class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Sous-domaine</dt>
                    <dd class="mt-1.5 break-words text-sm font-semibold text-slate-800">{{ tenant?.subdomain || 'Non renseigné' }}</dd>
                  </div>
                </dl>

                <div class="border-t border-slate-100 px-5 py-5 sm:px-6">
                  <div class="grid gap-4 sm:grid-cols-2">
                    <div class="flex items-start gap-3">
                      <IconMail :size="18" class="mt-0.5 shrink-0 text-slate-400" />
                      <div class="min-w-0">
                        <p class="text-xs font-bold uppercase tracking-wide text-slate-400">Contact</p>
                        <p class="mt-1 break-words text-sm font-semibold text-slate-800">{{ tenant?.email || 'Email non renseigné' }}</p>
                        <p class="mt-1 text-sm text-slate-500">{{ tenant?.phone || 'Téléphone non renseigné' }}</p>
                      </div>
                    </div>

                    <div class="flex items-start gap-3">
                      <IconMapPin :size="18" class="mt-0.5 shrink-0 text-slate-400" />
                      <div class="min-w-0">
                        <p class="text-xs font-bold uppercase tracking-wide text-slate-400">Adresse</p>
                        <p class="mt-1 text-sm font-semibold leading-6 text-slate-800">{{ tenantAddress }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div class="flex min-w-0 items-start gap-3">
                    <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <IconHierarchy3 :size="20" />
                    </span>
                    <div>
                      <div class="flex flex-wrap items-center gap-2">
                        <h2 class="text-base font-bold text-slate-950">Structure de l'organisation</h2>
                        <span
                          v-if="isHumanResources"
                          class="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700"
                        >
                          Accès RH détecté
                        </span>
                      </div>
                      <p class="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                        {{ isHumanResources
                          ? 'Votre rôle RH vous autorise à administrer la structure dans les écrans RH prévus à cet effet. Cette page reste volontairement en lecture seule.'
                          : 'La modification de la structure est réservée au service RH. Cette page permet uniquement de consulter les informations de votre organisation.' }}
                      </p>
                    </div>
                  </div>

                  <span class="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                    <IconLock :size="15" />
                    Lecture seule
                  </span>
                </div>
              </section>
            </template>

            <template v-else-if="activeTab === 'access'">
              <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-100 px-5 py-5 sm:px-6">
                  <p class="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Accès Toké</p>
                  <h2 class="mt-1 text-xl font-bold text-slate-950">Ma licence</h2>
                  <p class="mt-1 text-sm leading-6 text-slate-500">
                    Consultez les informations de licence associées à votre compte. Les montants et la facturation globale de l'organisation ne sont pas affichés dans cette vue personnelle.
                  </p>
                </div>

                <div class="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
                  <div class="rounded-xl border border-slate-200 p-4">
                    <div class="flex items-center justify-between gap-3">
                      <div>
                        <p class="text-xs font-bold uppercase tracking-wide text-slate-400">Votre compte</p>
                        <p class="mt-1 text-base font-bold text-slate-900">{{ userStore.user?.active ? 'Actif' : 'Inactif' }}</p>
                      </div>
                      <span
                        class="flex h-10 w-10 items-center justify-center rounded-full"
                        :class="userStore.user?.active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'"
                      >
                        <IconCircleCheck v-if="userStore.user?.active" :size="20" />
                        <IconCircleX v-else :size="20" />
                      </span>
                    </div>
                  </div>

                  <div class="rounded-xl border border-slate-200 p-4">
                    <div class="flex items-center justify-between gap-3">
                      <div>
                        <p class="text-xs font-bold uppercase tracking-wide text-slate-400">Organisation</p>
                        <p class="mt-1 text-base font-bold text-slate-900">{{ tenantIsActive ? 'Active' : 'Inactive' }}</p>
                      </div>
                      <span
                        class="flex h-10 w-10 items-center justify-center rounded-full"
                        :class="tenantIsActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'"
                      >
                        <IconCircleCheck v-if="tenantIsActive" :size="20" />
                        <IconCircleX v-else :size="20" />
                      </span>
                    </div>
                  </div>
                </div>

                <div class="border-t border-slate-100 px-5 py-5 sm:px-6">
                  <div class="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p class="text-sm font-bold text-slate-950">Licence individuelle</p>
                      <p class="mt-1 text-sm leading-6 text-slate-500">
                        État contractuel de la licence liée à votre identifiant collaborateur.
                      </p>
                    </div>
                    <span class="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                      Personnel
                    </span>
                  </div>

                  <div v-if="licenseStore.myLicenseLoading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite">
                    <div v-for="index in 4" :key="`my-license-${index}`" class="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
                  </div>

                  <div v-else-if="licenseStore.myLicenseError" class="flex flex-col gap-4 rounded-xl border border-rose-200 bg-rose-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex min-w-0 items-start gap-3">
                      <IconInfoCircle :size="19" class="mt-0.5 shrink-0 text-rose-700" />
                      <div>
                        <p class="text-sm font-bold text-rose-950">Licence individuelle indisponible</p>
                        <p class="mt-1 text-sm leading-6 text-rose-800">{{ licenseStore.myLicenseError }}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="inline-flex shrink-0 items-center justify-center rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50"
                      @click="loadMyLicense(true)"
                    >
                      Réessayer
                    </button>
                  </div>

                  <div v-else-if="myLicense" class="space-y-4">
                    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">État contractuel</p>
                        <p class="mt-1.5 text-sm font-bold text-slate-900">{{ personalContractStatus }}</p>
                        <p class="mt-1 text-xs text-slate-500">Code : {{ myLicense.employee_code || 'Non disponible' }}</p>
                      </div>

                      <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">État de facturation</p>
                        <p class="mt-1.5 text-sm font-bold text-slate-900">{{ personalBillingStatus }}</p>
                        <p class="mt-1 text-xs text-slate-500">Information individuelle retournée par le serveur.</p>
                      </div>

                      <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Activation</p>
                        <p class="mt-1.5 text-sm font-bold text-slate-900">{{ formatDate(myLicense.activation_date) }}</p>
                        <p class="mt-1 text-xs text-slate-500">Désactivation : {{ formatDate(myLicense.deactivation_date) }}</p>
                      </div>

                      <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Dernière activité</p>
                        <p class="mt-1.5 text-sm font-bold text-slate-900">{{ formatDate(myLicense.last_activity_date) }}</p>
                        <p class="mt-1 text-xs text-slate-500">Cette date ne remplace pas la décision d'accès du serveur.</p>
                      </div>
                    </div>

                    <div class="grid gap-4 lg:grid-cols-2">
                      <div class="rounded-xl border border-slate-200 p-4">
                        <div class="flex items-start gap-3">
                          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <IconClock :size="18" />
                          </span>
                          <div>
                            <p class="text-sm font-bold text-slate-950">Licence globale associée</p>
                            <p class="mt-1 text-sm leading-6 text-slate-600">
                              {{ personalGlobalLicenseLabel }}
                            </p>
                            <p class="mt-1 text-xs text-slate-500">
                              Période : {{ formatDate(personalGlobalLicense?.current_period_start) }} — {{ formatDate(personalGlobalLicense?.current_period_end) }}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div class="rounded-xl border border-slate-200 p-4">
                        <div class="flex items-start gap-3">
                          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                            <IconShieldCheck :size="18" />
                          </span>
                          <div>
                            <p class="text-sm font-bold text-slate-950">Période de grâce individuelle</p>
                            <p class="mt-1 text-sm leading-6 text-slate-600">
                              Du {{ formatDate(myLicense.grace_period_start) }} au {{ formatDate(myLicense.grace_period_end) }}.
                            </p>
                            <p class="mt-1 text-xs text-slate-500">
                              L'absence de période de grâce ne signifie pas automatiquement que l'accès est refusé.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                      <IconInfoCircle :size="19" class="mt-0.5 shrink-0 text-amber-700" />
                      <div>
                        <p class="text-sm font-bold text-amber-950">Décision d'accès</p>
                        <p class="mt-1 text-sm leading-6 text-amber-900">
                          L'endpoint individuel actuel ne retourne pas encore une décision canonique <code>access.allowed</code>. Le frontend n'en déduit donc pas une à partir des statuts contractuels ou de facturation.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div v-else class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                    <IconInfoCircle :size="19" class="mt-0.5 shrink-0 text-amber-700" />
                    <div>
                      <p class="text-sm font-bold text-amber-950">Aucune licence individuelle retournée</p>
                      <p class="mt-1 text-sm leading-6 text-amber-900">
                        Le frontend ne déduit aucun droit d'accès en l'absence de données serveur.
                      </p>
                    </div>
                  </div>
                </div>

                <div v-if="canViewOrganizationLicense" class="border-t border-slate-100 px-5 py-5 sm:px-6">
                  <div class="mb-4">
                    <p class="text-sm font-bold text-slate-950">Licence de l'organisation</p>
                    <p class="mt-1 text-sm leading-6 text-slate-500">
                      Vue complémentaire réservée aux rôles autorisés à consulter l'état global du tenant.
                    </p>
                  </div>

                  <div v-if="licenseStore.loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite">
                    <div v-for="index in 4" :key="`tenant-license-${index}`" class="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
                  </div>

                  <div v-else-if="licenseStore.error" class="flex flex-col gap-4 rounded-xl border border-rose-200 bg-rose-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex min-w-0 items-start gap-3">
                      <IconInfoCircle :size="19" class="mt-0.5 shrink-0 text-rose-700" />
                      <div>
                        <p class="text-sm font-bold text-rose-950">État de licence indisponible</p>
                        <p class="mt-1 text-sm leading-6 text-rose-800">
                          {{ licenseStore.error }} Aucun montant n'est supposé tant que l'API n'a pas répondu.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="inline-flex shrink-0 items-center justify-center rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50"
                      @click="loadLicenseStatus(true)"
                    >
                      Réessayer
                    </button>
                  </div>

                  <div v-else-if="primaryLicense" class="space-y-4">
                    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Licence</p>
                        <p class="mt-1.5 text-sm font-bold text-slate-900">{{ primaryLicense.license_type || 'Toké' }}</p>
                        <p class="mt-1 text-xs text-slate-500">{{ primaryLicense.license_status }}</p>
                      </div>

                      <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Accès</p>
                        <p class="mt-1.5 text-sm font-bold" :class="primaryLicense.access?.allowed ? 'text-emerald-700' : 'text-rose-700'">
                          {{ accessLabel }}
                        </p>
                        <p class="mt-1 text-xs text-slate-500">{{ primaryLicense.access?.basis || 'Motif non disponible' }}</p>
                      </div>

                      <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Facturation</p>
                        <p class="mt-1.5 text-sm font-bold text-slate-900">{{ billingModeLabel }}</p>
                        <p class="mt-1 text-xs text-slate-500">Le serveur reste l'autorité du mode appliqué.</p>
                      </div>

                      <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Fin de période</p>
                        <p class="mt-1.5 text-sm font-bold text-slate-900">{{ formatDate(primaryLicense.current_period_end) }}</p>
                        <p class="mt-1 text-xs text-slate-500">Accès jusqu'au {{ formatDate(primaryLicense.access?.access_until) }}</p>
                      </div>
                    </div>
                  </div>

                  <div v-else class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                    <IconInfoCircle :size="19" class="mt-0.5 shrink-0 text-amber-700" />
                    <div>
                      <p class="text-sm font-bold text-amber-950">Aucune licence globale exploitable retournée</p>
                      <p class="mt-1 text-sm leading-6 text-amber-900">
                        L'interface ne déduit ni dette ni droit d'accès en l'absence de données serveur.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <LicensePaymentsOverview
                v-if="canViewOrganizationLicense && primaryLicense"
                :payments="primaryLicense.payments"
                :billing-mode="primaryLicense.billing_mode"
              />

              <LicenseRenewalPanel
                v-if="canViewOrganizationLicense && primaryLicense?.license_guid && primaryLicense.billing_mode === 'PREPAID'"
                :preview="licenseStore.renewalPreview"
                :payment-methods="licenseStore.paymentMethods"
                :tenant-currency="tenant?.currency"
                :preview-loading="licenseStore.renewalPreviewLoading || licenseStore.paymentMethodsLoading"
                :prepare-loading="licenseStore.renewalPrepareLoading"
                :error="licenseStore.renewalError"
                :prepare-error="licenseStore.renewalPrepareError"
                :prepared="Boolean(licenseStore.renewalPrepareResult)"
                @refresh="loadRenewal(true)"
                @prepare="prepareRenewal"
              />

              <OrganizationEmployeeLicenses
                v-if="canViewOrganizationLicense && primaryLicense?.license_guid"
                :licenses="licenseStore.organizationLicenses"
                :count="licenseStore.organizationLicenseCount"
                :loading="licenseStore.organizationLicensesLoading"
                :error="licenseStore.organizationLicensesError"
                @refresh="loadOrganizationLicenses(true)"
              />
            </template>

            <template v-else>
              <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-100 px-5 py-5 sm:px-6">
                  <p class="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Sécurité</p>
                  <h2 class="mt-1 text-xl font-bold text-slate-950">Session et identité</h2>
                  <p class="mt-1 text-sm leading-6 text-slate-500">
                    Consultez l'état de votre session et quittez proprement Toké lorsque vous avez terminé.
                  </p>
                </div>

                <div class="space-y-4 p-5 sm:p-6">
                  <div class="grid gap-4 sm:grid-cols-2">
                    <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <div class="flex items-start gap-3">
                        <IconShieldCheck :size="20" class="mt-0.5 shrink-0 text-emerald-600" />
                        <div>
                          <p class="text-sm font-bold text-slate-900">Session connectée</p>
                          <p class="mt-1 text-sm leading-6 text-slate-500">
                            {{ userStore.user?.email || 'Utilisateur authentifié' }}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <div class="flex items-start gap-3">
                        <IconKey :size="20" class="mt-0.5 shrink-0 text-indigo-600" />
                        <div>
                          <p class="text-sm font-bold text-slate-900">Rôles associés</p>
                          <p class="mt-1 text-sm leading-6 text-slate-500">{{ roleLabels }}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col gap-4 rounded-xl border border-rose-200 bg-rose-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="min-w-0">
                      <p class="text-sm font-bold text-rose-950">Se déconnecter de cet appareil</p>
                      <p class="mt-1 text-sm leading-6 text-rose-800">
                        Votre session locale sera fermée et vous devrez vous authentifier à nouveau pour revenir dans Toké.
                      </p>
                    </div>
                    <button
                      type="button"
                      class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                      @click="logout"
                    >
                      <IconLogout :size="17" />
                      Se déconnecter
                    </button>
                  </div>
                </div>
              </section>
            </template>
          </div>
        </div>
      </div>
    </main>

    <Footer />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IconArrowLeft,
  IconBuildingCommunity,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconCreditCard,
  IconHierarchy3,
  IconInfoCircle,
  IconReceipt,
  IconKey,
  IconLock,
  IconLogout,
  IconMail,
  IconMapPin,
  IconSettings,
  IconShieldCheck,
  IconUserCircle,
  IconUserEdit,
} from '@tabler/icons-vue'

import Header from '@/views/components/header.vue'
import Footer from '@/views/components/footer.vue'
import OrganizationEmployeeLicenses from '@/views/components/license/OrganizationEmployeeLicenses.vue'
import LicensePaymentsOverview from '@/views/components/license/LicensePaymentsOverview.vue'
import LicenseRenewalPanel from '@/views/components/license/LicenseRenewalPanel.vue'
import HeadBuilder from '@/utils/HeadBuilder'
import { useUserStore } from '@/stores/userStore'
import { useLicenseStore } from '@/stores/licenseStore'

const router = useRouter()
const userStore = useUserStore()
const licenseStore = useLicenseStore()

const activeTab = ref<'account' | 'organization' | 'access' | 'security'>('account')

const tabs = [
  { id: 'account' as const, label: 'Mon compte', icon: IconUserCircle },
  { id: 'organization' as const, label: 'Organisation', icon: IconBuildingCommunity },
  { id: 'access' as const, label: 'Accès Toké', icon: IconCreditCard },
  { id: 'security' as const, label: 'Sécurité', icon: IconSettings },
]

const tenant = computed(() => userStore.tenant)
const tenantName = computed(() => userStore.tenantName || 'Organisation')
const tenantIsActive = computed(() => userStore.tenant?.status !== false)

const tenantAddress = computed(() => {
  const address = userStore.tenant?.address
  if (!address) return 'Adresse non renseignée'

  return [address.place_name, address.location, address.city]
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .join(' · ') || 'Adresse non renseignée'
})

const normalizedRoleCodes = computed(() =>
  (userStore.userRoles ?? [])
    .map((role) => String(role.code || role.name || '').trim().toUpperCase())
    .filter(Boolean),
)

const canViewOrganizationLicense = computed(() => {
  const roleCodes = normalizedRoleCodes.value
  return roleCodes.some((code) =>
    code === 'RH' ||
    code === 'HR' ||
    code.includes('HUMAN_RESOURCES') ||
    code.includes('RESSOURCES_HUMAINES') ||
    code.includes('ADMIN')
  )
})

const primaryLicense = computed(() => licenseStore.primaryLicense)

const myLicense = computed(() => licenseStore.myLicense)

const personalGlobalLicense = computed(() => {
  const value = myLicense.value?.global_license
  return value && typeof value === 'object' ? value : null
})

const personalGlobalLicenseLabel = computed(() => {
  const global = personalGlobalLicense.value
  if (!global) return 'Licence globale non détaillée'
  return [global.license_type, global.license_status].filter(Boolean).join(' · ') || 'Licence globale associée'
})

const personalContractStatus = computed(() => myLicense.value?.contractual_status || 'Non disponible')
const personalBillingStatus = computed(() => myLicense.value?.computed_billing_status || 'Non disponible')


const accessLabel = computed(() => {
  if (!primaryLicense.value?.access) return 'Non disponible'
  return primaryLicense.value.access.allowed ? 'Autorisé' : 'Refusé'
})

const billingModeLabel = computed(() => {
  const mode = primaryLicense.value?.billing_mode
  if (mode === 'PREPAID') return 'Prépayé'
  if (mode === 'POSTPAID') return 'Postpayé'
  return mode || 'Non disponible'
})

function formatDate(value?: string | null): string {
  if (!value) return 'Non disponible'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Non disponible'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date)
}

async function loadLicenseStatus(force = false): Promise<void> {
  const tenantGuid = userStore.tenant?.guid
  if (!tenantGuid || !canViewOrganizationLicense.value) return

  try {
    await licenseStore.loadTenantLicenseStatus(tenantGuid, force)
    await loadOrganizationLicenses(force)
    await loadRenewal(force)
  } catch (error) {
    console.error('❌ Chargement licence impossible:', error)
  }
}

async function loadRenewal(force = false): Promise<void> {
  if (!canViewOrganizationLicense.value) return
  const license = primaryLicense.value
  if (!license?.license_guid || license.billing_mode !== 'PREPAID') return

  try {
    await Promise.all([
      licenseStore.loadRenewalPreview(license.license_guid, force),
      licenseStore.loadPaymentMethods(force),
    ])
  } catch (error) {
    console.error('❌ Chargement renouvellement impossible:', error)
  }
}

async function prepareRenewal(paymentMethodGuid: string): Promise<void> {
  const licenseGuid = primaryLicense.value?.license_guid
  if (!licenseGuid) return

  try {
    await licenseStore.prepareRenewal(licenseGuid, paymentMethodGuid)
    await licenseStore.loadTenantLicenseStatus(userStore.tenant?.guid as string | number, true)
  } catch (error) {
    console.error('❌ Préparation renouvellement impossible:', error)
  }
}

async function loadOrganizationLicenses(force = false): Promise<void> {
  if (!canViewOrganizationLicense.value) return
  const globalLicenseGuid = primaryLicense.value?.license_guid
  if (!globalLicenseGuid) return

  try {
    await licenseStore.loadOrganizationLicenses(globalLicenseGuid, { force, offset: 0, limit: 50 })
  } catch (error) {
    console.error('❌ Chargement licences organisation impossible:', error)
  }
}

async function loadMyLicense(force = false): Promise<void> {
  const employeeGuid = userStore.user?.guid
  if (!employeeGuid) return

  try {
    await licenseStore.loadMyLicense(employeeGuid, force)
  } catch (error) {
    console.error('❌ Chargement licence individuelle impossible:', error)
  }
}

const isHumanResources = computed(() => {
  const acceptedCodes = new Set([
    'RH',
    'HR',
    'HUMAN_RESOURCES',
    'RESSOURCES_HUMAINES',
  ])

  return normalizedRoleCodes.value.some((code) => acceptedCodes.has(code))
})

const roleLabels = computed(() => {
  const labels = (userStore.userRoles ?? [])
    .map((role) => role.name || role.code)
    .filter(Boolean)

  return labels.length ? labels.join(', ') : 'Aucun rôle renseigné'
})

const formattedLastLogin = computed(() => {
  const value = userStore.user?.last_login_at
  if (!value) return 'Non disponible'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Non disponible'

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
})

function goBack(): void {
  router.back()
}

function openProfile(): void {
  void router.push('/profile')
}

async function logout(): Promise<void> {
  userStore.logout()
  await router.push('/')
}

onMounted(() => {
  void loadMyLicense()
  void loadLicenseStatus()

  HeadBuilder.apply({
    title: 'Paramètres - Toké',
    css: [],
    meta: { viewport: 'width=device-width, initial-scale=1.0' },
  })
})
</script>
