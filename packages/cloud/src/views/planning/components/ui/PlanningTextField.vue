<template>
  <PlanningFormField :label="label" :description="description" :help="help" :error="error" :for-id="fieldId" :required="required" :optional="optional">
    <div class="relative">
      <input
        :id="fieldId"
        :value="modelValue"
        :type="type"
        :disabled="disabled"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        class="planning-control"
        :class="[prefixIcon ? 'pl-10' : '', error ? 'planning-control-error' : '']"
        @input="handleInput"
        @blur="$emit('blur')"
      />
      <component v-if="prefixIcon" :is="prefixIcon" :size="17" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
    </div>
  </PlanningFormField>
</template>
<script setup lang="ts">
import {computed, type Component} from 'vue'
import PlanningFormField from './PlanningFormField.vue'
const props = withDefaults(defineProps<{modelValue: string; label?: string; description?: string; help?: string; error?: string; placeholder?: string; type?: 'text' | 'search' | 'email' | 'date' | 'time'; required?: boolean; optional?: boolean; disabled?: boolean; autocomplete?: string; id?: string; prefixIcon?: Component | null}>(), {label: '', description: '', help: '', error: '', placeholder: '', type: 'text', required: false, optional: false, disabled: false, autocomplete: 'off', id: '', prefixIcon: null})
const emit = defineEmits<{'update:modelValue': [value: string]; blur: []}>()
const fieldId = computed(() => props.id || `planning-text-${Math.random().toString(36).slice(2, 9)}`)
function handleInput(event: Event): void { emit('update:modelValue', (event.target as HTMLInputElement).value) }
</script>
<style scoped>
.planning-control { width: 100%; min-height: 2.75rem; border-radius: .75rem; border: 1px solid #cbd5e1; background: #fff; padding: .65rem .8rem; font-size: .875rem; color: #334155; outline: none; transition: .16s; }
.planning-control:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px #dbeafe; }
.planning-control:disabled { cursor: not-allowed; background: #f1f5f9; color: #94a3b8; }
.planning-control-error { border-color: #f87171; }
</style>
