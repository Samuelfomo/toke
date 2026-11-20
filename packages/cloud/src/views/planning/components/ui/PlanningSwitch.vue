<template>
  <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :aria-label="ariaLabel"
      :disabled="disabled"
      class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
      :class="modelValue ? 'bg-blue-600' : 'bg-slate-300'"
      @click="$emit('update:modelValue', !modelValue)"
  >
    <span class="inline-block h-5 w-5 rounded-full bg-white shadow-sm transition"
          :class="modelValue ? 'translate-x-6' : 'translate-x-1'"/>
  </button>
</template>
<script setup lang="ts">
withDefaults(defineProps<{ modelValue: boolean; disabled?: boolean; ariaLabel?: string }>(), {
  disabled: false,
  ariaLabel: 'Modifier l’état'
})
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>
