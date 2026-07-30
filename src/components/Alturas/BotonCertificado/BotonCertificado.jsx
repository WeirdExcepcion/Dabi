import { useState } from 'react'
import { descargarPdfCertificado } from '../../../lib/generarPdfCertificado'
import './BotonCertificado.css'

const ROLES_DESCARGA = [
  'admin',
  'gerente-general',
  'director-operaciones',
  'coordinador-procesos',
  'coordinador',
  'supervisor',
  'auxiliar-admin',
]

function limpiarNombre(texto) {
  return texto.replace(/[\\/:*?"<>|]/g, '').trim()
}

function BotonCertificado({ matricula, rol, compacto = false }) {
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')

  const certificado = matricula.certificados?.find((c) => c.estado === 'vigente')
  const puedeDescargar = ROLES_DESCARGA.includes(rol)
  const estaCertificada = matricula.estado === 'certificado'

  if (!certificado || !puedeDescargar || !estaCertificada) return null

  async function descargar(e) {
    e.stopPropagation()
    setError('')
    setGenerando(true)

    try {
      const curso =
        matricula.grupos?.cursos?.nombre || 'Certificado'
      const persona = `${matricula.aprendices.apellidos} ${matricula.aprendices.nombres}`
      const nombreArchivo = `${limpiarNombre(curso)} - ${limpiarNombre(persona)}.pdf`

      await descargarPdfCertificado(certificado.codigo, nombreArchivo)
    } catch (err) {
      setError('No se pudo generar')
      console.error(err)
    }

    setGenerando(false)
  }

  return (
    <>
      <button
        className={compacto ? 'btn-cert btn-cert_compacto' : 'btn-cert'}
        onClick={descargar}
        disabled={generando}
        title={`Descargar certificado ${certificado.codigo}`}
      >
        {generando ? 'Generando…' : 'Descargar'}
      </button>
      {error && <span className="btn-cert__error">{error}</span>}
    </>
  )
}

export default BotonCertificado