<template>
  <div :role="tone === 'danger' ? 'alert' : 'status'" class="rounded-2xl border p-4" :class="toneClass">
    <div class="flex items-start gap-3">
      <component :is="icon" :size="20" class="mt-0.5 shrink-0" aria-hidden="true"/>
      <div class="min-w-0">
        <p v-if="title" class="text-sm font-bold">{{ title }}</p>
        <p class="text-sm leading-6" :class="title ? 'mt-1' : ''">{{ description }}</p>
        <slot/>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconX} from '@tabler/icons-vue'

const props = withDefaults(defineProps<{
  tone?: 'info' | 'success' | 'warning' | 'danger'
  title?: string
  description: string
}>(), {
  tone: 'info',
  title: '',
})

const config = {
  info: {class: 'border-blue-100 bg-blue-50 text-blue-900', icon: IconInfoCircle},
  success: {class: 'border-emerald-100 bg-emerald-50 text-emerald-900', icon: IconCircleCheck},
  warning: {class: 'border-amber-100 bg-amber-50 text-amber-900', icon: IconAlertTriangle},
  danger: {class: 'border-red-100 bg-red-50 text-red-900', icon: IconX},
}

const toneClass = computed(() => config[props.tone].class)
const icon = computed(() => config[props.tone].icon)
</script>
