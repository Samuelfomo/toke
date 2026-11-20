import {nextTick, onBeforeUnmount, ref, watch, type ComputedRef, type Ref} from 'vue'

type BooleanSource = boolean | Ref<boolean> | ComputedRef<boolean> | (() => boolean)

function resolve(source: BooleanSource): boolean {
  if (typeof source === 'function') return Boolean(source())
  if (typeof source === 'object' && source !== null && 'value' in source) {
    return Boolean(source.value)
  }
  return Boolean(source)
}

const SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useFocusTrap(active: BooleanSource) {
  const container = ref<HTMLElement | null>(null)
  let previousFocus: HTMLElement | null = null

  function focusableElements(): HTMLElement[] {
    if (!container.value) return []
    return Array.from(container.value.querySelectorAll<HTMLElement>(SELECTOR)).filter(
      (element) => !element.hasAttribute('hidden') && element.offsetParent !== null,
    )
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return
    const elements = focusableElements()
    if (!elements.length) {
      event.preventDefault()
      container.value?.focus()
      return
    }

    const first = elements[0]
    const last = elements[elements.length - 1]

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  watch(
    () => resolve(active),
    async (enabled) => {
      if (typeof document === 'undefined') return

      if (enabled) {
        previousFocus = document.activeElement as HTMLElement | null
        await nextTick()
        const first = focusableElements()[0]
        ;(first ?? container.value)?.focus()
        document.addEventListener('keydown', handleKeydown)
        return
      }

      document.removeEventListener('keydown', handleKeydown)
      previousFocus?.focus?.()
      previousFocus = null
    },
    {immediate: true},
  )

  onBeforeUnmount(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', handleKeydown)
    }
  })

  return {container}
}
