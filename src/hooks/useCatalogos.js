import { useState, useEffect } from 'react'
import { pedirCatalogo } from '../lib/catalogos'

const TODOS = ['empresas', 'arls', 'eps', 'areas', 'cargos', 'sectores', 'nivelesEducativos']

export function useCatalogos(nombres = TODOS) {
  // La clave estabiliza la dependencia del efecto: si se pasara el array,
  // una literal nueva en cada render lo volvería a disparar.
  const clave = nombres.join(',')

  const [catalogos, setCatalogos] = useState(() =>
    Object.fromEntries(nombres.map((n) => [n, []]))
  )
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vigente = true
    setCargando(true)

    Promise.all(nombres.map(pedirCatalogo))
      .then((listas) => {
        if (!vigente) return
        setCatalogos(Object.fromEntries(nombres.map((n, i) => [n, listas[i]])))
        setCargando(false)
      })
      .catch((e) => {
        if (!vigente) return
        console.error('Error cargando catálogos:', e.message)
        setCargando(false)
      })

    return () => {
      vigente = false
    }
  }, [clave])

  return { catalogos, cargando }
}