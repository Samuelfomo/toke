<template>
  <PlanningSwitch
      :model-value="modelValue"
      :disabled="disabled"
      :aria-label="ariaLabel"
      @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import {PlanningSwitch} from "@/views/planning/components/ui";

withDefaults(defineProps<{
  modelValue: boolean
  disabled?: boolean
  ariaLabel?: string
}>(), {
  disabled: false,
  ariaLabel: 'Modifier l’état',
})

defineEmits<{'update:modelValue': [value: boolean]}>()
</script>
