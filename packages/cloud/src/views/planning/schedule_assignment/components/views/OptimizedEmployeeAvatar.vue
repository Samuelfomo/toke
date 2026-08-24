<template>
  <span
      class="inline-flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border text-[6px] font-extrabold leading-none tracking-[-0.02em] shadow-sm"
      :style="avatarStyle"
      :title="title || code"
      :aria-label="title || code"
  >
    {{ code }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { employeeAvatarStyle } from '@/utils/employeeColor'
import type {
  OptimizedPdfMode,
  OptimizedShiftKind,
} from '@/utils/exports/scheduleAssignment.optimized.export'

const props = withDefaults(defineProps<{
  code: string
  color?: string | null
  title?: string
  mode?: OptimizedPdfMode
  kind?: OptimizedShiftKind | null
  neutral?: boolean
}>(), {
  color: null,
  title: '',
  mode: 'personalized',
  kind: null,
  neutral: false,
})

const SERVICE_STYLES: Record<OptimizedShiftKind, Record<string, string>> = {
  morning: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
    color: '#2563EB',
  },
  mid: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
    color: '#D97706',
  },
  guard: {
    backgroundColor: '#FFE4E6',
    borderColor: '#E11D48',
    color: '#E11D48',
  },
  rest: {
    backgroundColor: '#F1F5F9',
    borderColor: '#64748B',
    color: '#64748B',
  },
  other: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7C3AED',
    color: '#7C3AED',
  },
}

const NEUTRAL_STYLE = {
  backgroundColor: '#FFFFFF',
  borderColor: '#94A3B8',
  color: '#475569',
}

const avatarStyle = computed(() => {
  if (props.neutral) return NEUTRAL_STYLE

  if (props.mode === 'generalized' && props.kind) {
    return SERVICE_STYLES[props.kind]
  }

  return employeeAvatarStyle(props.color)
})
</script>