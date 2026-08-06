<template>
  <PlanningNumberField
      :id="id"
      :model-value="modelValue"
      :label="label"
      :help="help"
      :suffix="suffix"
      :min="min"
      :max="max"
      :step="step"
      :optional="optional"
      :required="!optional"
      :disabled="disabled"
      :error="error"
      @update:model-value="$emit('update:modelValue', $event)"
      @blur="$emit('blur')"
  />
</template>

<script setup lang="ts">
import PlanningNumberField from '@/views/planning/components/ui/PlanningNumberField.vue'

withDefaults(defineProps<{
  modelValue: number | string
  label: string
  help?: string
  suffix?: string
  min?: number
  max?: number
  step?: number
  optional?: boolean
  disabled?: boolean
  error?: string
  id?: string
}>(), {
  help: '',
  suffix: '',
  step: 1,
  optional: false,
  disabled: false,
  error: '',
  id: '',
})

defineEmits<{
  'update:modelValue': [value: number | string]
  blur: []
}>()
</script>
