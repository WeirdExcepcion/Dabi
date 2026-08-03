import { useState, useEffect } from 'react'
import { obtenerFilasGrupo, generarCsv, descargarCsv } from '../../../../lib/csvMintrabajo'
import './PreviaCsv.css'

function PreviaCsv({ grupo, onCerrar }) {
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      try {
        const datos = await obtenerFilasGrupo(grupo.id)
        setFilas(datos)
      } catch (e) {
        setError('No se pudieron cargar los aprendices')
        console.error(e)
      }
      setCargando(false)
    }
    cargar()
  }, [grupo.id])

  function editar(indice, campo, valor) {
    setFilas((anteriores) =>
      anteriores.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f))
    )
  }

  function descargar() {
    const contenido = generarCsv(filas)
    const nombre = `${grupo.curso}${grupo.identificador ? '-' + grupo.identificador : ''}-${grupo.fecha_inicio}.csv`
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '-')
    descargarCsv(contenido, nombre)
  }

  if (cargando) {
    return <p className="previa__mensaje">Preparando datos…</p>
  }

  if (error) {
    return <p className="previa__mensaje">{error}</p>
  }

  const dudosos = filas.filter((f) => f.dudoso).length
  const incompletos = filas.filter((f) => f.faltantes.length > 0).length

  return (
    <div className="previa">
      <div className="previa__encabezado">
        <div>
          <p className="previa__eyebrow">Archivo para MinTrabajo</p>
          <h2 className="previa__titulo">
            {grupo.curso}
            {grupo.identificador && ` (${grupo.identificador})`}
          </h2>
          <p className="previa__detalle">
            {filas.length} {filas.length === 1 ? 'aprendiz' : 'aprendices'}
          </p>
        </div>
        <button
          type="button"
          className="previa__cerrar"
          onClick={onCerrar}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      {(dudosos > 0 || incompletos > 0) && (
        <div className="previa__avisos">
          {incompletos > 0 && (
            <p className="previa__aviso previa__aviso_error">
              <strong>{incompletos}</strong>{' '}
              {incompletos === 1 ? 'aprendiz tiene' : 'aprendices tienen'} datos sin llenar.
              El ministerio puede rechazar el archivo.
            </p>
          )}
          {dudosos > 0 && (
            <p className="previa__aviso">
              <strong>{dudosos}</strong>{' '}
              {dudosos === 1 ? 'nombre o apellido tiene' : 'nombres o apellidos tienen'}{' '}
              más de dos palabras. Revisa que la separación sea correcta —
              puedes corregirla aquí sin que afecte los datos guardados.
            </p>
          )}
        </div>
      )}

      <div className="previa__tabla-wrap">
        <table className="previa__tabla">
          <thead>
            <tr>
              <th className="previa__th">Documento</th>
              <th className="previa__th">1er nombre</th>
              <th className="previa__th">2do nombre</th>
              <th className="previa__th">1er apellido</th>
              <th className="previa__th">2do apellido</th>
              <th className="previa__th">Faltantes</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className={f.dudoso ? 'previa__fila previa__fila_dudosa' : 'previa__fila'}>
                <td className="previa__td previa__td_doc">
                  {f.tipoDocumento} {f.documento}
                </td>
                <td className="previa__td">
                  <input
                    className="previa__input"
                    value={f.primerNombre}
                    onChange={(e) => editar(i, 'primerNombre', e.target.value)}
                  />
                </td>
                <td className="previa__td">
                  <input
                    className="previa__input"
                    value={f.segundoNombre}
                    onChange={(e) => editar(i, 'segundoNombre', e.target.value)}
                  />
                </td>
                <td className="previa__td">
                  <input
                    className="previa__input"
                    value={f.primerApellido}
                    onChange={(e) => editar(i, 'primerApellido', e.target.value)}
                  />
                </td>
                <td className="previa__td">
                  <input
                    className="previa__input"
                    value={f.segundoApellido}
                    onChange={(e) => editar(i, 'segundoApellido', e.target.value)}
                  />
                </td>
                <td className="previa__td previa__td_faltantes">
                  {f.faltantes.length > 0 ? (
                    <span className="previa__faltantes">{f.faltantes.join(', ')}</span>
                  ) : (
                    <span className="previa__completo">Completo</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="previa__nota">
        El archivo saldrá en mayúsculas, separado por punto y coma y sin encabezados,
        como lo pide la plataforma. Las correcciones que hagas aquí solo afectan al
        archivo, no a los datos del aprendiz.
      </p>

      <div className="previa__acciones">
        <button
          type="button"
          className="previa__boton previa__boton_sec"
          onClick={onCerrar}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="previa__boton"
          onClick={descargar}
          disabled={filas.length === 0}
        >
          Descargar CSV
        </button>
      </div>
    </div>
  )
}

export default PreviaCsv