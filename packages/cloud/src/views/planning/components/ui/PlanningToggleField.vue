<template>
  <div class="flex items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div>
      <p class="text-sm font-semibold text-slate-800">{{ label }}</p>
      <p v-if="description" class="mt-1 text-xs leading-5 text-slate-500">{{ description }}</p>
      <p v-if="error" class="mt-1 text-xs font-medium text-red-600">{{ error }}</p>
    </div>
    <PlanningSwitch :model-value="modelValue" :disabled="disabled" :aria-label="label"
                    @update:model-value="$emit('update:modelValue', $event)"/>
  </div>
</template>
<script setup lang="ts">
import PlanningSwitch from './PlanningSwitch.vue'

withDefaults(defineProps<{
  modelValue: boolean;
  label: string;
  description?: string;
  error?: string;
  disabled?: boolean
}>(), {description: '', error: '', disabled: false})
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>
