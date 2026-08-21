import { useState, useRef, useEffect } from 'react'

// Mecánica común de los desplegables con buscador: abrir y cerrar, clic fuera,
// foco automático en el input y navegación con flechas.
// limpiarExtra: estado propio del componente que también debe borrarse al cerrar.
export function useDesplegable({ limpiarExtra } = {}) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [indiceActivo, setIndiceActivo] = useState(0)

  const contenedorRef = useRef(null)
  const inputRef = useRef(null)

  // El listener de clic fuera se registra una sola vez; el ref mantiene
  // vigente la limpieza sin tener que volver a suscribirlo.
  const limpiarRef = useRef(limpiarExtra)
  limpiarRef.current = limpiarExtra

  function cerrar() {
    setAbierto(false)
    setBusqueda('')
    setIndiceActivo(0)
    limpiarRef.current?.()
  }

  useEffect(() => {
    function clicFuera(e) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        cerrar()
      }
    }
    document.addEventListener('mousedown', clicFuera)
    return () => document.removeEventListener('mousedown', clicFuera)
  }, [])

  useEffect(() => {
    if (abierto && inputRef.current) inputRef.current.focus()
  }, [abierto])

  function alternar() {
    setAbierto((v) => !v)
  }

  function cambiarBusqueda(texto) {
    setBusqueda(texto)
    setIndiceActivo(0)
  }

  // cantidad: opciones visibles ahora mismo.
  // alElegir(indice): Enter con una opción marcada.
  // alNoHallar: Enter sin ninguna marcada — SelectorCargo lo usa para crear.
  function manejarTeclas(e, { cantidad, alElegir, alNoHallar }) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndiceActivo((i) => Math.min(i + 1, cantidad - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (indiceActivo < cantidad) alElegir(indiceActivo)
      else alNoHallar?.()
    } else if (e.key === 'Escape') {
      cerrar()
    }
  }

  const termino = busqueda.trim().toLowerCase()

  return {
    abierto,
    alternar,
    cerrar,
    busqueda,
    termino,
    cambiarBusqueda,
    indiceActivo,
    setIndiceActivo,
    manejarTeclas,
    contenedorRef,
    inputRef,
  }
}