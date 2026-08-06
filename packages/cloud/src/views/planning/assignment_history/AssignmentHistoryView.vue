<template>
  <div class="min-h-full bg-slate-50/80">
    <div class="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <RouterLink
        :to="{ name: 'planning-menu' }"
        class="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 no-underline transition hover:text-blue-700"
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
          La route est maintenant accessible depuis le menu Planning. Le raccordement de la liste historique aux données d’affectation pourra être réalisé dans un lot métier dédié, sans bloquer la navigation générale.
        </p>

        <div class="mt-7 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-blue-900">
          Cette page remplace l’ancienne route qui annulait systématiquement la navigation avec <code class="rounded bg-white px-1.5 py-0.5 text-xs">next(false)</code>.
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconArrowLeft, IconHistory } from '@tabler/icons-vue'
</script>
