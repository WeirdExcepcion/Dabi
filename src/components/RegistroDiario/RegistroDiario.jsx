import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { PUEDE_CREAR_MATRICULAS } from '../../constants/permisos'
import './RegistroDiario.css'
import FormularioMatricula from './FormularioMatricula/FormularioMatricula'

const ESTADOS = {
  en_proceso: 'En proceso',
  faltan_documentos: 'Faltan documentos',
  esperando_fecha: 'Esperando fecha',
  certificado: 'Certificado',
  anulado: 'Anulado',
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function hoyISO() {
  const hoy = new Date()
  const yyyy = hoy.getFullYear()
  const mm = String(hoy.getMonth() + 1).padStart(2, '0')
  const dd = String(hoy.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatearFechaLarga(iso) {
  const [anio, mes, dia] = iso.split('-').map(Number)
  return `${dia} de ${MESES[mes - 1]} de ${anio}`
}

const CAMPOS_MATRICULA = `
  id,
  estado,
  aprendices ( tipo_documento, numero_documento, nombres, apellidos ),
  empresas ( razon_social ),
  grupos (
    fecha_inicio,
    fecha_fin,
    identificador,
    cursos ( nombre )
  )
`

function RegistroDiario() {
  const { perfil } = useOutletContext()
  const [fecha, setFecha] = useState(hoyISO())
  const [matriculas, setMatriculas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false)

  const puedeCrear = PUEDE_CREAR_MATRICULAS.includes(perfil.rol)
  const esHoy = fecha === hoyISO()

  async function obtenerMatriculas() {
    setCargando(true)
    setError('')

    const { data, error } = await supabase
      .from('matriculas')
      .select(CAMPOS_MATRICULA)
      .eq('fecha_ingreso', fecha)
      .order('id', { ascending: true })

    if (error) {
      setError('No se pudieron cargar las matrículas')
      console.error(error.message)
    } else {
      setMatriculas(data)
    }

    setCargando(false)
  }

  useEffect(() => {
    obtenerMatriculas()
  }, [fecha])

  return (
    <section className="matriculas">
      <header className="matriculas__header">
        <div>
          <p className="matriculas__eyebrow">Formación</p>
          <h1 className="matriculas__titulo">Registro diario</h1>
          <p className="matriculas__fecha-larga">{formatearFechaLarga(fecha)}</p>
        </div>

        <div className="matriculas__acciones">
          <div className="matriculas__campo-fecha">
            <label className="matriculas__label" htmlFor="fecha_registro">Día</label>
            <input
              id="fecha_registro"
              type="date"
              className="matriculas__input-fecha"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              max={hoyISO()}
            />
          </div>

          {puedeCrear && esHoy && !mostrandoFormulario && (
            <button
              className="matriculas__boton-agregar"
              onClick={() => setMostrandoFormulario(true)}
            >
              Agregar aprendiz
            </button>
          )}
        </div>
      </header>

      {mostrandoFormulario && (
        <FormularioMatricula
          onGuardada={() => {
            setMostrandoFormulario(false)
            obtenerMatriculas()
          }}
          onCancelar={() => setMostrandoFormulario(false)}
        />
      )}

      {cargando && <p className="matriculas__mensaje">Cargando registro...</p>}

      {error && <p className="matriculas__mensaje">{error}</p>}

      {!cargando && !error && (
        <>
          <div className="matriculas__resumen">
            <span className="matriculas__conteo">
              {matriculas.length} {matriculas.length === 1 ? 'aprendiz registrado' : 'aprendices registrados'}
            </span>
          </div>

          {matriculas.length === 0 ? (
            <p className="matriculas__mensaje">
              {esHoy
                ? 'Aún no has registrado a nadie hoy.'
                : 'No hubo registros este día.'}
            </p>
          ) : (
            <div className="matriculas__tabla-wrap">
              <table className="matriculas__tabla">
                <thead>
                  <tr>
                    <th className="matriculas__th">#</th>
                    <th className="matriculas__th">Documento</th>
                    <th className="matriculas__th">Aprendiz</th>
                    <th className="matriculas__th">Grupo</th>
                    <th className="matriculas__th">Empresa</th>
                    <th className="matriculas__th">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {matriculas.map((matricula, indice) => (
                    <tr key={matricula.id}>
                      <td className="matriculas__td matriculas__td_indice">{indice + 1}</td>
                      <td className="matriculas__td matriculas__td_doc">
                        {matricula.aprendices.tipo_documento} {matricula.aprendices.numero_documento}
                      </td>
                      <td className="matriculas__td matriculas__td_principal">
                        {matricula.aprendices.apellidos} {matricula.aprendices.nombres}
                      </td>
                      <td className="matriculas__td">
                        {matricula.grupos.cursos.nombre}
                        {matricula.grupos.identificador && ` (${matricula.grupos.identificador})`}
                      </td>
                      <td className="matriculas__td">{matricula.empresas.razon_social}</td>
                      <td className="matriculas__td">
                        <span className={`matriculas__estado matriculas__estado_${matricula.estado}`}>
                          {ESTADOS[matricula.estado]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default RegistroDiario