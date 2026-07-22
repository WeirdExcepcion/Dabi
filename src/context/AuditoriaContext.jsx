import { createContext, useContext, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuditoriaContext = createContext(null)

const ESTADOS = {
  en_proceso: 'En proceso',
  faltan_documentos: 'Faltan documentos',
  esperando_fecha: 'Esperando fecha',
  completo: 'Completo',
  aprobado: 'Aprobado',
  certificado: 'Certificado',
  anulado: 'Anulado',
}

export function AuditoriaProvider({ children }) {
  const [modoActivo, setModoActivo] = useState(false)
  const [auditadas, setAuditadas] = useState({})
  const [detalles, setDetalles] = useState({})
  const [nombres, setNombres] = useState({})
  const [cargado, setCargado] = useState(false)

  const cargarAuditadas = useCallback(async () => {
    const [resAudit, resEmpresas, resArls, resEps, resAreas, resCargos, resGrupos] =
      await Promise.all([
        supabase
          .from('auditoria')
          .select(`
            registro_id, accion, cambios, realizado_en,
            autor:realizado_por ( nombre_completo ),
            aprobador:aprobado_por ( nombre_completo )
          `)
          .eq('tabla', 'matriculas')
          .order('realizado_en', { ascending: false }),
        supabase.from('empresas').select('id, razon_social'),
        supabase.from('arls').select('id, nombre'),
        supabase.from('eps').select('id, nombre'),
        supabase.from('areas').select('id, nombre'),
        supabase.from('cargos').select('id, nombre'),
        supabase.from('grupos').select('id, fecha_inicio, cursos ( nombre )'),
      ])

    if (resAudit.error) {
      console.error('Error al cargar auditadas:', resAudit.error.message)
      return
    }

    const mapaResumen = {}
    const mapaDetalles = {}

    resAudit.data.forEach((registro) => {
      const id = registro.registro_id

      if (!mapaResumen[id]) {
        mapaResumen[id] = {
          ultima: registro.realizado_en,
          autor: registro.autor?.nombre_completo || 'Alguien',
          total: 0,
        }
        mapaDetalles[id] = []
      }
      mapaResumen[id].total += 1
      mapaDetalles[id].push(registro)
    })

    const mapa = (lista, campo) => {
      const o = {}
      ;(lista || []).forEach((x) => { o[x.id] = x[campo] })
      return o
    }

    const mapaGrupos = {}
    ;(resGrupos.data || []).forEach((g) => {
      mapaGrupos[g.id] = `${g.cursos?.nombre || 'Curso'} (${g.fecha_inicio})`
    })

    setNombres({
      empresa_id: mapa(resEmpresas.data, 'razon_social'),
      arl_id: mapa(resArls.data, 'nombre'),
      eps_id: mapa(resEps.data, 'nombre'),
      area_id: mapa(resAreas.data, 'nombre'),
      cargo_id: mapa(resCargos.data, 'nombre'),
      grupo_id: mapaGrupos,
    })
    setAuditadas(mapaResumen)
    setDetalles(mapaDetalles)
    setCargado(true)
  }, [])

  const activar = useCallback(async () => {
    if (!cargado) await cargarAuditadas()
    setModoActivo(true)
  }, [cargado, cargarAuditadas])

  const desactivar = useCallback(() => setModoActivo(false), [])

  const traducir = useCallback(
    (campo, valor) => {
      if (valor === null || valor === undefined || valor === '') return '—'
      if (campo === 'estado') return ESTADOS[valor] || valor
      if (nombres[campo]) return nombres[campo][Number(valor)] || `#${valor}`
      return String(valor)
    },
    [nombres]
  )

  return (
    <AuditoriaContext.Provider
      value={{
        modoActivo, auditadas, detalles, activar, desactivar,
        recargar: cargarAuditadas, traducir,
      }}
    >
      {children}
    </AuditoriaContext.Provider>
  )
}

export function useAuditoria() {
  const contexto = useContext(AuditoriaContext)
  if (!contexto) {
    return {
      modoActivo: false, auditadas: {}, detalles: {},
      activar: () => {}, desactivar: () => {}, recargar: () => {},
      traducir: (_, v) => String(v ?? '—'),
    }
  }
  return contexto
}