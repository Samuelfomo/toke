<template>
  <button type="button" @click="$emit('select')"
          class="group w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/60">
    <div class="flex items-start justify-between gap-4">
      <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#2563be]">
        <BuildingOffice2Icon class="h-6 w-6"/>
      </div>
      <span class="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">Accessible</span>
    </div>
    <h3 class="mt-5 line-clamp-1 text-base font-bold text-slate-900">{{ tenant.name }}</h3>
    <p class="mt-1 truncate text-xs text-slate-500">{{ tenant.subdomain }}</p>
    <div class="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><span
        class="text-xs font-semibold text-[#2563be]">Voir les responsables</span>
      <ArrowRightIcon class="h-4 w-4 text-[#2563be] transition-transform group-hover:translate-x-1"/>
    </div>
  </button>
</template>
<script setup lang="ts">
import {BuildingOffice2Icon, ArrowRightIcon} from '@heroicons/vue/24/outline';
import type {TenantItem} from '@/service/IntegratorService';

defineProps<{ tenant: TenantItem }>();
defineEmits<{ select: [] }>()
</script>
