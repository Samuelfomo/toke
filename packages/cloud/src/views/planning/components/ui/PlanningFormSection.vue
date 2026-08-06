<template>
  <section
      class="rounded-2xl border border-slate-200 bg-white shadow-sm"
      :class="compact ? 'p-4' : 'p-5 sm:p-6'"
  >
    <header
        v-if="title || description || $slots.actions"
        class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
    >
      <div class="min-w-0">
        <p v-if="eyebrow" class="text-xs font-bold uppercase tracking-wide text-blue-700">
          {{ eyebrow }}
        </p>
        <h3 v-if="title" class="text-base font-bold text-slate-900 sm:text-lg">
          {{ title }}
        </h3>
        <p v-if="description" class="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          {{ description }}
        </p>
      </div>
      <slot name="actions"/>
    </header>
    <slot/>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  description?: string
  eyebrow?: string
  compact?: boolean
}>(), {
  title: '',
  description: '',
  eyebrow: '',
  compact: false,
})
</script>
