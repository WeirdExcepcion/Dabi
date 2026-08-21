import { useEffect, useRef } from 'react'

// Bloquea el scroll del fondo y cierra con Escape mientras la capa está montada.
export function useCapaModal(onCerrar, bloquearCierre = false) {
  // onCerrar casi siempre llega como flecha inline, o sea identidad nueva en
  // cada render. Con el ref el efecto solo corre al montar y desmontar.
  const cerrarRef = useRef(onCerrar)
  cerrarRef.current = onCerrar

  useEffect(() => {
    function manejarEscape(e) {
      if (e.key === 'Escape' && !bloquearCierre) cerrarRef.current()
    }

    document.addEventListener('keydown', manejarEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', manejarEscape)
      document.body.style.overflow = ''
    }
  }, [bloquearCierre])
}