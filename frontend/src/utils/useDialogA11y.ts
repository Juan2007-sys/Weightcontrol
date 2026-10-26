import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Accesibilidad de teclado para modales: foco inicial dentro del dialogo, Tab/Shift+Tab ciclan
 * sin salir (sin trampa irreversible: Esc cierra) y al cerrar el foco vuelve al elemento que lo abrio.
 * Uso: const ref = useDialogA11y<HTMLDivElement>(isOpen, onClose); <div ref={ref} role="dialog" ...>
 */
export function useDialogA11y<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const items = () => (node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null) : []);
    const t = setTimeout(() => {
      if (node && !node.contains(document.activeElement)) (items()[0] ?? node).focus();
    }, 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const list = items();
      if (list.length === 0) { e.preventDefault(); node.focus(); return; }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !node.contains(active))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (active === last || !node.contains(active))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey, true);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [open]);

  return ref;
}
