<template>
  <div class="mx-3 rounded-2xl bg-white/5 border border-white/8 p-4 backdrop-blur-sm">
    <!-- Header -->
    <div class="flex items-center gap-2 mb-2">
      <span class="w-5 h-5 rounded-full bg-violet-500/30 flex items-center justify-center flex-shrink-0">
        <IconInfoCircle :size="12" class="text-violet-300" />
      </span>
      <span class="text-[12px] font-semibold text-slate-300">Aide rapide</span>
    </div>

    <!-- Dynamic slot content -->
    <p class="text-[11px] text-slate-500 leading-relaxed">
      <slot>
        Aucune aide disponible pour ce module.
      </slot>
    </p>
  </div>
</template>

<script setup lang="ts">
import { IconInfoCircle } from '@tabler/icons-vue'
</script>