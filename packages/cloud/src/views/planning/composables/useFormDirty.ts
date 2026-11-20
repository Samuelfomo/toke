import {computed, ref, unref, type ComputedRef, type Ref} from 'vue'

type BooleanSource = boolean | Ref<boolean> | ComputedRef<boolean> | (() => boolean)

function resolveBoolean(source: BooleanSource): boolean {
  if (typeof source === 'function') return Boolean(source())
  return Boolean(unref(source))
}

function serialize(value: unknown): string {
  return JSON.stringify(value, (_key, current) => {
    if (current instanceof Date) return current.toISOString()
    return current
  })
}

/**
 * Compare l'état courant d'un formulaire avec son dernier état de référence.
 * Appeler markPristine() après chaque initialisation et après une sauvegarde réussie.
 */
export function useFormDirty<T>(
  source: () => T,
  active: BooleanSource = true,
): {
  isDirty: ComputedRef<boolean>
  markPristine: () => void
  clearPristine: () => void
} {
  const pristineSnapshot = ref('')
  const currentSnapshot = computed(() => serialize(source()))

  const isDirty = computed(
    () =>
      resolveBoolean(active) &&
      pristineSnapshot.value !== '' &&
      currentSnapshot.value !== pristineSnapshot.value,
  )

  function markPristine(): void {
    pristineSnapshot.value = currentSnapshot.value
  }

  function clearPristine(): void {
    pristineSnapshot.value = ''
  }

  return {isDirty, markPristine, clearPristine}
}
