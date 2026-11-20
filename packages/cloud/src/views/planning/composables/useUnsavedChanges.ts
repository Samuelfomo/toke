import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  unref,
  type ComputedRef,
  type Ref,
} from 'vue'
import {onBeforeRouteLeave} from 'vue-router'

type BooleanSource = boolean | Ref<boolean> | ComputedRef<boolean> | (() => boolean)

function resolveBoolean(source: BooleanSource): boolean {
  if (typeof source === 'function') return Boolean(source())
  return Boolean(unref(source))
}

export interface UnsavedChangesOptions {
  dirty: BooleanSource
  active?: BooleanSource
  saving?: BooleanSource
  routeGuard?: boolean
  message?: string
}

/**
 * Centralise la confirmation d'abandon, la protection Vue Router et beforeunload.
 */
export function useUnsavedChanges(options: UnsavedChangesOptions) {
  const showDiscardDialog = ref(false)
  let pendingAction: (() => void) | null = null

  const active = computed(() => resolveBoolean(options.active ?? true))
  const dirty = computed(() => active.value && resolveBoolean(options.dirty))
  const saving = computed(() => resolveBoolean(options.saving ?? false))
  const message =
    options.message ??
    'Des modifications non enregistrées seront perdues. Voulez-vous vraiment quitter cette page ?'

  function requestAction(action: () => void): void {
    if (saving.value) return

    if (!dirty.value) {
      action()
      return
    }

    pendingAction = action
    showDiscardDialog.value = true
  }

  function confirmDiscard(): void {
    showDiscardDialog.value = false
    const action = pendingAction
    pendingAction = null
    action?.()
  }

  function cancelDiscard(): void {
    showDiscardDialog.value = false
    pendingAction = null
  }

  function handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (!dirty.value || saving.value) return
    event.preventDefault()
    event.returnValue = ''
  }

  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }
  })

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  })

  if (options.routeGuard !== false) {
    onBeforeRouteLeave(() => {
      if (!dirty.value) return true
      if (saving.value) return false
      return typeof window === 'undefined' ? false : window.confirm(message)
    })
  }

  return {
    dirty,
    saving,
    showDiscardDialog,
    requestAction,
    confirmDiscard,
    cancelDiscard,
  }
}
