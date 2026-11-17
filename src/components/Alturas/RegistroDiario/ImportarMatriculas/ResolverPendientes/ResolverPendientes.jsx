import SelectorBuscable from '../../../../compartidos/SelectorBuscable/SelectorBuscable'
import './ResolverPendientes.css'

const SECCIONES = [
  { titulo: 'Cursos', tipos: ['curso'] },
  { titulo: 'Grupos', tipos: ['grupo'] },
  { titulo: 'Empresas', tipos: ['empresa'] },
  {
    titulo: 'Otros datos',
    nota: 'Son opcionales: lo que quede vacío aparece después en Faltantes.',
    tipos: ['nivel_educativo', 'arl', 'eps', 'area', 'cargo', 'sector'],
  },
]

const MAXIMO_FILAS_VISIBLES = 6

function resumirFilas(filas) {
  const primeras = filas.slice(0, MAXIMO_FILAS_VISIBLES).join(', ')
  const resto = filas.length - MAXIMO_FILAS_VISIBLES
  return resto > 0 ? `${primeras} y ${resto} más` : primeras
}

function textoCrear(p) {
  if (p.tipo === 'grupo') return 'Crear el grupo'
  if (p.tipo === 'empresa') return 'Crear la empresa'
  return `Crear "${p.texto}"`
}

function ResolverPendientes({ pendientes, onDecidir }) {
  return SECCIONES.map((seccion) => {
    const items = pendientes.filter((p) => seccion.tipos.includes(p.tipo))
    if (items.length === 0) return null

    return (
      <section key={seccion.titulo} className="resolver__seccion">
        <h3 className="resolver__titulo">{seccion.titulo}</h3>
        {seccion.nota && <p className="resolver__nota-seccion">{seccion.nota}</p>}
        <div className="resolver__lista">
          {items.map((p) => (
            // El tipo solo se repite donde la sección mezcla varios.
            <Pendiente key={p.llave} p={p} mostrarTipo={seccion.tipos.length > 1} onDecidir={onDecidir} />
          ))}
        </div>
      </section>
    )
  })
}

function Pendiente({ p, mostrarTipo, onDecidir }) {
  const elegida = p.elegida
  const decidir = (decision) => onDecidir(p.llave, decision)

  const acciones = [
    p.opciones.length > 0 && { id: 'existente', etiqueta: 'Usar uno existente' },
    p.puedeCrear && { id: 'crear', etiqueta: textoCrear(p) },
    p.puedeVaciar && { id: 'vacio', etiqueta: 'Dejar vacío' },
  ].filter(Boolean)

  function elegirAccion(accion) {
    if (accion === elegida?.accion) return

    if (accion === 'existente') {
      decidir({ accion, id: p.sugerencias[0]?.id ?? null })
    } else if (accion === 'crear' && p.tipo === 'empresa') {
      decidir({ accion, nombre: p.nombreSugerido ?? '' })
    } else {
      decidir({ accion })
    }
  }

  return (
    <div className={p.decision ? 'resolver__item' : 'resolver__item resolver__item_falta'}>
      <div className="resolver__cabeza">
        <div>
          {mostrarTipo && <span className="resolver__tipo">{p.etiqueta}</span>}
          <p className="resolver__texto">{p.texto}</p>
          {p.nit && p.texto !== `NIT ${p.nit}` && <p className="resolver__nit">NIT {p.nit}</p>}
          {p.nota && <p className="resolver__nota">{p.nota}</p>}
        </div>
        <span className="resolver__filas">
          {p.filas.length === 1 ? 'Fila' : 'Filas'} {resumirFilas(p.filas)}
        </span>
      </div>

      {acciones.length === 0 ? (
        <p className="resolver__sin-salida">
          Tu rol no permite crearlo y no hay uno existente que elegir: estas filas no se
          pueden cargar. Pídele a coordinación que lo cree y vuelve a subir el archivo.
        </p>
      ) : (
        <div className="resolver__acciones" role="radiogroup" aria-label={`Qué hacer con ${p.texto}`}>
          {acciones.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={elegida?.accion === a.id}
              className={
                elegida?.accion === a.id
                  ? 'resolver__accion resolver__accion_activa'
                  : 'resolver__accion'
              }
              onClick={() => elegirAccion(a.id)}
            >
              {a.etiqueta}
            </button>
          ))}
        </div>
      )}

      {elegida?.accion === 'existente' && (
        <div className="resolver__detalle">
          {p.sugerencias.length > 0 && (
            <div className="resolver__sugerencias">
              <span className="resolver__sugerencias-titulo">Parecidos:</span>
              {p.sugerencias.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={
                    elegida.id === s.id
                      ? 'resolver__sugerencia resolver__sugerencia_activa'
                      : 'resolver__sugerencia'
                  }
                  onClick={() => decidir({ accion: 'existente', id: s.id })}
                >
                  {s.nombre}
                </button>
              ))}
            </div>
          )}
          <SelectorBuscable
            id={`resolver_${p.llave}`}
            opciones={p.opciones}
            valor={elegida.id ? String(elegida.id) : ''}
            onCambio={(id) => decidir({ accion: 'existente', id: id ? Number(id) : null })}
            placeholder="Buscar…"
            vacioTexto="Elige uno…"
          />
        </div>
      )}

      {elegida?.accion === 'crear' && p.tipo === 'empresa' && (
        <div className="resolver__detalle">
          <label className="resolver__label" htmlFor={`resolver_${p.llave}_nombre`}>
            Razón social
          </label>
          <input
            id={`resolver_${p.llave}_nombre`}
            type="text"
            className="resolver__input"
            value={elegida.nombre ?? ''}
            onChange={(e) => decidir({ accion: 'crear', nombre: e.target.value })}
          />
          <p className="resolver__nota">
            Se crea con el NIT {p.nit}. Lo demás se completa luego en Empresas.
          </p>
        </div>
      )}

      {elegida?.accion === 'crear' && p.tipo === 'grupo' && (
        <p className="resolver__nota resolver__nota_detalle">
          Se crea sin entrenador ni supervisor: hay que asignarlos antes de certificar.
        </p>
      )}
    </div>
  )
}

export default ResolverPendientes
