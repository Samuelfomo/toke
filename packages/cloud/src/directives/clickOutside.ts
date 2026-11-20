import type { Directive } from 'vue'

export const clickOutside: Directive = {
  beforeMount(el, binding) {
    el.__clickOutside__ = (event: MouseEvent) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value(event)
      }
    }

    document.addEventListener('click', el.__clickOutside__)
  },

  unmounted(el) {
    document.removeEventListener('click', el.__clickOutside__)
  }
}
