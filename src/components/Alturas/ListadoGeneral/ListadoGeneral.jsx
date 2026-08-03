import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'
import { PUEDE_GESTIONAR_MINTRABAJO } from '../../../constants/permisos'
import Modal from '../../compartidos/Modal/Modal'
import RegistrarCargue from './RegistrarCargue/RegistrarCargue'
import PreviaCsv from './PreviaCsv/PreviaCsv'
import SelectorCoordinador from './SelectorCoordinador/SelectorCoordinador'
import './ListadoGeneral.css'

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

function ListadoGeneral() {
  const { perfil } = useOutletContext()
  const navegar = useNavigate()

  const [grupos, setGrupos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [grupoCargando, setGrupoCargando] = useState(null)
  const [verCargados, setVerCargados] = useState(false)
  const [grupoCsv, setGrupoCsv] = useState(null)
  const [coordinadores, setCoordinadores] = useState([])

  const puedeGestionar = PUEDE_GESTIONAR_MINTRABAJO.includes(perfil.rol)

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

  if (!puedeGestionar) {
    return <p className="listado__mensaje">Tu rol no tiene acceso a esta sección.</p>
  }

  if (cargando) {
    return <p className="listado__mensaje">Cargando listado…</p>
  }

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
  const vencidos = pendientes.filter((g) => {
    const dias = diasHasta(g.mintrabajo_fecha_limite)
    return dias !== null && dias < 0
  })
  const porVencer = pendientes.filter((g) => {
    const dias = diasHasta(g.mintrabajo_fecha_limite)
    return dias !== null && dias >= 0 && dias <= 3
  })
  const aTiempo = pendientes.filter((g) => {
    const dias = diasHasta(g.mintrabajo_fecha_limite)
    return dias === null || dias > 3
  })
  const cargados = filtrados.filter((g) => g.cargado)

  function Fila({ grupo, urgencia }) {
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
          <SelectorCoordinador
            grupoId={grupo.id}
            valor={grupo.coordinador_id}
            opciones={coordinadores}
            onCambiado={() => cargar()}
          />
        </td>
        <td className="listado__td listado__td_centro">{grupo.total_aprendices}</td>
        <td className="listado__td listado__td_limite">
          {formatearFecha(grupo.mintrabajo_fecha_limite)}
          {!grupo.cargado && dias !== null && (
            <span className={`listado__dias listado__dias_${urgencia}`}>
              {dias < 0
                ? `${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'} vencido`
                : dias === 0
                ? 'hoy'
                : `en ${dias} ${dias === 1 ? 'día' : 'días'}`}
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
          <button
            className="listado__boton"
            onClick={() => navegar(`/alturas/grupos/${grupo.id}`)}
          >
            Ver
          </button>
          <button
            className="listado__boton listado__boton_principal"
            onClick={() => setGrupoCargando(grupo)}
          >
            {grupo.cargado ? 'Editar cargue' : 'Registrar'}
          </button>
          <button
            className="listado__boton"
            onClick={() => setGrupoCsv(grupo)}
            title="Descargar archivo para MinTrabajo"
          >
            CSV
          </button>
        </td>
      </tr>
    )
  }

  function Bloque({ titulo, lista, urgencia, nota }) {
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

        <div className="listado__tabla-wrap">
          <table className="listado__tabla">
            <thead>
              <tr>
                <th className="listado__th">Curso</th>
                <th className="listado__th">Fechas</th>
                <th className="listado__th">Empresa</th>
                <th className="listado__th">Sector</th>
                <th className="listado__th">Entrenador</th>
                <th className="listado__th">Supervisor</th>
                <th className="listado__th">Coordinador</th>
                <th className="listado__th">Aprendices</th>
                <th className="listado__th">Fecha límite</th>
                <th className="listado__th">ID curso</th>
                <th className="listado__th"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((g) => (
                <Fila key={g.id} grupo={g} urgencia={urgencia} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
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
        <Modal onCerrar={() => setGrupoCargando(null)}>
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
      />

      <Bloque
        titulo="Por vencer"
        lista={porVencer}
        urgencia="urgente"
        nota="Vencen en los próximos tres días."
      />

      <Bloque titulo="Pendientes" lista={aTiempo} urgencia="normal" />

      {cargados.length > 0 && (
        <div className="listado__bloque">
          <button
            className="listado__toggle"
            onClick={() => setVerCargados((v) => !v)}
          >
            {verCargados
              ? 'Ocultar cargados'
              : `Ver cargados (${cargados.length})`}
          </button>

          {verCargados && (
            <div className="listado__tabla-wrap">
              <table className="listado__tabla">
                <thead>
                  <tr>
                    <th className="listado__th">Curso</th>
                <th className="listado__th">Fechas</th>
                <th className="listado__th">Empresa</th>
                <th className="listado__th">Sector</th>
                <th className="listado__th">Entrenador</th>
                <th className="listado__th">Supervisor</th>
                <th className="listado__th">Coordinador</th>
                <th className="listado__th">Aprendices</th>
                <th className="listado__th">Fecha límite</th>
                <th className="listado__th">ID curso</th>
                <th className="listado__th"></th>
                  </tr>
                </thead>
                <tbody>
                  {cargados.map((g) => (
                    <Fila key={g.id} grupo={g} urgencia="cargado" />
                  ))}
                </tbody>
              </table>
            </div>
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