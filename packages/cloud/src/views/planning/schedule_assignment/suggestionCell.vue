<template>
  <div class="relative" ref="cellRef">
    <button
        @click.stop="$emit('open-modal')"
        class="w-full min-w-[80px] px-2 py-1.5 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1 border"
        :class="cellClasses"
        :disabled="loading"
    >
      <IconLoader2 v-if="loading" :size="11" class="animate-spin" />
      <template v-else>
        <span v-if="templateGuid" class="truncate max-w-[64px]">{{ templateName }}</span>
        <span v-else class="text-gray-300 font-normal">Repos</span>
        <IconPencil :size="9" class="opacity-40 flex-shrink-0" />
      </template>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IconLoader2, IconPencil } from '@tabler/icons-vue'
import type { ISuggestionDayReason } from '@/service/ScheduleSuggestionService'

interface AvailableTemplate { guid: string; name: string }

const props = defineProps<{
  templateGuid: string | null
  reason:       ISuggestionDayReason | null
  templates:    AvailableTemplate[]
  loading?:     boolean
}>()

defineEmits<{ (e: 'open-modal'): void }>()

const templateName = computed(() =>
    props.templateGuid
        ? (props.templates.find((t) => t.guid === props.templateGuid)?.name ?? props.reason?.templateName ?? '—')
        : null
)

const cellClasses = computed(() => {
  if (props.loading) return 'bg-gray-50 border-gray-200 text-gray-400 cursor-wait'
  if (!props.templateGuid) return 'bg-white border-gray-200 text-gray-300 hover:border-gray-300 hover:bg-gray-50'
  return 'bg-blue-50 border-blue-200 text-[#004aad] hover:bg-blue-100'
})
</script>