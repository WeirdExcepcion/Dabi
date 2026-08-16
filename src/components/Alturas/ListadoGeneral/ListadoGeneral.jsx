import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'
import { PUEDE_GESTIONAR_MINTRABAJO, ROLES_SOLO_LECTURA } from '../../../constants/permisos'
import Modal from '../../compartidos/Modal/Modal'
import RegistrarCargue from './RegistrarCargue/RegistrarCargue'
import PreviaCsv from './PreviaCsv/PreviaCsv'
import SelectorCoordinador from './SelectorCoordinador/SelectorCoordinador'
import './ListadoGeneral.css'

const ENCABEZADOS = [
  'Curso',
  'Fechas',
  'Empresa',
  'Sector',
  'Entrenador',
  'Supervisor',
  'Coordinador',
  'Aprendices',
  'Fecha límite',
  'ID curso',
  '',
]

function hoyISO() {
  const hoy = new Date()
  const yyyy = hoy.getFullYear()
  const mm = String(hoy.getMonth() + 1).padStart(2, '0')
  const dd = String(hoy.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function conVarios(principal, total) {
  if (!principal) return '—'
  if (total > 1) return `${principal} +${total - 1}`
  return principal
}

function formatearFecha(iso) {
  if (!iso) return '—'
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

function diasHasta(iso) {
  if (!iso) return null
  const [a1, m1, d1] = hoyISO().split('-').map(Number)
  const [a2, m2, d2] = iso.split('-').map(Number)
  const hoy = new Date(a1, m1 - 1, d1)
  const limite = new Date(a2, m2 - 1, d2)
  return Math.round((limite - hoy) / (1000 * 60 * 60 * 24))
}

function textoDias(dias) {
  if (dias < 0) {
    const abs = Math.abs(dias)
    return `${abs} ${abs === 1 ? 'día' : 'días'} vencido`
  }
  if (dias === 0) return 'hoy'
  return `en ${dias} ${dias === 1 ? 'día' : 'días'}`
}

function Encabezados() {
  return (
    <thead>
      <tr>
        {ENCABEZADOS.map((titulo, i) => (
          <th key={i} className="listado__th">{titulo}</th>
        ))}
      </tr>
    </thead>
  )
}

function Fila({
  grupo,
  urgencia,
  soloLectura,
  puedeGestionar,
  coordinadores,
  onVerGrupo,
  onRegistrar,
  onCsv,
  onCoordinadorCambiado,
}) {
  const dias = diasHasta(grupo.mintrabajo_fecha_limite)

  return (
    <tr className={`listado__fila listado__fila_${urgencia}`}>
      <td className="listado__td listado__td_principal">
        {grupo.curso}
        {grupo.identificador && (
          <span className="listado__id"> ({grupo.identificador})</span>
        )}
        {grupo.observaciones && (
          <span className="listado__obs" title={grupo.observaciones}>obs.</span>
        )}
      </td>

      <td className="listado__td listado__td_fechas">
        {formatearFecha(grupo.fecha_inicio)} – {formatearFecha(grupo.fecha_fin)}
      </td>

      <td className="listado__td listado__td_empresa" title={grupo.empresa_principal || ''}>
        {conVarios(grupo.empresa_principal, grupo.total_empresas)}
      </td>

      <td className="listado__td listado__td_sector">
        {conVarios(grupo.sector_principal, grupo.total_sectores)}
      </td>

      <td className="listado__td">{grupo.entrenador || '—'}</td>
      <td className="listado__td">{grupo.supervisor || '—'}</td>

      <td className="listado__td">
        {soloLectura ? (
          grupo.coordinador || '—'
        ) : (
          <SelectorCoordinador
            grupoId={grupo.id}
            valor={grupo.coordinador_id}
            opciones={coordinadores}
            onCambiado={(nuevoId) => onCoordinadorCambiado(grupo.id, nuevoId)}
          />
        )}
      </td>

      <td className="listado__td listado__td_centro">{grupo.total_aprendices}</td>

      <td className="listado__td listado__td_limite">
        {formatearFecha(grupo.mintrabajo_fecha_limite)}
        {!grupo.cargado && dias !== null && (
          <span className={`listado__dias listado__dias_${urgencia}`}>
            {textoDias(dias)}
          </span>
        )}
      </td>

      <td className="listado__td listado__td_cargue">
        {grupo.cargado ? (
          <>
            <code className="listado__codigo">{grupo.mintrabajo_id_curso}</code>
            <span className="listado__cargue-fecha">
              {formatearFecha(grupo.mintrabajo_fecha_cargue)}
            </span>
          </>
        ) : (
          <span className="listado__sin-cargue">Sin cargar</span>
        )}
      </td>

      <td className="listado__td listado__td_acciones">
        <button className="listado__boton" onClick={() => onVerGrupo(grupo.id)}>
          Ver
        </button>

        {puedeGestionar && (
          <>
            <button
              className="listado__boton listado__boton_principal"
              onClick={() => onRegistrar(grupo)}
            >
              {grupo.cargado ? 'Editar cargue' : 'Registrar'}
            </button>
            <button
              className="listado__boton"
              onClick={() => onCsv(grupo)}
              title="Descargar archivo para MinTrabajo"
            >
              CSV
            </button>
          </>
        )}
      </td>
    </tr>
  )
}

function TablaGrupos({ lista, urgencia, ...propsFila }) {
  return (
    <div className="listado__tabla-wrap entra-bloque">
      <table className="listado__tabla entra-tabla">
        <Encabezados />
        <tbody>
          {lista.map((g) => (
            <Fila key={g.id} grupo={g} urgencia={urgencia} {...propsFila} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Bloque({ titulo, lista, urgencia, nota, ...propsFila }) {
  if (lista.length === 0) return null

  return (
    <div className="listado__bloque">
      <div className={`listado__bloque-cabecera listado__bloque-cabecera_${urgencia}`}>
        <h2 className="listado__bloque-titulo">{titulo}</h2>
        <span className="listado__bloque-conteo">
          {lista.length} {lista.length === 1 ? 'grupo' : 'grupos'}
        </span>
      </div>

      {nota && <p className="listado__bloque-nota">{nota}</p>}

      <TablaGrupos lista={lista} urgencia={urgencia} {...propsFila} />
    </div>
  )
}

function ListadoGeneral() {
  const { perfil } = useOutletContext()
  const navegar = useNavigate()

  const [grupos, setGrupos] = useState([])
  const [coordinadores, setCoordinadores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [grupoCargando, setGrupoCargando] = useState(null)
  const [grupoCsv, setGrupoCsv] = useState(null)
  const [verCargados, setVerCargados] = useState(false)

  const puedeGestionar = PUEDE_GESTIONAR_MINTRABAJO.includes(perfil.rol)
  const soloLectura = ROLES_SOLO_LECTURA.includes(perfil.rol)

  async function cargar() {
    setCargando(true)
    setError('')

    const { data, error } = await supabase
      .from('listado_general')
      .select('*')
      .order('mintrabajo_fecha_limite', { ascending: true })

    if (error) {
      setError('No se pudo cargar el listado')
      console.error(error.message)
    } else {
      setGrupos(data)
    }

    setCargando(false)
  }

  useEffect(() => {
    async function cargarCoordinadores() {
      const { data } = await supabase
        .from('entrenadores')
        .select('id, nombre_completo')
        .eq('puede_coordinar', true)
        .order('nombre_completo')
      if (data) setCoordinadores(data)
    }

    cargar()
    cargarCoordinadores()
  }, [])

  if (!puedeGestionar && !soloLectura) {
    return <p className="listado__mensaje">Tu rol no tiene acceso a esta sección.</p>
  }

  if (cargando) return null

  if (error) {
    return <p className="listado__mensaje">{error}</p>
  }

  const termino = busqueda.trim().toLowerCase()
  const filtrados = termino
    ? grupos.filter(
        (g) =>
          g.curso.toLowerCase().includes(termino) ||
          (g.identificador || '').toLowerCase().includes(termino) ||
          (g.entrenador || '').toLowerCase().includes(termino) ||
          (g.mintrabajo_id_curso || '').toLowerCase().includes(termino)
      )
    : grupos

  const pendientes = filtrados.filter((g) => !g.cargado)
  const cargados = filtrados.filter((g) => g.cargado)

  const vencidos = pendientes.filter((g) => {
    const d = diasHasta(g.mintrabajo_fecha_limite)
    return d !== null && d < 0
  })
  const porVencer = pendientes.filter((g) => {
    const d = diasHasta(g.mintrabajo_fecha_limite)
    return d !== null && d >= 0 && d <= 3
  })
  const aTiempo = pendientes.filter((g) => {
    const d = diasHasta(g.mintrabajo_fecha_limite)
    return d === null || d > 3
  })

  const propsFila = {
    soloLectura,
    puedeGestionar,
    coordinadores,
    onVerGrupo: (id) => navegar(`/alturas/grupos/${id}`),
    onRegistrar: setGrupoCargando,
    onCsv: setGrupoCsv,
    onCoordinadorCambiado: (grupoId, nuevoId) => {
      const coord = coordinadores.find((c) => String(c.id) === String(nuevoId))
      setGrupos((antes) =>
        antes.map((g) =>
          g.id === grupoId
            ? {
                ...g,
                coordinador_id: nuevoId ? Number(nuevoId) : null,
                coordinador: coord ? coord.nombre_completo : null,
              }
            : g
        )
      )
    },
  }

  return (
    <section className="listado">
      <header className="listado__header">
        <div>
          <p className="listado__eyebrow">Ministerio de Trabajo</p>
          <h1 className="listado__titulo">Listado General</h1>
          <p className="listado__subtitulo">
            Control de cargue de grupos a la plataforma del ministerio
          </p>
        </div>

        <div className="listado__resumen">
          {vencidos.length > 0 && (
            <span className="listado__chip listado__chip_vencido">
              {vencidos.length} vencido{vencidos.length !== 1 && 's'}
            </span>
          )}
          {porVencer.length > 0 && (
            <span className="listado__chip listado__chip_urgente">
              {porVencer.length} por vencer
            </span>
          )}
          <span className="listado__chip">{pendientes.length} sin cargar</span>
        </div>
      </header>

      {grupoCsv && (
        <Modal onCerrar={() => setGrupoCsv(null)}>
          <PreviaCsv grupo={grupoCsv} onCerrar={() => setGrupoCsv(null)} />
        </Modal>
      )}

      {grupoCargando && (
        <Modal onCerrar={() => setGrupoCargando(null)} bloquearCierre>
          <RegistrarCargue
            grupo={grupoCargando}
            onRegistrado={() => {
              setGrupoCargando(null)
              cargar()
            }}
            onCancelar={() => setGrupoCargando(null)}
          />
        </Modal>
      )}

      <div className="listado__buscador">
        <input
          type="text"
          className="listado__input-busqueda"
          placeholder="Buscar por curso, identificador, entrenador o ID…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <Bloque
        titulo="Vencidos sin cargar"
        lista={vencidos}
        urgencia="vencido"
        nota="Estos grupos pasaron su fecha límite. Cárgalos cuanto antes."
        {...propsFila}
      />

      <Bloque
        titulo="Por vencer"
        lista={porVencer}
        urgencia="urgente"
        nota="Vencen en los próximos tres días."
        {...propsFila}
      />

      <Bloque titulo="Pendientes" lista={aTiempo} urgencia="normal" {...propsFila} />

      {cargados.length > 0 && (
        <div className="listado__bloque">
          <button
            className="listado__toggle"
            onClick={() => setVerCargados((v) => !v)}
          >
            {verCargados ? 'Ocultar cargados' : `Ver cargados (${cargados.length})`}
          </button>

          {verCargados && (
            <TablaGrupos lista={cargados} urgencia="cargado" {...propsFila} />
          )}
        </div>
      )}

      {filtrados.length === 0 && (
        <p className="listado__mensaje">
          {termino ? 'Ningún grupo coincide con la búsqueda.' : 'No hay grupos registrados.'}
        </p>
      )}
    </section>
  )
}

export default ListadoGeneral