import type { ComputedRef, Ref } from 'vue';
import { nextTick, onBeforeUnmount, watch } from 'vue';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface AccessibleDialogOptions {
  open: ComputedRef<boolean>;
  dialogRef: Ref<HTMLElement | null>;
  initialFocusRef?: Ref<HTMLElement | null>;
  close: () => void;
}

/**
 * Gestion réutilisable d'un dialogue : Escape, focus initial, piège Tab,
 * restauration du focus appelant et verrouillage du scroll de la page.
 */
export function useAccessibleDialog(options: AccessibleDialogOptions): void {
  let previousActiveElement: HTMLElement | null = null;
  let previousBodyOverflow = '';

  function getFocusableElements(): HTMLElement[] {
    const dialog = options.dialogRef.value;
    if (!dialog) return [];
    return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true',
    );
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (!options.open.value) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      options.close();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      options.dialogRef.value?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function activate(): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    previousActiveElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeydown);

    await nextTick();
    const target = options.initialFocusRef?.value ?? getFocusableElements()[0] ?? options.dialogRef.value;
    target?.focus();
  }

  function deactivate(restoreFocus: boolean): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    window.removeEventListener('keydown', handleKeydown);
    document.body.style.overflow = previousBodyOverflow;
    if (restoreFocus && previousActiveElement?.isConnected) previousActiveElement.focus();
    previousActiveElement = null;
  }

  watch(
    options.open,
    (open) => {
      if (open) void activate();
      else deactivate(true);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => deactivate(false));
}
