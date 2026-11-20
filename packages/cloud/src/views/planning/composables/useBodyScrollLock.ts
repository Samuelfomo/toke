import {computed, onBeforeUnmount, watch, type ComputedRef, type Ref} from 'vue'

type BooleanSource = boolean | Ref<boolean> | ComputedRef<boolean> | (() => boolean)

let activeLocks = 0
let previousOverflow = ''
let previousPaddingRight = ''

function resolveSource(source: BooleanSource): boolean {
  if (typeof source === 'function') return Boolean(source())
  if (typeof source === 'object' && source !== null && 'value' in source) {
    return Boolean(source.value)
  }
  return Boolean(source)
}

function lockBody(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return

  if (activeLocks === 0) {
    previousOverflow = document.body.style.overflow
    previousPaddingRight = document.body.style.paddingRight

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
  }

  activeLocks += 1
}

function unlockBody(): void {
  if (typeof document === 'undefined') return
  if (activeLocks === 0) return

  activeLocks -= 1

  if (activeLocks === 0) {
    document.body.style.overflow = previousOverflow
    document.body.style.paddingRight = previousPaddingRight
  }
}

/**
 * Bloque le défilement de la page pendant l'affichage d'une modale ou d'un drawer.
 * Le compteur interne permet de gérer correctement les overlays imbriqués.
 */
export function useBodyScrollLock(source: BooleanSource): void {
  const enabled = computed(() => resolveSource(source))
  let lockedByInstance = false

  watch(
    enabled,
    (shouldLock) => {
      if (shouldLock && !lockedByInstance) {
        lockBody()
        lockedByInstance = true
        return
      }

      if (!shouldLock && lockedByInstance) {
        unlockBody()
        lockedByInstance = false
      }
    },
    {immediate: true},
  )

  onBeforeUnmount(() => {
    if (!lockedByInstance) return
    unlockBody()
    lockedByInstance = false
  })
}
