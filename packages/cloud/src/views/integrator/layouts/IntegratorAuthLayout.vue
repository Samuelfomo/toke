<template>
  <main class="flex min-h-screen bg-white text-[#142640]">
    <aside
        class="relative hidden min-h-screen w-[46%] shrink-0 flex-col overflow-hidden bg-[#11243c] px-10 py-10 text-white lg:flex xl:px-16 xl:py-12">
      <div aria-hidden="true"
           class="pointer-events-none absolute -right-40 top-[18%] h-[440px] w-[440px] rounded-full border border-white/[.08]"></div>
      <div aria-hidden="true"
           class="pointer-events-none absolute -right-20 top-[24%] h-[320px] w-[320px] rounded-full border border-white/[.08]"></div>
      <div class="relative flex items-center gap-3">
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2867d0] shadow-lg shadow-black/10"><Squares2X2Icon
            class="h-6 w-6"/></span>
        <span><span class="block text-xl font-extrabold tracking-tight">TOKÉ</span><span
            class="block text-[10px] font-semibold uppercase tracking-[.24em] text-slate-400">Integrator Console</span></span>
      </div>
      <div class="relative my-auto max-w-[470px] py-14">
        <span
            class="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.07] px-4 py-2 text-xs font-medium text-blue-100"><ShieldCheckIcon
            class="h-4 w-4 text-[#9dc1ff]"/> Espace technique sécurisé</span>
        <h1 class="max-w-[440px] text-4xl font-bold leading-[1.17] tracking-tight xl:text-[43px]">Vos
          entreprises.<br/><span class="text-[#9bc0ff]">Un seul point d'accès.</span></h1>
        <p class="mt-6 max-w-[420px] text-base leading-7 text-slate-300">Retrouvez les tenants actifs, choisissez un
          responsable et intervenez depuis une console dédiée.</p>
        <div class="mt-11 grid max-w-[425px] gap-3">
          <div class="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.05] px-4 py-3"><span
              class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10"><BuildingOffice2Icon
              class="h-5 w-5 text-[#A7C5FF]"/></span><span class="text-sm text-slate-200">Accès centralisé aux entreprises</span>
          </div>
          <div class="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.05] px-4 py-3"><span
              class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10"><ArrowsRightLeftIcon
              class="h-5 w-5 text-[#A7C5FF]"/></span><span class="text-sm text-slate-200">Changement de contexte simplifié</span>
          </div>
        </div>
      </div>
      <p class="relative text-xs text-slate-400">Toké · Console réservée aux intégrateurs autorisés</p>
    </aside>
    <section class="flex min-w-0 flex-1 flex-col bg-[#fafcff]">
      <header class="flex items-center justify-between px-6 py-6 sm:px-10 lg:px-14">
        <div class="flex items-center gap-2 lg:hidden"><span
            class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2867d0] text-white"><Squares2X2Icon
            class="h-5 w-5"/></span><span class="text-lg font-extrabold">TOKÉ</span></div>
        <span
            class="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-slate-500">ESPACE INTÉGRATEUR</span>
      </header>
      <div class="flex flex-1 items-center justify-center px-6 pb-16 pt-6 sm:px-10 lg:px-14">
        <div class="w-full max-w-[430px]">
          <slot/>
        </div>
      </div>
      <footer class="px-6 pb-7 text-center text-xs text-slate-400 sm:px-10">Authentification technique · Toké</footer>
    </section>
  </main>
</template>
<script setup lang="ts">
import {Squares2X2Icon, ShieldCheckIcon, BuildingOffice2Icon, ArrowsRightLeftIcon} from '@heroicons/vue/24/outline'
</script>
