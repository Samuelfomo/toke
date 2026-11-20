<template>
  <PlanningFormField :label="label" :description="description" :help="help" :error="error" :for-id="fieldId"
                     :required="required" :optional="optional">
    <div class="relative">
      <input
          :id="fieldId"
          :value="modelValue"
          type="number"
          :min="min"
          :max="max"
          :step="step"
          :disabled="disabled"
          :placeholder="placeholder"
          class="planning-control"
          :class="[suffix ? 'pr-24' : '', error ? 'planning-control-error' : '']"
          @input="handleInput"
          @blur="$emit('blur')"
      />
      <span v-if="suffix"
            class="pointer-events-none absolute right-3 top-1/2 max-w-[84px] -translate-y-1/2 truncate text-xs font-semibold text-slate-500">{{
          suffix
        }}</span>
    </div>
  </PlanningFormField>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import PlanningFormField from './PlanningFormField.vue'

const props = withDefaults(defineProps<{
  modelValue: number | string
  label?: string
  description?: string
  help?: string
  error?: string
  suffix?: string
  placeholder?: string
  min?: number
  max?: number
  step?: number
  required?: boolean
  optional?: boolean
  disabled?: boolean
  id?: string
}>(), {
  label: '',
  description: '',
  help: '',
  error: '',
  suffix: '',
  placeholder: '',
  step: 1,
  required: false,
  optional: false,
  disabled: false,
  id: '',
})
const emit = defineEmits<{ 'update:modelValue': [value: number | string]; blur: [] }>()
const fieldId = computed(() => props.id || `planning-number-${Math.random().toString(36).slice(2, 9)}`)

function handleInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value === '' ? '' : Number(value))
}
</script>

<style scoped>
.planning-control {
  width: 100%;
  min-height: 2.75rem;
  border-radius: .75rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  padding: .65rem .8rem;
  font-size: .875rem;
  color: #334155;
  outline: none;
  transition: .16s;
}

.planning-control:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px #dbeafe;
}

.planning-control:disabled {
  cursor: not-allowed;
  background: #f1f5f9;
  color: #94a3b8;
}

.planning-control-error {
  border-color: #f87171;
}
</style>
