import { supabase } from './supabaseClient'

const CONSULTAS = {
  empresas: () => supabase.from('empresas').select('id, razon_social, arl_id, sector_id, es_independiente').eq('activo', true).order('razon_social'),
  arls: () => supabase.from('arls').select('id, nombre').eq('activo', true).order('nombre'),
  eps: () => supabase.from('eps').select('id, nombre').eq('activo', true).order('nombre'),
  areas: () => supabase.from('areas').select('id, nombre').eq('activo', true).order('nombre'),
  cargos: () => supabase.from('cargos').select('id, nombre').eq('activo', true).order('nombre'),
  sectores: () => supabase.from('sectores').select('id, nombre').eq('activo', true).order('nombre'),
  nivelesEducativos: () => supabase.from('niveles_educativos').select('id, nombre').order('nombre'),
}

// Se guarda la promesa, no el resultado: dos componentes que pidan el mismo
// catálogo a la vez comparten una sola consulta.
const cache = new Map()

export function pedirCatalogo(nombre) {
  if (!cache.has(nombre)) {
    const promesa = CONSULTAS[nombre]().then(({ data, error }) => {
      if (error) {
        cache.delete(nombre)
        throw error
      }
      return data || []
    })
    cache.set(nombre, promesa)
  }
  return cache.get(nombre)
}

// Hay que llamarla al crear o modificar registros de un catálogo, o la caché
// sigue sirviendo la versión vieja hasta que se recargue la página.
export function invalidarCatalogo(nombre) {
  cache.delete(nombre)
}