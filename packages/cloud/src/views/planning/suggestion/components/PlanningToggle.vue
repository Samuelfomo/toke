<template>
  <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :disabled="disabled"
      class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
      :class="modelValue ? 'bg-indigo-600' : 'bg-slate-200'"
      @click="$emit('update:modelValue', !modelValue)"
  >
        <span
            class="inline-block h-5 w-5 rounded-full bg-white shadow-sm transition"
            :class="modelValue ? 'translate-x-[22px]' : 'translate-x-0.5'"
        />
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ modelValue: boolean; disabled?: boolean }>(), {
  disabled: false,
})

defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>
