<template>
  <CommonPlanningConfirmDialog
      :open="open"
      :title="title"
      :description="description"
      :important="important"
      :confirm-label="confirmLabel"
      :danger="danger"
      :loading="loading"
      @cancel="$emit('cancel')"
      @confirm="$emit('confirm')"
  />
</template>
<script setup lang="ts">
import CommonPlanningConfirmDialog from '@/views/planning/components/ui/PlanningConfirmDialog.vue'

withDefaults(defineProps<{
  open: boolean;
  title: string;
  description: string;
  important?: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean
}>(), {important: '', danger: false, loading: false})
defineEmits<{ cancel: []; confirm: [] }>()
</script>
