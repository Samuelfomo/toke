<template>
  <div class="flex min-h-screen flex-col bg-gradient-to-r from-[#d0e8f7] via-[#f0e4f5] to-[#d0e8f7]">
<!--  <div class="flex min-h-screen flex-col bg-slate-50">-->
    <Header />

    <main class="flex-1">
      <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div class="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            @click="router.back()"
          >
            <IconArrowLeft :size="17" />
            Retour
          </button>

          <span
            class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold"
            :class="userStore.user?.active
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'"
          >
            <span
              class="h-2 w-2 rounded-full"
              :class="userStore.user?.active ? 'bg-emerald-500' : 'bg-rose-500'"
            />
            {{ userStore.user?.active ? 'Compte actif' : 'Compte inactif' }}
          </span>
        </div>

        <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 p-5 sm:p-6">
            <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div class="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 text-2xl font-bold text-slate-700 shadow-sm">
                <img
                  v-if="userStore.user?.avatar_url"
                  :src="userStore.user.avatar_url"
                  :alt="`Photo de ${userStore.fullName}`"
                  class="h-full w-full object-cover"
                />
                <span v-else>{{ userStore.userInitials }}</span>
              </div>

              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Mon profil</p>
                <h1 class="mt-1 truncate text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {{ userStore.fullName || 'Utilisateur Toké' }}
                </h1>
                <p class="mt-1 text-sm text-slate-500">{{ userStore.jobTitle || 'Poste non renseigné' }}</p>

                <div class="mt-3 flex flex-wrap gap-2">
                  <span
                    v-for="role in userStore.userRoles"
                    :key="role.guid"
                    class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600"
                  >
                    {{ role.name || role.code }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="grid min-w-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <form class="min-w-0 p-5 sm:p-6 lg:border-r lg:border-slate-100" @submit.prevent="savePersonalInfo">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 class="text-lg font-bold text-slate-950">Informations personnelles</h2>
                  <p class="mt-1 text-sm leading-6 text-slate-500">
                    Vous pouvez mettre à jour vos coordonnées personnelles. Les informations RH sont gérées séparément.
                  </p>
                </div>

                <button
                  v-if="!editing"
                  type="button"
                  class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  @click="startEdit"
                >
                  <IconPencil :size="16" />
                  Modifier
                </button>
              </div>

              <div
                v-if="successMessage"
                class="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              >
                <IconCircleCheck :size="18" class="mt-0.5 shrink-0" />
                <span>{{ successMessage }}</span>
              </div>

              <div
                v-if="errorMessage"
                class="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
              >
                <IconAlertCircle :size="18" class="mt-0.5 shrink-0" />
                <span>{{ errorMessage }}</span>
              </div>

              <div class="mt-6 grid gap-5 sm:grid-cols-2">
                <label class="block min-w-0">
                  <span class="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Prénom</span>
                  <input
                    v-model="form.first_name"
                    type="text"
                    autocomplete="given-name"
                    :disabled="!editing || saving"
                    class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-600"
                  />
                </label>

                <label class="block min-w-0">
                  <span class="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Nom</span>
                  <input
                    v-model="form.last_name"
                    type="text"
                    autocomplete="family-name"
                    :disabled="!editing || saving"
                    class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-600"
                  />
                </label>

                <label class="block min-w-0">
                  <span class="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Email</span>
                  <input
                    v-model="form.email"
                    type="email"
                    autocomplete="email"
                    :disabled="!editing || saving"
                    class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-600"
                  />
                </label>

                <label class="block min-w-0">
                  <span class="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Téléphone</span>
                  <input
                    v-model="form.phone_number"
                    type="tel"
                    autocomplete="tel"
                    :disabled="!editing || saving"
                    class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-600"
                  />
                </label>
              </div>

              <div v-if="editing" class="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  :disabled="saving"
                  @click="cancelEdit"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="saving || !hasPersonalChanges"
                >
                  <IconLoader2 v-if="saving" :size="16" class="animate-spin" />
                  <IconDeviceFloppy v-else :size="16" />
                  {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
                </button>
              </div>
            </form>

            <aside class="min-w-0 bg-slate-50/50 p-5 sm:p-6">
              <div class="flex items-start gap-3">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <IconLock :size="19" />
                </span>
                <div>
                  <h2 class="text-base font-bold text-slate-950">Informations RH</h2>
                  <p class="mt-1 text-sm leading-6 text-slate-600">
                    Ces données décrivent votre rattachement dans l'organisation et sont modifiables uniquement par le service RH.
                  </p>
                </div>
              </div>

              <dl class="mt-5 space-y-3">
                <div class="rounded-xl border border-slate-200 bg-white p-4">
                  <dt class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Poste</dt>
                  <dd class="mt-1 text-sm font-semibold text-slate-800">{{ userStore.jobTitle || 'Non renseigné' }}</dd>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white p-4">
                  <dt class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Département</dt>
                  <dd class="mt-1 text-sm font-semibold text-slate-800">{{ userStore.department || 'Non renseigné' }}</dd>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white p-4">
                  <dt class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Matricule</dt>
                  <dd class="mt-1 text-sm font-semibold text-slate-800">{{ userStore.employeeCode || 'Non renseigné' }}</dd>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white p-4">
                  <dt class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Date d'embauche</dt>
                  <dd class="mt-1 text-sm font-semibold text-slate-800">{{ formattedHireDate }}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>
      </div>
    </main>

    <Footer />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCircleCheck,
  IconDeviceFloppy,
  IconLoader2,
  IconLock,
  IconPencil,
} from '@tabler/icons-vue'

import Header from '@/views/components/header.vue'
import Footer from '@/views/components/footer.vue'
import HeadBuilder from '@/utils/HeadBuilder'
import UserService from '@/service/UserService'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

const editing = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const form = reactive({
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
})

const baseline = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
})

const hasPersonalChanges = computed(() =>
  form.first_name.trim() !== baseline.value.first_name ||
  form.last_name.trim() !== baseline.value.last_name ||
  form.email.trim().toLowerCase() !== baseline.value.email ||
  form.phone_number.trim() !== baseline.value.phone_number,
)

const formattedHireDate = computed(() => {
  const value = userStore.user?.hire_date
  if (!value) return 'Non renseignée'

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(date)
})

function snapshotFromStore(): void {
  const user = userStore.user
  const next = {
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    email: user?.email ?? '',
    phone_number: user?.phone_number ?? '',
  }

  Object.assign(form, next)
  baseline.value = {
    first_name: next.first_name.trim(),
    last_name: next.last_name.trim(),
    email: next.email.trim().toLowerCase(),
    phone_number: next.phone_number.trim(),
  }
}

function startEdit(): void {
  errorMessage.value = ''
  successMessage.value = ''
  snapshotFromStore()
  editing.value = true
}

function cancelEdit(): void {
  snapshotFromStore()
  errorMessage.value = ''
  editing.value = false
}

function validate(): string | null {
  if (!form.first_name.trim()) return 'Le prénom est requis.'
  if (!form.last_name.trim()) return 'Le nom est requis.'

  const email = form.email.trim()
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return 'Renseignez une adresse email valide.'

  if (!form.phone_number.trim()) return 'Le numéro de téléphone est requis.'
  return null
}

async function savePersonalInfo(): Promise<void> {
  const userGuid = userStore.user?.guid
  if (!userGuid) {
    errorMessage.value = 'Votre session ne permet pas d’identifier le compte à modifier.'
    return
  }

  const validationError = validate()
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  const payload = {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email.trim().toLowerCase(),
    phone_number: form.phone_number.trim(),
  }

  try {
    const response = await UserService.updateEmployee(userGuid, userGuid, payload)
    if (!response.success) {
      throw new Error('La mise à jour du profil a échoué.')
    }

    userStore.updateUserData(payload)
    snapshotFromStore()
    editing.value = false
    successMessage.value = 'Vos informations personnelles ont été mises à jour.'
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.error?.message ||
      error?.message ||
      'Impossible de mettre à jour votre profil pour le moment.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  snapshotFromStore()
  HeadBuilder.apply({
    title: 'Mon profil - Toké',
    css: [],
    meta: { viewport: 'width=device-width, initial-scale=1.0' },
  })
})
</script>
