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
            class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            @click="goBack"
          >
            <IconArrowLeft :size="17" />
            Retour
          </button>
        </div>

        <div class="grid min-w-0 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside class="min-w-0">
            <nav
              class="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:sticky lg:top-4 lg:flex-col lg:overflow-visible"
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
                  <h2 class="mt-1 text-xl font-bold text-slate-950">État de votre accès</h2>
                  <p class="mt-1 text-sm leading-6 text-slate-500">
                    Cette vue présente uniquement les informations utiles à votre utilisation de Toké.
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
                  <div class="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50/60 p-4">
                    <IconInfoCircle :size="19" class="mt-0.5 shrink-0 text-sky-700" />
                    <div>
                      <p class="text-sm font-bold text-sky-950">Licence et facturation</p>
                      <p class="mt-1 text-sm leading-6 text-sky-900">
                        Les informations administratives de licence, de facturation et de paiement sont gérées au niveau de l'administration Toké et ne sont pas exposées ici sous forme de ressources techniques.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
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
  IconCreditCard,
  IconHierarchy3,
  IconInfoCircle,
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
import HeadBuilder from '@/utils/HeadBuilder'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

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
  HeadBuilder.apply({
    title: 'Paramètres - Toké',
    css: [],
    meta: { viewport: 'width=device-width, initial-scale=1.0' },
  })
})
</script>
