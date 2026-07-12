import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useCatalogos() {
  const [catalogos, setCatalogos] = useState({
    empresas: [],
    arls: [],
    eps: [],
    areas: [],
    cargos: [],
    nivelesEducativos: [],
  })
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      const [empresas, arls, eps, areas, cargos, niveles] = await Promise.all([
        supabase.from('empresas').select('id, razon_social,arl_id').order('razon_social'),
        supabase.from('arls').select('id, nombre').eq('activo', true).order('nombre'),
        supabase.from('eps').select('id, nombre').eq('activo', true).order('nombre'),
        supabase.from('areas').select('id, nombre').eq('activo', true).order('nombre'),
        supabase.from('cargos').select('id, nombre').eq('activo', true).order('nombre'),
        supabase.from('niveles_educativos').select('id, nombre').order('nombre'),
      ])

      const resultados = [empresas, arls, eps, areas, cargos, niveles]
      resultados.forEach((r) => {
        if (r.error) console.error('Error cargando catálogo:', r.error.message)
      })

      setCatalogos({
        empresas: empresas.data || [],
        arls: arls.data || [],
        eps: eps.data || [],
        areas: areas.data || [],
        cargos: cargos.data || [],
        nivelesEducativos: niveles.data || [],
      })

      setCargando(false)
    }

    cargar()
  }, [])

  return { catalogos, cargando }
}