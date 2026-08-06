<template>
  <PlanningFormField :label="label" :description="description" :help="help" :error="error" :for-id="fieldId" :required="required" :optional="optional">
    <select
      :id="fieldId"
      :value="modelValue ?? ''"
      :disabled="disabled"
      class="planning-control"
      :class="error ? 'planning-control-error' : ''"
      @change="handleChange"
      @blur="$emit('blur')"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option v-for="option in options" :key="String(option.value)" :value="option.value" :disabled="option.disabled">
        {{ option.label }}
      </option>
    </select>
  </PlanningFormField>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import PlanningFormField from './PlanningFormField.vue'

export interface PlanningSelectOption { label: string; value: string | number; disabled?: boolean }
const props = withDefaults(defineProps<{
  modelValue: string | number | null
  options: PlanningSelectOption[]
  label?: string
  description?: string
  help?: string
  error?: string
  placeholder?: string
  required?: boolean
  optional?: boolean
  disabled?: boolean
  id?: string
}>(), {
  label: '', description: '', help: '', error: '', placeholder: 'Sélectionner…', required: false, optional: false, disabled: false, id: '',
})
const emit = defineEmits<{'update:modelValue': [value: string | number | null]; blur: []}>()
const fieldId = computed(() => props.id || `planning-select-${Math.random().toString(36).slice(2, 9)}`)
function handleChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  const option = props.options.find((item) => String(item.value) === value)
  emit('update:modelValue', value === '' ? null : (option?.value ?? value))
}
</script>

<style scoped>
.planning-control { width: 100%; min-height: 2.75rem; border-radius: .75rem; border: 1px solid #cbd5e1; background: #fff; padding: .65rem .8rem; font-size: .875rem; color: #334155; outline: none; transition: .16s; }
.planning-control:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px #dbeafe; }
.planning-control:disabled { cursor: not-allowed; background: #f1f5f9; color: #94a3b8; }
.planning-control-error { border-color: #f87171; }
</style>
