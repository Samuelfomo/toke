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
import {computed} from 'vue'
import {employeeAvatarStyle} from '@/utils/employeeColor'

const props = withDefaults(defineProps<{
  code: string
  color?: string | null
  title?: string
}>(), {
  color: null,
  title: '',
})

const avatarStyle = computed(() => employeeAvatarStyle(props.color))
</script>
