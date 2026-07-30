import { useState, useEffect } from 'react'
import { supabase } from "../../../../lib/supabaseClient";
import { PUEDE_GESTIONAR_RUT, PUEDE_VER_RUT } from '../../../../constants/permisos'
import SubirRut from '../../SubirRut/SubirRut'
import './FormularioEmpresa.css'

function FormularioEmpresa({ empresa = null, rol, onGuardada, onCancelar, onUsarExistente = null }) {
  const esEdicion = empresa !== null

  const [razonSocial, setRazonSocial] = useState(empresa?.razon_social || '')
  const [nit, setNit] = useState(empresa?.nit || '')
  const [representanteLegal, setRepresentanteLegal] = useState(empresa?.representante_legal || '')
  const [correo, setCorreo] = useState(empresa?.correo || '')
  const [telefono, setTelefono] = useState(empresa?.telefono || '')
  const [arlId, setArlId] = useState(empresa?.arl_id || '')
  const [sectorId, setSectorId] = useState(empresa?.sector_id || '')

  const [arls, setArls] = useState([])
  const [sectores, setSectores] = useState([])
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [similares, setSimilares] = useState([])
  const [buscandoSimilares, setBuscandoSimilares] = useState(false)
  const [rutPath, setRutPath] = useState(empresa?.rut_path || null)

  const puedeGestionarRut = PUEDE_GESTIONAR_RUT.includes(rol)
  const puedeVerRut = PUEDE_VER_RUT.includes(rol)

  useEffect(() => {
    async function cargarCatalogos() {
      const [resArls, resSectores] = await Promise.all([
        supabase.from('arls').select('id, nombre').eq('activo', true).order('nombre'),
        supabase.from('sectores').select('id, nombre').eq('activo', true).order('nombre'),
      ])
      if (resArls.data) setArls(resArls.data)
      if (resSectores.data) setSectores(resSectores.data)
    }
    cargarCatalogos()
  }, [])

  useEffect(() => {
    if (esEdicion) return

    const temporizador = setTimeout(async () => {
      const nitLimpio = nit.trim()
      const nombreLimpio = razonSocial.trim()

      if (!nitLimpio && nombreLimpio.length < 4) {
        setSimilares([])
        return
      }

      setBuscandoSimilares(true)

      const { data, error } = await supabase.rpc('buscar_empresas_similares', {
        p_nit: nitLimpio || null,
        p_razon_social: nombreLimpio || null,
      })

      setBuscandoSimilares(false)

      if (error) {
        console.error(error.message)
        return
      }

      setSimilares(data || [])
    }, 500)

    return () => clearTimeout(temporizador)
  }, [nit, razonSocial, esEdicion])

  const bloqueante = similares.find(
    (s) => s.coincidencia === 'nit_exacto' || s.coincidencia === 'nombre_exacto'
  )

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
      sector_id: sectorId ? Number(sectorId) : null,
    }

    let resultado
    if (esEdicion) {
      resultado = await supabase
        .from('empresas')
        .update(datos)
        .eq('id', empresa.id)
        .select('*, arls ( nombre ), sectores ( nombre )')
        .single()
    } else {
      resultado = await supabase
        .from('empresas')
        .insert(datos)
        .select('*, arls ( nombre ), sectores ( nombre )')
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

      <label className="form-empresa__label" htmlFor="sector">Sector</label>
      <select
        id="sector"
        className="form-empresa__input"
        value={sectorId}
        onChange={(e) => setSectorId(e.target.value)}
      >
        <option value="">Sin asignar</option>
        {sectores.map((sector) => (
          <option key={sector.id} value={sector.id}>{sector.nombre}</option>
        ))}
      </select>
      <p className="form-empresa__ayuda">
        También se sugerirá al matricular.
      </p>

        {esEdicion && puedeVerRut && (
        <>
          <label className="form-empresa__label">RUT</label>
          {puedeGestionarRut ? (
            <SubirRut
              empresaId={empresa.id}
              rutPath={rutPath}
              onSubido={(ruta) => setRutPath(ruta)}
            />
          ) : (
            <SubirRut
              empresaId={empresa.id}
              rutPath={rutPath}
              onSubido={() => {}}
              soloLectura
            />
          )}
        </>
      )}
      
      {!esEdicion && similares.length > 0 && (
        <div className={bloqueante ? 'form-empresa__dup form-empresa__dup_bloqueo' : 'form-empresa__dup'}>
          <p className="form-empresa__dup-titulo">
            {bloqueante
              ? 'Esta empresa ya está registrada'
              : 'Encontramos empresas parecidas'}
          </p>

          {bloqueante && (
            <p className="form-empresa__dup-texto">
              No puedes crearla de nuevo. Usa la que ya existe.
            </p>
          )}

          <div className="form-empresa__dup-lista">
            {similares.map((s) => (
              <div key={s.id} className="form-empresa__dup-item">
                <div>
                  <p className="form-empresa__dup-nombre">
                    {s.razon_social}
                    {!s.activo && <span className="form-empresa__dup-inactiva"> · inactiva</span>}
                  </p>
                  <p className="form-empresa__dup-nit">
                    {s.nit || 'sin NIT'}
                    {s.coincidencia === 'nit_exacto' && ' · mismo NIT'}
                    {s.coincidencia === 'nombre_exacto' && ' · mismo nombre'}
                    {s.coincidencia === 'nit_parecido' && ' · NIT muy parecido'}
                  </p>
                </div>
                {onUsarExistente && (
                  <button
                    type="button"
                    className="form-empresa__dup-usar"
                    onClick={() => onUsarExistente(s.id)}
                  >
                    Usar esta
                  </button>
                )}
              </div>
            ))}
          </div>

          {!bloqueante && (
            <p className="form-empresa__dup-nota">
              Si de verdad es una empresa distinta, puedes continuar.
            </p>
          )}
        </div>
      )}

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
          disabled={guardando || Boolean(bloqueante)}
        >
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Guardar empresa'}
        </button>
      </div>
    </form>
  )
}

export default FormularioEmpresa