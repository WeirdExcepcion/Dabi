import { createContext, useContext, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const FaltantesContext = createContext(null)

export function FaltantesProvider({ children }) {
  const [faltantes, setFaltantes] = useState({})
  const [ignoradas, setIgnoradas] = useState(new Set())

  const cargarFaltantes = useCallback(async (ids) => {
    if (!ids || ids.length === 0) return

    const { data, error } = await supabase.rpc('faltantes_matriculas', {
      p_ids: ids,
    })

    if (error) {
      console.error('Error al cargar faltantes:', error.message)
      return
    }

    const mapa = {}
    ;(data || []).forEach((fila) => {
      mapa[fila.matricula_id] = fila.faltantes
    })

    setFaltantes((anteriores) => ({ ...anteriores, ...mapa }))
  }, [])

  const refrescarUna = useCallback(async (matriculaId) => {
    const { data, error } = await supabase.rpc('faltantes_matriculas', {
      p_ids: [matriculaId],
    })

    if (error) {
      console.error('Error al refrescar faltantes:', error.message)
      return
    }

    setFaltantes((anteriores) => {
      const copia = { ...anteriores }
      if (data && data.length > 0) {
        copia[matriculaId] = data[0].faltantes
      } else {
        delete copia[matriculaId]
      }
      return copia
    })
  }, [])

  const ignorar = useCallback((matriculaId) => {
    setIgnoradas((anteriores) => new Set(anteriores).add(matriculaId))
  }, [])

  return (
    <FaltantesContext.Provider value={{ faltantes, ignoradas, cargarFaltantes, refrescarUna, ignorar }}>
      {children}
    </FaltantesContext.Provider>
  )
}

export function useFaltantes() {
  const contexto = useContext(FaltantesContext)
  if (!contexto) {
    return {
      faltantes: {},
      ignoradas: new Set(),
      cargarFaltantes: () => {},
      refrescarUna: () => {},
      ignorar: () => {},
    }
  }
  return contexto
}