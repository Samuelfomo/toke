<template>
  <CommonPlanningDrawer
      :open="open"
      :eyebrow="eyebrow"
      :title="title"
      :description="description"
      :loading="loading"
      :dirty="dirty"
      :width="width"
      :discard-title="discardTitle"
      :discard-description="discardDescription"
      @close="$emit('close')"
  >
    <slot />
    <template v-if="$slots.footer" #footer="{ requestClose }">
      <slot name="footer" :request-close="requestClose" />
    </template>
  </CommonPlanningDrawer>
</template>

<script setup lang="ts">
import CommonPlanningDrawer from '@/views/planning/components/ui/PlanningDrawer.vue'

withDefaults(defineProps<{
  open: boolean
  eyebrow?: string
  title: string
  description?: string
  loading?: boolean
  dirty?: boolean
  width?: 'md' | 'lg' | 'xl' | '2xl' | 'full'
  discardTitle?: string
  discardDescription?: string
}>(), {
  loading: false,
  dirty: false,
  width: '2xl',
  discardTitle: 'Abandonner les modifications ?',
  discardDescription: 'Les informations saisies depuis le dernier enregistrement seront définitivement perdues.',
})

defineEmits<{close: []}>()
</script>
