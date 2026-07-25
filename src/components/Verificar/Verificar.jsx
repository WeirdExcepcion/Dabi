import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import logoOficial from '../../assets/isotipo-ss-p.png'
import './Verificar.css'

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function fechaLarga(iso) {
  if (!iso) return '—'
  const [anio, mes, dia] = iso.split('-')
  return `${Number(dia)} de ${MESES[Number(mes) - 1]} de ${anio}`
}

function fechaCorta(iso) {
  if (!iso) return '—'
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

function PersonaCard({ titulo, persona }) {
  if (!persona) return null
  return (
    <div className="verif__persona">
      <p className="verif__persona-rol">{titulo}</p>
<p className="verif__persona-nombre">{persona.nombre}</p>
      <div className="verif__persona-datos">
        {persona.documento && <span>C.C. {persona.documento}</span>}
        {persona.titulo && <span>{persona.titulo}</span>}
        {persona.licencia_numero && (
          <span>
            Lic. {persona.licencia_numero}
            {persona.licencia_fecha && ` de ${fechaCorta(persona.licencia_fecha)}`}
          </span>
        )}
      </div>
    </div>
  )
}

function Verificar() {
  const { codigo: codigoUrl } = useParams()

  const [codigo, setCodigo] = useState(codigoUrl || '')
  const [documento, setDocumento] = useState('')
  const [datos, setDatos] = useState(null)
  const [estado, setEstado] = useState(codigoUrl ? 'cargando' : 'inicial')
  const [error, setError] = useState('')

  async function consultar(codigoBuscar, documentoBuscar) {
    setEstado('cargando')
    setError('')
    setDatos(null)

    const { data, error } = await supabase.rpc('verificar_certificado', {
      p_codigo: codigoBuscar.trim(),
    })

    if (error) {
      setEstado('inicial')
      setError('Ocurrió un error al verificar. Intenta de nuevo.')
      console.error(error.message)
      return
    }

    if (!data.encontrado) {
      setEstado('no-encontrado')
      return
    }

    // Si vino por formulario manual, validamos que el documento coincida
    if (documentoBuscar && documentoBuscar.trim() !== data.aprendiz.documento) {
      setEstado('no-coincide')
      return
    }

    setDatos(data)
    setEstado('encontrado')
  }

  useEffect(() => {
    if (codigoUrl) {
      consultar(codigoUrl, null)
    }
  }, [codigoUrl])

  function manejarSubmit(e) {
    e.preventDefault()
    if (!codigo.trim() || !documento.trim()) {
      setError('Ingresa el documento y el código del certificado')
      return
    }
    consultar(codigo, documento)
  }

  return (
    <div className="verif">
      <div className="verif__marco">
        <header className="verif__header">
          <img src={logoOficial} alt="Staff & Services" className="verif__logo" />
          <div>
            <p className="verif__eyebrow">Verificación de certificados</p>
            <p className="verif__marca">Staff and Services SAS</p>
          </div>
        </header>

        {/* Formulario manual: solo si no vino código por URL */}
        {!codigoUrl && estado !== 'encontrado' && (
          <form className="verif__form" onSubmit={manejarSubmit}>
            <p className="verif__instru">
              Ingresa el número de documento del titular y el código del certificado
              para verificar su autenticidad.
            </p>

            <label className="verif__label" htmlFor="v_doc">Número de documento</label>
            <input
              id="v_doc"
              type="text"
              className="verif__input"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="80352240"
            />

            <label className="verif__label" htmlFor="v_cod">Código del certificado</label>
            <input
              id="v_cod"
              type="text"
              className="verif__input"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="SS-2026-XXXXXX"
            />

            {error && <p className="verif__error">{error}</p>}

            <button type="submit" className="verif__boton" disabled={estado === 'cargando'}>
              {estado === 'cargando' ? 'Verificando…' : 'Verificar'}
            </button>
          </form>
        )}

        {estado === 'cargando' && codigoUrl && (
          <p className="verif__mensaje">Verificando certificado…</p>
        )}

        {estado === 'no-encontrado' && (
          <div className="verif__resultado verif__resultado_invalido">
            <p className="verif__resultado-titulo">Certificado no encontrado</p>
            <p className="verif__resultado-texto">
              No existe ningún certificado con ese código. Verifica que esté bien escrito.
            </p>
          </div>
        )}

        {estado === 'no-coincide' && (
          <div className="verif__resultado verif__resultado_invalido">
            <p className="verif__resultado-titulo">Los datos no coinciden</p>
            <p className="verif__resultado-texto">
              El documento ingresado no corresponde al titular de este certificado.
            </p>
          </div>
        )}

        {estado === 'encontrado' && datos && (
          <div className="verif__contenido">
            <div
              className={
                datos.estado === 'vigente'
                  ? 'verif__sello verif__sello_valido'
                  : 'verif__sello verif__sello_revocado'
              }
            >
              {datos.estado === 'vigente' ? '✓ Certificado válido' : '✕ Certificado revocado'}
            </div>

            <div className="verif__bloque">
              <p className="verif__bloque-titulo">Titular</p>
              <p className="verif__nombre">
                {datos.aprendiz.nombres} {datos.aprendiz.apellidos}
              </p>
              <p className="verif__doc">C.C. {datos.aprendiz.documento}</p>
            </div>

            <div className="verif__bloque">
              <p className="verif__bloque-titulo">Formación</p>
              <div className="verif__grid">
                <div><span className="verif__k">Curso</span><span className="verif__v">{datos.curso}</span></div>
                <div><span className="verif__k">Intensidad</span><span className="verif__v">{datos.horas ? `${datos.horas} horas` : '—'}</span></div>
                <div><span className="verif__k">Realizado</span><span className="verif__v">{fechaLarga(datos.fecha_inicio)}{datos.fecha_fin !== datos.fecha_inicio && ` al ${fechaLarga(datos.fecha_fin)}`}</span></div>
                <div><span className="verif__k">Empresa</span><span className="verif__v">{datos.empresa || '—'}</span></div>
                <div><span className="verif__k">Código</span><span className="verif__v verif__codigo">{datos.codigo}</span></div>
              </div>
            </div>

            <div className="verif__bloque">
              <p className="verif__bloque-titulo">Personal certificador</p>
              <PersonaCard titulo="Entrenador" persona={datos.entrenador} />
              <PersonaCard titulo="Supervisor" persona={datos.supervisor} />
            </div>

            <p className="verif__pie">
              Esta verificación confirma la autenticidad del certificado en los registros
              de Staff and Services SAS. Emitido conforme a la Resolución 4272 de 2021.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Verificar