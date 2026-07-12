import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import './FormularioEmpresa.css'

function FormularioEmpresa({ empresa = null, onGuardada, onCancelar }) {
  const esEdicion = empresa !== null

  const [razonSocial, setRazonSocial] = useState(empresa?.razon_social || '')
  const [nit, setNit] = useState(empresa?.nit || '')
  const [representanteLegal, setRepresentanteLegal] = useState(empresa?.representante_legal || '')
  const [correo, setCorreo] = useState(empresa?.correo || '')
  const [telefono, setTelefono] = useState(empresa?.telefono || '')
  const [arlId, setArlId] = useState(empresa?.arl_id || '')

  const [arls, setArls] = useState([])
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    async function cargarArls() {
      const { data } = await supabase
        .from('arls')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre')
      if (data) setArls(data)
    }
    cargarArls()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)

    const datos = {
      razon_social: razonSocial,
      nit: nit || null,
      representante_legal: representanteLegal || null,
      correo: correo || null,
      telefono: telefono || null,
      arl_id: arlId ? Number(arlId) : null,
    }

    let resultado
    if (esEdicion) {
      resultado = await supabase
        .from('empresas')
        .update(datos)
        .eq('id', empresa.id)
        .select('*, arls ( nombre )')
        .single()
    } else {
      resultado = await supabase
        .from('empresas')
        .insert(datos)
        .select('*, arls ( nombre )')
        .single()
    }

    setGuardando(false)

    if (resultado.error) {
      if (resultado.error.code === '23505') {
        setError('Ya existe una empresa con ese NIT')
      } else {
        setError('No se pudo guardar la empresa')
      }
      console.error(resultado.error.message)
      return
    }

    onGuardada(resultado.data)
  }

  return (
    <form className="form-empresa" onSubmit={handleSubmit}>
      <h2 className="form-empresa__titulo">
        {esEdicion ? 'Editar empresa' : 'Nueva empresa'}
      </h2>

      <label className="form-empresa__label" htmlFor="razon_social">
        Razón social *
      </label>
      <input
        id="razon_social"
        type="text"
        className="form-empresa__input"
        value={razonSocial}
        onChange={(e) => setRazonSocial(e.target.value)}
        required
      />

      <label className="form-empresa__label" htmlFor="nit">NIT</label>
      <input
        id="nit"
        type="text"
        className="form-empresa__input"
        value={nit}
        onChange={(e) => setNit(e.target.value)}
        placeholder="900.123.456-7"
      />

      <label className="form-empresa__label" htmlFor="representante_legal">
        Representante legal
      </label>
      <input
        id="representante_legal"
        type="text"
        className="form-empresa__input"
        value={representanteLegal}
        onChange={(e) => setRepresentanteLegal(e.target.value)}
      />

      <label className="form-empresa__label" htmlFor="correo">Correo</label>
      <input
        id="correo"
        type="email"
        className="form-empresa__input"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
      />

      <label className="form-empresa__label" htmlFor="telefono">Teléfono</label>
      <input
        id="telefono"
        type="tel"
        className="form-empresa__input"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
      />

      <label className="form-empresa__label" htmlFor="arl">ARL por defecto</label>
      <select
        id="arl"
        className="form-empresa__input"
        value={arlId}
        onChange={(e) => setArlId(e.target.value)}
      >
        <option value="">Sin asignar</option>
        {arls.map((arl) => (
          <option key={arl.id} value={arl.id}>{arl.nombre}</option>
        ))}
      </select>
      <p className="form-empresa__ayuda">
        Se sugerirá automáticamente al matricular aprendices de esta empresa.
      </p>

      {error && <p className="form-empresa__error">{error}</p>}

      <div className="form-empresa__acciones">
        <button
          type="button"
          className="form-empresa__boton form-empresa__boton_secundario"
          onClick={onCancelar}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="form-empresa__boton"
          disabled={guardando}
        >
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Guardar empresa'}
        </button>
      </div>
    </form>
  )
}

export default FormularioEmpresa