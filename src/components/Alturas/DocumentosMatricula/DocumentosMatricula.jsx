import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import './DocumentosMatricula.css'
import { comprimirImagen } from '../../../lib/comprimirImagen'

const MAX_BYTES = 5 * 1024 * 1024
const TIPOS_ACEPTADOS = ['application/pdf', 'image/png', 'image/jpeg']

const DOCS_MATRICULA = [
  { tipo: 'arl', etiqueta: 'ARL' },
  { tipo: 'eps', etiqueta: 'EPS' },
  { tipo: 'examen_medico', etiqueta: 'Examen médico' },
]

function extensionDe(archivo) {
  if (archivo.type === 'application/pdf') return 'pdf'
  if (archivo.type === 'image/png') return 'png'
  return 'jpg'
}

function DocumentosMatricula({ matriculaId, aprendizId, requiereCertificadoPrevio, soloLectura = false }) {
  const [docsMatricula, setDocsMatricula] = useState({})
  const [docsAprendiz, setDocsAprendiz] = useState({})
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(null)
  const [error, setError] = useState('')

  async function cargar() {
    setCargando(true)

    const consultas = [
      aprendizId
        ? supabase
            .from('documentos_aprendiz')
            .select('tipo, archivo_path, matricula_respaldo_id, subido_en')
            .eq('aprendiz_id', aprendizId)
        : Promise.resolve({ data: [] }),
      matriculaId
        ? supabase
            .from('documentos_matricula')
            .select('tipo, archivo_path, subido_en')
            .eq('matricula_id', matriculaId)
        : Promise.resolve({ data: [] }),
    ]

    const [resAprendiz, resMatricula] = await Promise.all(consultas)

    const mapaAprendiz = {}
    ;(resAprendiz.data || []).forEach((d) => { mapaAprendiz[d.tipo] = d })
    setDocsAprendiz(mapaAprendiz)

    const mapaMatricula = {}
    ;(resMatricula.data || []).forEach((d) => { mapaMatricula[d.tipo] = d })
    setDocsMatricula(mapaMatricula)

    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [matriculaId, aprendizId])

  function validar(archivo) {
    if (!TIPOS_ACEPTADOS.includes(archivo.type)) {
      return 'Solo se aceptan archivos PDF, PNG o JPG'
    }
    if (archivo.size > MAX_BYTES) {
      return 'El archivo no debe pesar más de 5 MB'
    }
    return null
  }

  async function subirDeMatricula(tipo, archivo) {
    const problema = validar(archivo)
    if (problema) {
      setError(problema)
      return
    }

    setError('')
    setSubiendo(tipo)

    const comprimido = await comprimirImagen(archivo)
    const ruta = `matriculas/${matriculaId}/${tipo}.${extensionDe(comprimido)}`

    const { error: errorSubida } = await supabase.storage
      .from('documentos')
      .upload(ruta, comprimido, { upsert: true, contentType: comprimido.type })

    if (errorSubida) {
      setSubiendo(null)
      setError('No se pudo subir el archivo')
      console.error(errorSubida.message)
      return
    }

    const { data: sesion } = await supabase.auth.getUser()

    const { error: errorRegistro } = await supabase
      .from('documentos_matricula')
      .upsert(
        {
          matricula_id: matriculaId,
          tipo,
          archivo_path: ruta,
          subido_por: sesion?.user?.id,
          subido_en: new Date().toISOString(),
        },
        { onConflict: 'matricula_id,tipo' }
      )

    setSubiendo(null)

    if (errorRegistro) {
      setError('El archivo se subió pero no se registró')
      console.error(errorRegistro.message)
      return
    }

    cargar()
  }

  async function subirDeAprendiz(tipo, archivo) {
    const problema = validar(archivo)
    if (problema) {
      setError(problema)
      return
    }

    setError('')
    setSubiendo(tipo)

    const comprimido = await comprimirImagen(archivo)
    const ruta = `aprendices/${aprendizId}/${tipo}.${extensionDe(comprimido)}`

    const { error: errorSubida } = await supabase.storage
      .from('documentos')
      .upload(ruta, comprimido, { upsert: true, contentType: comprimido.type })

    if (errorSubida) {
      setSubiendo(null)
      setError('No se pudo subir el archivo')
      console.error(errorSubida.message)
      return
    }

    const { data: sesion } = await supabase.auth.getUser()

    const { error: errorRegistro } = await supabase
      .from('documentos_aprendiz')
      .upsert(
        {
          aprendiz_id: aprendizId,
          tipo,
          archivo_path: ruta,
          subido_por: sesion?.user?.id,
          subido_en: new Date().toISOString(),
        },
        { onConflict: 'aprendiz_id,tipo' }
      )

    setSubiendo(null)

    if (errorRegistro) {
      setError('El archivo se subió pero no se registró')
      console.error(errorRegistro.message)
      return
    }

    cargar()
  }

  async function verArchivo(ruta) {
    setError('')

    const { data, error } = await supabase.storage
      .from('documentos')
      .createSignedUrl(ruta, 120)

    if (error) {
      setError('No se pudo abrir el archivo')
      console.error(error.message)
      return
    }

    window.open(data.signedUrl, '_blank')
  }

  function Fila({ tipo, etiqueta, doc, alSubir, deshabilitado, nota }) {
    const tiene = Boolean(doc?.archivo_path)
    const ocupado = subiendo === tipo

    return (
      <div className={deshabilitado ? 'doc-fila doc-fila_off' : 'doc-fila'}>
        <div className="doc-fila__info">
          <span className="doc-fila__etiqueta">{etiqueta}</span>
          {tiene ? (
            <span className="doc-fila__estado doc-fila__estado_ok">Cargado</span>
          ) : (
            <span className="doc-fila__estado">Sin cargar</span>
          )}
          {nota && <span className="doc-fila__nota">{nota}</span>}
        </div>

        <div className="doc-fila__acciones">
          {tiene && (
            <button
              type="button"
              className="doc-fila__ver"
              onClick={() => verArchivo(doc.archivo_path)}
            >
              Ver
            </button>
          )}
          {!deshabilitado && !soloLectura && (
            <label className="doc-fila__subir">
              {ocupado ? 'Subiendo…' : tiene ? 'Reemplazar' : 'Subir'}
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                onChange={(e) => {
                  const archivo = e.target.files?.[0]
                  e.target.value = ''
                  if (archivo) alSubir(tipo, archivo)
                }}
                disabled={ocupado}
                hidden
              />
            </label>
          )}
        </div>
      </div>
    )
  }

  if (cargando) {
    return <p className="docs__mensaje">Cargando documentos…</p>
  }

  return (
    <div className="docs">
      <div className="docs__bloque">
        <p className="docs__bloque-titulo">Del aprendiz</p>
        <p className="docs__bloque-nota">
          {soloLectura
            ? 'Documentos cargados en su ficha.'
            : 'Se guardan en su ficha y sirven para todos sus cursos.'}
        </p>

        <Fila
          tipo="cedula"
          etiqueta="Cédula"
          doc={docsAprendiz.cedula}
          alSubir={subirDeAprendiz}
          deshabilitado={!aprendizId}
        />

        {requiereCertificadoPrevio && (
          <Fila
            tipo="certificado_previo"
            etiqueta="Certificado previo"
            doc={docsAprendiz.certificado_previo}
            alSubir={subirDeAprendiz}
            deshabilitado={!aprendizId}
            nota="Avanzado o trabajador autorizado"
          />
        )}
      </div>

      <div className="docs__bloque">
        <p className="docs__bloque-titulo">De este curso</p>
        <p className="docs__bloque-nota">
          Corresponden solo a esta matrícula. Se cargan de nuevo en cada curso.
        </p>

        {!matriculaId && !soloLectura && (
          <p className="docs__aviso">
            Guarda la matrícula primero para poder subir estos documentos.
          </p>
        )}

        {DOCS_MATRICULA.map((d) => (
          <Fila
            key={d.tipo}
            tipo={d.tipo}
            etiqueta={d.etiqueta}
            doc={docsMatricula[d.tipo]}
            alSubir={subirDeMatricula}
            deshabilitado={!matriculaId}
          />
        ))}
      </div>

      {error && <p className="docs__error">{error}</p>}
    </div>
  )
}

export default DocumentosMatricula