<template>
  <div
      class="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex min-w-0 items-center gap-4">
      <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eaf1ff] text-sm font-bold text-[#285ca7]">
        {{ initials }}
      </div>
      <div class="min-w-0"><p class="font-semibold text-[#192a43]">{{ profile.first_name }} {{ profile.last_name }}</p>
        <p class="mt-1 truncate text-sm text-slate-500">{{ profile.email }}</p></div>
    </div>
    <div class="flex items-center justify-between gap-4 sm:justify-end">
      <div class="flex flex-wrap items-center gap-1.5">
  <span
      v-for="role in profile.roles"
      :key="role"
      class="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"
  >
    {{ role }}
  </span>
      </div>
      <button @click="$emit('open')" :disabled="busy"
              class="rounded-xl bg-[#2261bd] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#184f9e] disabled:opacity-50">
        {{ busy ? 'Ouverture…' : 'Accéder à l’espace' }}
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import {computed} from 'vue';
import type {Responsible} from '@/service/IntegratorService';

const props = defineProps<{ profile: Responsible; busy?: boolean }>();
defineEmits<{ open: [] }>();
const initials = computed(() => `${props.profile.first_name?.charAt(0) || ''}${props.profile.last_name?.charAt(0) || ''}`.toUpperCase())
</script>
