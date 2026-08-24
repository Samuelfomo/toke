<template>
  <div class="min-h-full">
    <div class="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 bg-slate-50/60">
      <RouterLink
          :to="{ name: 'planning-menu' }"
          class="mb-5 inline-flex items-center gap-2 bg-slate-50 p-2 text-sm font-semibold text-slate-600 no-underline transition hover:text-blue-700"
      >
        <IconArrowLeft :size="18" />
        Retour aux outils de planification
      </RouterLink>

      <section class="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <IconHistory :size="24" />
        </div>

        <h1 class="mt-5 text-2xl font-bold text-slate-900">
          Historique des affectations
        </h1>

        <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Retrouvez ici l’historique des affectations réalisées dans le planning.
          Vous pourrez consulter les changements effectués et suivre l’évolution
          des affectations au fil du temps.
        </p>

        <div class="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6">
          <div class="flex items-start gap-4">
            <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm"
            >
              <IconHistory :size="20" />
            </div>

            <div>
              <h2 class="font-semibold text-slate-900">
                Aucun historique disponible pour le moment
              </h2>

              <p class="mt-1 text-sm leading-6 text-slate-600">
                Les affectations enregistrées apparaîtront ici dès que leur
                historique sera disponible.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconArrowLeft, IconHistory } from '@tabler/icons-vue'
</script>