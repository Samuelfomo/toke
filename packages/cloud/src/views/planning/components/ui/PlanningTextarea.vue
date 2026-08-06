<template>
  <PlanningFormField :label="label" :description="description" :help="help" :error="error" :for-id="fieldId"
                     :required="required" :optional="optional">
    <textarea :id="fieldId" :value="modelValue" :rows="rows" :disabled="disabled" :placeholder="placeholder"
              class="planning-control" :class="error ? 'planning-control-error' : ''" @input="handleInput"
              @blur="$emit('blur')"/>
  </PlanningFormField>
</template>
<script setup lang="ts">
import {computed} from 'vue'
import PlanningFormField from './PlanningFormField.vue'

const props = withDefaults(defineProps<{
  modelValue: string;
  label?: string;
  description?: string;
  help?: string;
  error?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  id?: string
}>(), {
  label: '',
  description: '',
  help: '',
  error: '',
  placeholder: '',
  rows: 4,
  required: false,
  optional: false,
  disabled: false,
  id: ''
})
const emit = defineEmits<{ 'update:modelValue': [value: string]; blur: [] }>()
const fieldId = computed(() => props.id || `planning-textarea-${Math.random().toString(36).slice(2, 9)}`)

function handleInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}
</script>
<style scoped>
.planning-control {
  width: 100%;
  border-radius: .75rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  padding: .7rem .8rem;
  font-size: .875rem;
  color: #334155;
  outline: none;
  transition: .16s;
  resize: vertical;
}

.planning-control:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px #dbeafe;
}

.planning-control-error {
  border-color: #f87171;
}
</style>
