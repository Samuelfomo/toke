<template>
  <div :class="containerClass">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <label v-if="label" :for="forId" class="text-sm font-semibold text-slate-700">
          {{ label }}
          <span v-if="required" class="text-red-600" aria-hidden="true">*</span>
          <span v-if="required" class="sr-only">Champ obligatoire</span>
        </label>
        <p v-if="description" class="mt-1 text-xs leading-5 text-slate-600">
          {{ description }}
        </p>
      </div>
      <span
          v-if="optional"
          class="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
      >
        Facultatif
      </span>
    </div>

    <div :class="label || description ? 'mt-2' : ''">
      <slot/>
    </div>

    <p v-if="error" class="mt-1.5 text-xs font-medium leading-5 text-red-600" role="alert">
      {{ error }}
    </p>
    <p v-else-if="help" class="mt-1.5 text-xs leading-5 text-slate-600">
      {{ help }}
    </p>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  description?: string
  help?: string
  error?: string
  forId?: string
  required?: boolean
  optional?: boolean
  containerClass?: string
}>(), {
  label: '',
  description: '',
  help: '',
  error: '',
  forId: '',
  required: false,
  optional: false,
  containerClass: '',
})
</script>
